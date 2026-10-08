import { getDatabase } from './database';
import { LocalExpense, OutboxOperation, SyncStatus } from '@/types';

export async function insertExpenseWithOutbox(
  expense: LocalExpense,
  operation: OutboxOperation
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO expenses
        (id, seller_id, store_id, assignment_version, amount_uzs, note, expense_date,
         occurred_at, sync_status, created_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        expense.id,
        expense.seller_id,
        expense.store_id,
        expense.assignment_version,
        expense.amount_uzs,
        expense.note,
        expense.expense_date,
        expense.occurred_at,
        expense.created_at_local,
      ]
    );
    await db.runAsync(
      `INSERT INTO outbox
        (operation_id, expense_id, store_id, assignment_version, retry_count, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [
        operation.operation_id,
        operation.expense_id,
        operation.store_id,
        operation.assignment_version,
        operation.created_at,
      ]
    );
  });
}

export async function getExpensesByDate(
  sellerId: string,
  date: string
): Promise<LocalExpense[]> {
  const db = await getDatabase();
  return db.getAllAsync<LocalExpense>(
    `SELECT * FROM expenses
     WHERE seller_id = ? AND expense_date = ? AND deleted_at IS NULL
     ORDER BY occurred_at ASC`,
    [sellerId, date]
  );
}

export async function getExpensesForMonth(
  sellerId: string,
  yearMonth: string // YYYY-MM
): Promise<LocalExpense[]> {
  const db = await getDatabase();
  return db.getAllAsync<LocalExpense>(
    `SELECT * FROM expenses
     WHERE seller_id = ? AND expense_date LIKE ? AND deleted_at IS NULL
     ORDER BY expense_date ASC, occurred_at ASC`,
    [sellerId, yearMonth + '%']
  );
}

export async function getDailyTotals(
  sellerId: string,
  yearMonth: string
): Promise<Record<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ expense_date: string; total: number }>(
    `SELECT expense_date, SUM(amount_uzs) as total
     FROM expenses
     WHERE seller_id = ? AND expense_date LIKE ? AND deleted_at IS NULL
     GROUP BY expense_date`,
    [sellerId, yearMonth + '%']
  );
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.expense_date] = row.total;
  }
  return result;
}

export async function getTodayTotal(sellerId: string, date: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_uzs), 0) as total
     FROM expenses
     WHERE seller_id = ? AND expense_date = ? AND deleted_at IS NULL`,
    [sellerId, date]
  );
  return row?.total ?? 0;
}

export async function getPendingOutboxOperations(
  sellerId: string
): Promise<Array<OutboxOperation & { expense: LocalExpense }>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    o_operation_id: string;
    o_expense_id: string;
    o_store_id: string;
    o_assignment_version: number;
    o_retry_count: number;
    o_last_attempted_at: string | null;
    o_created_at: string;
    id: string;
    seller_id: string;
    store_id: string;
    assignment_version: number;
    amount_uzs: number;
    note: string;
    expense_date: string;
    occurred_at: string;
    sync_status: string;
    sync_error: string | null;
    sync_error_code: string | null;
    version: number | null;
    deleted_at: string | null;
    created_at_local: string;
  }>(
    `SELECT
       o.operation_id as o_operation_id,
       o.expense_id as o_expense_id,
       o.store_id as o_store_id,
       o.assignment_version as o_assignment_version,
       o.retry_count as o_retry_count,
       o.last_attempted_at as o_last_attempted_at,
       o.created_at as o_created_at,
       e.*
     FROM outbox o
     JOIN expenses e ON e.id = o.expense_id
     WHERE e.seller_id = ? AND e.sync_status = 'pending'
     ORDER BY o.created_at ASC`,
    [sellerId]
  );
  return rows.map((r) => ({
    operation_id: r.o_operation_id,
    expense_id: r.o_expense_id,
    store_id: r.o_store_id,
    assignment_version: r.o_assignment_version,
    retry_count: r.o_retry_count,
    last_attempted_at: r.o_last_attempted_at,
    created_at: r.o_created_at,
    expense: {
      id: r.id,
      seller_id: r.seller_id,
      store_id: r.store_id,
      assignment_version: r.assignment_version,
      amount_uzs: r.amount_uzs,
      note: r.note,
      expense_date: r.expense_date,
      occurred_at: r.occurred_at,
      sync_status: r.sync_status as SyncStatus,
      sync_error: r.sync_error,
      sync_error_code: r.sync_error_code,
      version: r.version,
      deleted_at: r.deleted_at,
      created_at_local: r.created_at_local,
    },
  }));
}

export async function markExpenseSynced(
  expenseId: string,
  operationId: string,
  version: number
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE expenses SET sync_status = 'synced', version = ?, sync_error = NULL, sync_error_code = NULL WHERE id = ?`,
      [version, expenseId]
    );
    await db.runAsync(`DELETE FROM outbox WHERE operation_id = ?`, [operationId]);
  });
}

export async function markExpenseFailed(
  expenseId: string,
  operationId: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE expenses SET sync_status = 'failed', sync_error = ?, sync_error_code = ? WHERE id = ?`,
      [errorMessage, errorCode, expenseId]
    );
    await db.runAsync(`DELETE FROM outbox WHERE operation_id = ?`, [operationId]);
  });
}

export async function incrementOutboxRetry(
  operationId: string,
  attemptedAt: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE outbox SET retry_count = retry_count + 1, last_attempted_at = ? WHERE operation_id = ?`,
    [attemptedAt, operationId]
  );
}

export async function getPendingCount(sellerId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM expenses WHERE seller_id = ? AND sync_status = 'pending'`,
    [sellerId]
  );
  return row?.count ?? 0;
}

export async function getSyncMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = ?`,
    [key]
  );
  return row?.value ?? null;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)`,
    [key, value]
  );
}

export async function updateExpensesFromServer(
  expenses: Array<{
    id: string;
    amount_uzs: number;
    note: string;
    expense_date: string;
    occurred_at: string;
    version: number;
    deleted_at: string | null;
  }>,
  sellerId: string
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const e of expenses) {
      // Update if version is higher (admin edited)
      await db.runAsync(
        `UPDATE expenses
         SET amount_uzs = ?, note = ?, expense_date = ?, occurred_at = ?,
             version = ?, deleted_at = ?, sync_status = 'synced'
         WHERE id = ? AND seller_id = ? AND (version IS NULL OR version < ?)`,
        [e.amount_uzs, e.note, e.expense_date, e.occurred_at, e.version,
         e.deleted_at, e.id, sellerId, e.version]
      );
    }
  });
}

export async function retryFailedExpense(expenseId: string, operationId: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE expenses SET sync_status = 'pending', sync_error = NULL, sync_error_code = NULL WHERE id = ?`,
      [expenseId]
    );
    await db.runAsync(
      `UPDATE outbox SET retry_count = 0, last_attempted_at = NULL WHERE operation_id = ?`,
      [operationId]
    );
  });
}

export async function deleteExpenseData(sellerId: string): Promise<void> {
  // Only called when user explicitly logs out — removes seller's local data
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM outbox WHERE expense_id IN (SELECT id FROM expenses WHERE seller_id = ?)`,
      [sellerId]
    );
    await db.runAsync(`DELETE FROM expenses WHERE seller_id = ?`, [sellerId]);
    await db.runAsync(`DELETE FROM sync_meta WHERE key LIKE ?`, [`${sellerId}%`]);
  });
}
