import type { Dashboard, Expense, Filters, Report } from "./types";
import { tashkentDate } from "./format";
const today = tashkentDate();
const stores = [
  "Chilonzor filiali",
  "Yunusobod filiali",
  "Sergeli filiali",
  "Olmazor filiali",
];
const names = [
  "Aziz Karimov",
  "Dilshod Sobirov",
  "Madina Ismoilova",
  "Javohir Rahimov",
  "Sardor Aliyev",
];
export const demoDashboard: Dashboard = {
  stores: stores.map((name, i) => ({
    id: `demo-store-${i}`,
    name,
    is_active: true,
    today_total: ["285000", "168000", "92000", "0"][i],
    last_synced_at:
      i === 3 ? null : new Date(Date.now() - (i + 1) * 600000).toISOString(),
  })),
  profiles: names.map((full_name, i) => ({
    id: `demo-seller-${i}`,
    full_name,
    store_id: `demo-store-${Math.max(0, i - 1)}`,
    role: "seller",
    is_active: true,
    assignment_version: 1,
  })),
};
const amounts = [85000, 120000, 45000, 35000];
const notes = [
  "Mahsulotlarni yetkazib berish xizmati",
  "Do‘kon uchun xo‘jalik buyumlari",
  "Internet uchun oylik to‘lov",
  "Yetkazib beruvchi uchun yo‘l xarajati",
];
const rows: Expense[] = demoDashboard.stores
  .flatMap((store, s) =>
    amounts.map((amount, i) => ({
      id: `demo-expense-${s}-${i}`,
      store_id: store.id,
      seller_id: s === 0 ? `demo-seller-${i % 2}` : `demo-seller-${s + 1}`,
      amount_uzs: String(
        s === 0
          ? amount
          : s === 1
            ? [60000, 48000, 35000, 25000][i]
            : s === 2
              ? [30000, 22000, 25000, 15000][i]
              : 0,
      ),
      note: notes[i],
      expense_date: today,
      occurred_at: `${today}T${["14:32", "12:15", "10:48", "09:20"][i]}:00+05:00`,
      server_received_at: new Date().toISOString(),
      version: 1,
      deleted_at: null,
    })),
  )
  .filter((row) => row.amount_uzs !== "0");
export function demoReport(filters: Filters, exporting: boolean): Report {
  const all = rows.filter(
    (r) =>
      r.store_id === filters.store_id &&
      r.expense_date >= filters.from &&
      r.expense_date <= filters.to &&
      (!filters.seller_id || r.seller_id === filters.seller_id),
  );
  return {
    rows: exporting
      ? all
      : all.slice(
          filters.offset ?? 0,
          (filters.offset ?? 0) + (filters.limit ?? 50),
        ),
    count: all.length,
    total: all.reduce((n, r) => n + BigInt(r.amount_uzs), 0n).toString(),
  };
}
