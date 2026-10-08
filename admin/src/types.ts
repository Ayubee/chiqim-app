export type Store = {
  id: string;
  name: string;
  is_active: boolean;
  today_total: string;
  last_synced_at: string | null;
};
export type Profile = {
  id: string;
  full_name: string;
  store_id: string | null;
  role: "admin" | "seller";
  is_active: boolean;
  assignment_version: number;
};
export type Expense = {
  id: string;
  seller_id: string;
  store_id: string;
  amount_uzs: string;
  note: string;
  expense_date: string;
  occurred_at: string;
  server_received_at: string;
  version: number;
  deleted_at: string | null;
};
export type Dashboard = { stores: Store[]; profiles: Profile[] };
export type Filters = {
  store_id: string;
  from: string;
  to: string;
  seller_id?: string | null;
  offset?: number;
  limit?: number;
};
export type Report = { rows: Expense[]; total: string; count: number };
export type Audit = {
  id: number;
  actor_id: string;
  server_time: string;
  old_values: Expense | null;
  new_values: Expense;
};
