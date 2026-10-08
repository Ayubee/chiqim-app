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

/**
 * Mock sign-in response for local testing
 */
export async function mockSignIn(
  email: string,
  _password: string
): Promise<{
  session: {
    access_token: string;
    refresh_token: string;
    user_id: string;
    email: string;
    expires_at: number;
  };
  profile: {
    id: string;
    full_name: string;
    store_id: string | null;
    role: 'seller' | 'admin';
    is_active: boolean;
    assignment_version: number;
  };
  store: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
}> {
  if (!__DEV__) {
    throw new Error('Mock API is disabled in production');
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  const userId = '11111111-1111-4111-8111-111111111111';
  const storeId = '22222222-2222-4222-8222-222222222222';

  return {
    session: {
      access_token: 'mock-access-token-jwt',
      refresh_token: 'mock-refresh-token',
      user_id: userId,
      email: email || 'sotuvchi@magazin.uz',
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    },
    profile: {
      id: userId,
      full_name: 'Ayubxon Sotuvchi',
      store_id: storeId,
      role: 'seller',
      is_active: true,
      assignment_version: 1,
    },
    store: {
      id: storeId,
      name: 'Chorsu Savdo Markazi (Do‘kon #12)',
      is_active: true,
    },
  };
}
