import { TASHKENT_TIMEZONE } from '@/constants';

/**
 * Get today's date in Asia/Tashkent as YYYY-MM-DD
 */
export function getTashkentToday(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TASHKENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // returns YYYY-MM-DD
}

/**
 * Get current ISO timestamp with Tashkent offset
 */
export function getTashkentNowISO(): string {
  const now = new Date();
  // Get Tashkent offset: UTC+5
  const tashkentOffset = 5 * 60; // minutes
  const localOffset = -now.getTimezoneOffset(); // minutes
  const diffMs = (tashkentOffset - localOffset) * 60 * 1000;
  const tashkentDate = new Date(now.getTime() + diffMs);
  const offsetStr = '+05:00';
  const iso = tashkentDate.toISOString().replace('Z', offsetStr);
  return iso;
}

/**
 * Format YYYY-MM-DD to readable Uzbek date
 */
export function formatDateUzbek(dateStr: string): string {
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
  ];
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

/**
 * Format amount to Uzbek som display (e.g. 30 000 so'm)
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('uz-UZ').replace(/,/g, ' ') + " so'm";
}

/**
 * Format amount without currency suffix
 */
export function formatAmountShort(amount: number): string {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace('.0', '') + ' mln';
  }
  if (amount >= 1_000) {
    return Math.round(amount / 1000) + ' ming';
  }
  return amount.toString();
}

/**
 * Format ISO timestamp to HH:MM in Tashkent
 */
export function formatTimeFromISO(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString('uz-UZ', {
    timeZone: TASHKENT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Parse input string as a number of som
 * Removes spaces and non-numeric chars except digits
 */
export function parseSomInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  if (isNaN(n)) return null;
  return n;
}

/**
 * Format number input with thousand separators for display
 */
export function formatSomInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  const n = parseInt(digits, 10);
  return n.toLocaleString('uz-UZ').replace(/,/g, ' ');
}

/**
 * Get YYYY-MM string for a given date
 */
export function getYearMonth(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Get days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get first day of week (0=Sun) for month
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

/**
 * Check if dateStr is today in Tashkent
 */
export function isTodayTashkent(dateStr: string): boolean {
  return dateStr === getTashkentToday();
}

/**
 * Compare two YYYY-MM-DD strings
 */
export function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Format last sync time
 */
export function formatLastSyncTime(isoStr: string | null): string {
  if (!isoStr) return 'Hech qachon';
  const date = new Date(isoStr);
  const today = getTashkentToday();
  const dateStr = date.toLocaleDateString('uz-UZ', {
    timeZone: TASHKENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // Simple check
  const timePart = date.toLocaleTimeString('uz-UZ', {
    timeZone: TASHKENT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const syncDate = date.toLocaleDateString('en-CA', { timeZone: TASHKENT_TIMEZONE });
  if (syncDate === today) {
    return `Bugun ${timePart}`;
  }
  return `${dateStr} ${timePart}`;
}
