import * as SQLite from 'expo-sqlite';
import { DB_NAME } from '@/constants';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabase(db);
  return db;
}

export async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      assignment_version INTEGER NOT NULL DEFAULT 1,
      amount_uzs INTEGER NOT NULL,
      note TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_error TEXT,
      sync_error_code TEXT,
      version INTEGER,
      deleted_at TEXT,
      created_at_local TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox (
      operation_id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      assignment_version INTEGER NOT NULL DEFAULT 1,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id)
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_seller ON expenses(seller_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_sync ON expenses(sync_status);
    CREATE INDEX IF NOT EXISTS idx_outbox_expense ON outbox(expense_id);
  `);
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
