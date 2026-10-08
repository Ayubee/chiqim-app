import React, { createContext, useContext, useCallback, useState } from 'react';
import { LocalExpense, OutboxOperation } from '@/types';
import { insertExpenseWithOutbox, getExpensesByDate, getTodayTotal } from '@/db/expenses';
import { generateUUID } from '@/utils/uuid';
import { getTashkentToday, getTashkentNowISO } from '@/utils/date';
import { useAuth } from './AuthContext';

interface AddExpenseParams {
  amount_uzs: number;
  note: string;
  expense_date: string;
}

interface ExpenseContextValue {
  todayExpenses: LocalExpense[];
  todayTotal: number;
  isAdding: boolean;
  addExpenseError: string | null;
  loadTodayExpenses: () => Promise<void>;
  addExpense: (params: AddExpenseParams) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, store } = useAuth();
  const [todayExpenses, setTodayExpenses] = useState<LocalExpense[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);

  const loadTodayExpenses = useCallback(async () => {
    if (!session) return;
    const today = getTashkentToday();
    const expenses = await getExpensesByDate(session.user_id, today);
    setTodayExpenses(expenses);
    const total = await getTodayTotal(session.user_id, today);
    setTodayTotal(total);
  }, [session]);

  const addExpense = useCallback(
    async ({ amount_uzs, note, expense_date }: AddExpenseParams) => {
      if (!session || !profile || !store) {
        throw new Error('Foydalanuvchi tizimga kirmagan');
      }

      setIsAdding(true);
      setAddExpenseError(null);

      try {
        const expenseId = generateUUID();
        const operationId = generateUUID();
        const now = getTashkentNowISO();

        const expense: LocalExpense = {
          id: expenseId,
          seller_id: session.user_id,
          store_id: profile.store_id ?? store.id,
          assignment_version: profile.assignment_version,
          amount_uzs,
          note: note.trim(),
          expense_date,
          occurred_at: now,
          sync_status: 'pending',
          created_at_local: now,
        };

        const operation: OutboxOperation = {
          operation_id: operationId,
          expense_id: expenseId,
          store_id: profile.store_id ?? store.id,
          assignment_version: profile.assignment_version,
          retry_count: 0,
          created_at: now,
        };

        await insertExpenseWithOutbox(expense, operation);
        await loadTodayExpenses();
      } catch (e) {
        setAddExpenseError((e as Error).message);
        throw e;
      } finally {
        setIsAdding(false);
      }
    },
    [session, profile, store, loadTodayExpenses]
  );

  return (
    <ExpenseContext.Provider
      value={{
        todayExpenses,
        todayTotal,
        isAdding,
        addExpenseError,
        loadTodayExpenses,
        addExpense,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpenseProvider');
  return ctx;
}
