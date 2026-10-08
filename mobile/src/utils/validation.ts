import { getTashkentToday } from './date';

export interface ExpenseValidationError {
  amount?: string;
  note?: string;
  expense_date?: string;
}

export function validateExpenseInput(
  amount: number | null,
  note: string,
  expenseDate: string
): ExpenseValidationError {
  const errors: ExpenseValidationError = {};

  // Amount: must be positive integer, max JS safe integer
  if (amount === null || amount <= 0) {
    errors.amount = "Summa musbat bo'lishi kerak";
  } else if (!Number.isInteger(amount)) {
    errors.amount = "Summa butun son bo'lishi kerak";
  } else if (amount > 9007199254740991) {
    errors.amount = 'Summa juda katta';
  }

  // Note: required, 1-1000 chars after trim
  const trimmedNote = note.trim();
  if (!trimmedNote) {
    errors.note = "Izoh majburiy";
  } else if (trimmedNote.length > 1000) {
    errors.note = "Izoh 1000 belgidan oshmasin";
  }

  // Date: valid YYYY-MM-DD, between 2000-01-01 and today (Tashkent)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
    errors.expense_date = "Sana noto'g'ri formatda";
  } else {
    const today = getTashkentToday();
    if (expenseDate > today) {
      errors.expense_date = "Kelajak sana kiritib bo'lmaydi";
    } else if (expenseDate < '2000-01-01') {
      errors.expense_date = "Sana 2000-01-01 dan oldin bo'lmasin";
    }
  }

  return errors;
}
