import {
  getTashkentToday,
  formatDateUzbek,
  formatAmount,
  formatAmountShort,
  getDaysInMonth,
  getYearMonth,
  formatTimeFromISO,
} from '../src/utils/date';

describe('Date and Uzbek formatting utilities', () => {
  it('getTashkentToday YYYY-MM-DD shaklida qaytishi kerak', () => {
    const today = getTashkentToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatDateUzbek o‘zbekcha oy nomlari bilan formatlashi kerak', () => {
    const formatted = formatDateUzbek('2026-10-09');
    expect(formatted).toBe('9 Oktabr 2026');

    const formattedJan = formatDateUzbek('2025-01-01');
    expect(formattedJan).toBe('1 Yanvar 2025');
  });

  it('formatAmount so‘m qo‘shimchasi va bo‘shliq bilan formatlashi kerak', () => {
    expect(formatAmount(30000)).toMatch(/30[ \u00a0]000 so'm/);
    expect(formatAmount(1500000)).toMatch(/1[ \u00a0]500[ \u00a0]000 so'm/);
  });

  it('formatAmountShort qisqa shaklda million va mingni formatlashi kerak', () => {
    expect(formatAmountShort(50000)).toBe('50 ming');
    expect(formatAmountShort(2500000)).toBe('2.5 mln');
    expect(formatAmountShort(500)).toBe('500');
  });

  it('getDaysInMonth fevral va boshqa oylarning kunlarini to‘g‘ri hisoblashi kerak', () => {
    // 2024 - kabisa yili
    expect(getDaysInMonth(2024, 2)).toBe(29);
    // 2025 - oddiy yil
    expect(getDaysInMonth(2025, 2)).toBe(28);
    // Oktabr 31 kun
    expect(getDaysInMonth(2026, 10)).toBe(31);
    // Sentabr 30 kun
    expect(getDaysInMonth(2026, 9)).toBe(30);
  });

  it('getYearMonth YYYY-MM qismini ajratishi kerak', () => {
    expect(getYearMonth('2026-10-09')).toBe('2026-10');
  });

  it('formatTimeFromISO ISO vaqtdan HH:mm ajratishi kerak', () => {
    const iso = '2026-10-09T14:30:00+05:00';
    const time = formatTimeFromISO(iso);
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });
});
