import { SyncRequest, SyncResponse } from '@/types';

/**
 * Mock implementation of sync-expenses Edge Function.
 * Only active in __DEV__ mode AND when EXPO_PUBLIC_USE_MOCK=true.
 * Never used in production builds.
 */
export async function mockSyncExpenses(request: SyncRequest): Promise<SyncResponse> {
  if (!__DEV__) {
    throw new Error('Mock API is disabled in production');
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const results = request.operations.map((op) => ({
    operation_id: op.operation_id,
    expense_id: op.expense.id,
    status: 'accepted' as const,
    version: 1,
  }));

  return {
    results,
    server_time: new Date().toISOString(),
  };
}

/**
 * Mock sign-in response
 */
export function isMockEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === 'true';
}
