import { mockSyncExpenses, isMockEnabled } from './mockApiService';
import {
  getPendingOutboxOperations,
  markExpenseSynced,
  markExpenseFailed,
  incrementOutboxRetry,
  setSyncMeta,
  getSyncMeta,
} from '@/db/expenses';
import {
  MAX_BATCH_SIZE,
  SYNC_TIMEOUT_MS,
  SYNC_BACKOFF_BASE_MS,
  SYNC_BACKOFF_MAX_MS,
  SYNC_MAX_RETRIES,
} from '@/constants';
import { SyncRequest, SyncResponse } from '@/types';

let syncInProgress = false;
let currentSellerId: string | null = null;
let currentSessionToken: string | null = null;

export function setSyncContext(sellerId: string, accessToken: string): void {
  currentSellerId = sellerId;
  currentSessionToken = accessToken;
}

export function clearSyncContext(): void {
  currentSellerId = null;
  currentSessionToken = null;
}

function calculateBackoff(retryCount: number): number {
  const backoff = SYNC_BACKOFF_BASE_MS * Math.pow(2, retryCount);
  return Math.min(backoff, SYNC_BACKOFF_MAX_MS);
}

// Keep the variable used to avoid lint warning
void calculateBackoff;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function callSyncAPI(
  request: SyncRequest,
  storeId: string,
  assignmentVersion: number,
  accessToken: string
): Promise<SyncResponse> {
  if (isMockEnabled()) {
    return mockSyncExpenses(request);
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase konfiguratsiya topilmadi');
  }

  const url = `${supabaseUrl}/functions/v1/sync-expenses`;
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseKey,
        'Content-Type': 'application/json',
        'X-Store-Id': storeId,
        'X-Store-Assignment-Version': String(assignmentVersion),
      },
      body: JSON.stringify(request),
    },
    SYNC_TIMEOUT_MS
  );

  if (response.status === 401) {
    throw new SyncAuthError('Token muddati tugagan');
  }
  if (response.status === 403) {
    throw new SyncAuthError("Ruxsat yo'q");
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new SyncNetworkError(`Server xatosi ${response.status}: ${text}`);
  }

  return response.json() as Promise<SyncResponse>;
}

export class SyncAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncAuthError';
  }
}

export class SyncNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncNetworkError';
  }
}

type SyncEventCallback = (event: SyncEvent) => void;

export type SyncEvent =
  | { type: 'start' }
  | { type: 'progress'; synced: number; total: number }
  | { type: 'complete'; lastSyncTime: string }
  | { type: 'auth_error' }
  | { type: 'network_error'; message: string }
  | { type: 'partial_failure'; failed: number }
  | { type: 'idle' };

const listeners = new Set<SyncEventCallback>();

export function addSyncListener(cb: SyncEventCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(event: SyncEvent): void {
  for (const cb of listeners) cb(event);
}

export async function runSync(onAuthError?: () => void): Promise<void> {
  if (syncInProgress) return;
  if (!currentSellerId || !currentSessionToken) return;

  const sellerId = currentSellerId;
  const token = currentSessionToken;

  syncInProgress = true;
  emit({ type: 'start' });

  try {
    const allPending = await getPendingOutboxOperations(sellerId);
    if (allPending.length === 0) {
      emit({ type: 'idle' });
      return;
    }

    // Group by store_id + assignment_version (only same-context in one batch)
    const groups = new Map<string, typeof allPending>();
    for (const op of allPending) {
      const key = `${op.store_id}:${op.assignment_version}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(op);
    }

    let totalSynced = 0;
    let totalFailed = 0;
    let lastSyncTime: string | null = null;

    for (const [, ops] of groups) {
      // Filter out ops that exceeded max retries
      const eligibleOps = ops.filter((op) => op.retry_count < SYNC_MAX_RETRIES);
      // Mark exhausted as failed
      for (const op of ops.filter((o) => o.retry_count >= SYNC_MAX_RETRIES)) {
        await markExpenseFailed(
          op.expense_id,
          op.operation_id,
          'MAX_RETRIES_EXCEEDED',
          `${SYNC_MAX_RETRIES} marta urinib bo'ldi`
        );
        totalFailed++;
      }
      if (eligibleOps.length === 0) continue;

      const storeId = ops[0].store_id;
      const assignmentVersion = ops[0].assignment_version;
      const deviceId = (await getSyncMeta('device_id')) ?? '';

      // Process in batches of MAX_BATCH_SIZE
      for (let i = 0; i < eligibleOps.length; i += MAX_BATCH_SIZE) {
        const batch = eligibleOps.slice(i, i + MAX_BATCH_SIZE);
        const request: SyncRequest = {
          device_id: deviceId,
          operations: batch.map((op) => ({
            operation_id: op.operation_id,
            type: 'create',
            expense: {
              id: op.expense.id,
              amount_uzs: op.expense.amount_uzs,
              note: op.expense.note,
              expense_date: op.expense.expense_date,
              occurred_at: op.expense.occurred_at,
            },
          })),
        };

        let response: SyncResponse | null = null;
        try {
          response = await callSyncAPI(request, storeId, assignmentVersion, token);
        } catch (err) {
          if (err instanceof SyncAuthError) {
            emit({ type: 'auth_error' });
            onAuthError?.();
            return;
          }
          // Network error — increment retry, do not mark failed
          for (const op of batch) {
            await incrementOutboxRetry(op.operation_id, new Date().toISOString());
          }
          emit({ type: 'network_error', message: (err as Error).message });
          continue;
        }

        // Process results
        let batchAllAccepted = true;
        for (const result of response.results) {
          const op = batch.find((o) => o.operation_id === result.operation_id);
          if (!op) continue;

          if (result.status === 'accepted' || result.status === 'duplicate') {
            await markExpenseSynced(op.expense_id, op.operation_id, result.version!);
            totalSynced++;
            lastSyncTime = response.server_time;
          } else if (result.status === 'rejected') {
            await markExpenseFailed(
              op.expense_id,
              op.operation_id,
              result.error_code ?? 'REJECTED',
              `Server rad etdi: ${result.error_code}`
            );
            totalFailed++;
            batchAllAccepted = false;
          }
        }

        // Update device_sync last_synced_at only if all accepted/duplicate
        if (batchAllAccepted && lastSyncTime) {
          await setSyncMeta('last_synced_at', lastSyncTime);
        }

        emit({ type: 'progress', synced: totalSynced, total: allPending.length });
      }
    }

    if (totalFailed > 0) {
      emit({ type: 'partial_failure', failed: totalFailed });
    } else if (lastSyncTime) {
      emit({ type: 'complete', lastSyncTime });
    } else {
      emit({ type: 'idle' });
    }
  } finally {
    syncInProgress = false;
  }
}
