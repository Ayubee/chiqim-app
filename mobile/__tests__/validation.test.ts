import { validateExpenseInput } from '../src/utils/validation';
import { parseSomInput, formatSomInput, getTashkentToday } from '../src/utils/date';

describe('validateExpenseInput', () => {
  const today = getTashkentToday();

  it('to‘g‘ri chiqim parametrlarini muvaffaqiyatli qabul qilishi kerak', () => {
    const errors = validateExpenseInput(35000, 'Tushlik (osh va choy)', today);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('nol so‘m kiritilganda xatolik berishi kerak', () => {
    const errors = validateExpenseInput(0, 'Kantselyariya', today);
    expect(errors.amount).toBeDefined();
    expect(errors.amount).toContain('musbat');
  });

  it('manfiy summa kiritilganda rad etishi kerak', () => {
    const errors = validateExpenseInput(-5000, 'Yo‘l haqi', today);
    expect(errors.amount).toBeDefined();
  });

  it('kasr son kiritilganda rad etishi kerak', () => {
    const errors = validateExpenseInput(1500.5, 'Taksopark', today);
    expect(errors.amount).toBeDefined();
    expect(errors.amount).toContain('butun son');
  });

  it('JS safe integer chegarasidan katta summa rad etilishi kerak', () => {
    const errors = validateExpenseInput(9007199254740992, 'Katta xarajat', today);
    expect(errors.amount).toBeDefined();
    expect(errors.amount).toContain('katta');
  });

  it('bo‘sh izoh kiritilganda rad etishi kerak', () => {
    const errors = validateExpenseInput(20000, '', today);
    expect(errors.note).toBeDefined();
    expect(errors.note).toContain('majburiy');
  });

  it('faqat bo‘shliq (spaces) iborat izoh rad etilishi kerak', () => {
    const errors = validateExpenseInput(20000, '    ', today);
    expect(errors.note).toBeDefined();
  });

  it('1000 belgidan uzun izoh rad etilishi kerak', () => {
    const longNote = 'A'.repeat(1001);
    const errors = validateExpenseInput(20000, longNote, today);
    expect(errors.note).toBeDefined();
    expect(errors.note).toContain('1000 belgidan oshmasin');
  });

  it('kelajak sana tanlanganda rad etilishi kerak', () => {
    const futureDate = '2099-01-01';
    const errors = validateExpenseInput(10000, 'Yetkazib berish', futureDate);
    expect(errors.expense_date).toBeDefined();
    expect(errors.expense_date).toContain('Kelajak');
  });

  it('2000-01-01 dan oldingi sana rad etilishi kerak', () => {
    const pastDate = '1999-12-31';
    const errors = validateExpenseInput(10000, 'Eski xarajat', pastDate);
    expect(errors.expense_date).toBeDefined();
  });

  it('o‘tmishdagi qonuniy sana muvaffaqiyatli o‘tishi kerak', () => {
    const validPastDate = '2024-05-15';
    const errors = validateExpenseInput(50000, 'Kommunal', validPastDate);
    expect(errors.expense_date).toBeUndefined();
  });
});

describe('parseSomInput & formatSomInput', () => {
  it('bo‘shliqli matndan butun son hosil qilishi kerak', () => {
    expect(parseSomInput('150 000')).toBe(150000);
    expect(parseSomInput('1 250 000 so‘m')).toBe(1250000);
  });

  it('bo‘sh matn uchun null qaytarishi kerak', () => {
    expect(parseSomInput('')).toBeNull();
    expect(parseSomInput('   ')).toBeNull();
  });

  it('raqamlarni minglik ajratgich bilan chiroyli formatlashi kerak', () => {
    expect(formatSomInput('35000')).toBe('35 000');
    expect(formatSomInput('1000000')).toBe('1 000 000');
  });
});
