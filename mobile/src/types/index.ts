export type UserRole = 'admin' | 'seller';

export interface Profile {
  id: string;
  full_name: string;
  store_id: string | null;
  role: UserRole;
  is_active: boolean;
  assignment_version: number;
}

export interface Store {
  id: string;
  name: string;
  is_active: boolean;
}

export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface LocalExpense {
  id: string; // UUID generated on device
  seller_id: string;
  store_id: string;
  assignment_version: number;
  amount_uzs: number;
  note: string;
  expense_date: string; // YYYY-MM-DD
  occurred_at: string; // ISO with timezone
  sync_status: SyncStatus;
  sync_error?: string | null;
  sync_error_code?: string | null;
  version?: number | null;
  deleted_at?: string | null;
  created_at_local: string;
}

export interface OutboxOperation {
  operation_id: string; // stable UUID
  expense_id: string;
  store_id: string;
  assignment_version: number;
  retry_count: number;
  last_attempted_at?: string | null;
  created_at: string;
}

export type SyncResultStatus = 'accepted' | 'duplicate' | 'rejected';

export interface SyncOperationResult {
  operation_id: string;
  expense_id: string;
  status: SyncResultStatus;
  version?: number;
  error_code?: string;
}

export interface SyncResponse {
  results: SyncOperationResult[];
  server_time: string;
}

export interface SyncRequest {
  device_id: string;
  operations: Array<{
    operation_id: string;
    type: 'create';
    expense: {
      id: string;
      amount_uzs: number;
      note: string;
      expense_date: string;
      occurred_at: string;
    };
  }>;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
  expires_at: number;
}

export interface AppState {
  session: AuthSession | null;
  profile: Profile | null;
  store: Store | null;
  isLoading: boolean;
  error: string | null;
}
