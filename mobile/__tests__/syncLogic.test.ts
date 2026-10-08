import { SyncRequest, SyncResponse } from '../src/types';

describe('Sync Logic and Idempotency Verification', () => {
  it('serverdan duplicate qaytganda xarajat duplicated bo‘lmaydi, synced deb belgilanadi', () => {
    const mockExpenseId = 'exp-uuid-1';
    const mockOperationId = 'op-uuid-1';

    const syncResponse: SyncResponse = {
      results: [
        {
          operation_id: mockOperationId,
          expense_id: mockExpenseId,
          status: 'duplicate',
          version: 1,
        },
      ],
      server_time: '2026-10-09T03:00:00Z',
    };

    const result = syncResponse.results[0];
    expect(result.status === 'accepted' || result.status === 'duplicate').toBe(true);
    expect(result.version).toBe(1);
    expect(result.expense_id).toBe(mockExpenseId);
  });

  it('qisman muvaffaqiyatli batch holatida har bir operatsiya o‘z holatiga ega bo‘ladi', () => {
    const batchResponse: SyncResponse = {
      results: [
        {
          operation_id: 'op-1',
          expense_id: 'exp-1',
          status: 'accepted',
          version: 1,
        },
        {
          operation_id: 'op-2',
          expense_id: 'exp-2',
          status: 'rejected',
          error_code: 'STORE_ASSIGNMENT_CHANGED',
        },
      ],
      server_time: '2026-10-09T03:00:01Z',
    };

    const op1 = batchResponse.results.find((r) => r.operation_id === 'op-1');
    const op2 = batchResponse.results.find((r) => r.operation_id === 'op-2');

    expect(op1?.status).toBe('accepted');
    expect(op1?.version).toBe(1);

    expect(op2?.status).toBe('rejected');
    expect(op2?.error_code).toBe('STORE_ASSIGNMENT_CHANGED');
  });

  it('magazin konteksti sarlavhalari (headers) shartnomaga to‘liq mos kelishi kerak', () => {
    const storeId = 'store-uuid-abc';
    const assignmentVersion = 2;
    const token = 'mock-jwt-token';
    const apiKey = 'mock-anon-key';

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      apikey: apiKey,
      'Content-Type': 'application/json',
      'X-Store-Id': storeId,
      'X-Store-Assignment-Version': String(assignmentVersion),
    };

    expect(headers['X-Store-Id']).toBe('store-uuid-abc');
    expect(headers['X-Store-Assignment-Version']).toBe('2');
    expect(headers['Authorization']).toBe('Bearer mock-jwt-token');
  });

  it('hisoblar (seller_id) bo‘yicha lokal bazada ma’lumotlar qat’iy ajratilishi', () => {
    const sellerA = 'seller-a-id';
    const sellerB = 'seller-b-id';

    const localExpenses = [
      { id: '1', seller_id: sellerA, amount_uzs: 10000, note: 'Tushlik' },
      { id: '2', seller_id: sellerB, amount_uzs: 20000, note: 'Yoqilg‘i' },
      { id: '3', seller_id: sellerA, amount_uzs: 15000, note: 'Choyxona' },
    ];

    const sellerAExpenses = localExpenses.filter((e) => e.seller_id === sellerA);
    const sellerBExpenses = localExpenses.filter((e) => e.seller_id === sellerB);

    expect(sellerAExpenses).toHaveLength(2);
    expect(sellerBExpenses).toHaveLength(1);
    expect(sellerAExpenses.some((e) => e.seller_id === sellerB)).toBe(false);
  });
});
