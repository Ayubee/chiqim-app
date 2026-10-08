import { createClient } from "@supabase/supabase-js";
import type { Dashboard, Filters, Report, Audit, Profile } from "./types";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const demoMode =
  import.meta.env.DEV &&
  new URLSearchParams(location.search).get("demo") === "1";
export async function command<T>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error("UNCONFIGURED");
  const result = await supabase.rpc("admin_command", { action, data });
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
export const dashboard = async (): Promise<Dashboard> =>
  demoMode ? (await import("./demo")).demoDashboard : command("dashboard");
export const report = async (
  filters: Filters,
  exporting = false,
): Promise<Report> =>
  demoMode
    ? (await import("./demo")).demoReport(filters, exporting)
    : command(exporting ? "export" : "report", { ...filters });
export async function audit(id: string): Promise<Audit[]> {
  if (demoMode) return [];
  const result = await supabase!
    .from("expense_audit")
    .select("*")
    .eq("expense_id", id)
    .order("id");
  if (result.error) throw result.error;
  return result.data as Audit[];
}
export async function createSeller(
  data: Record<string, unknown>,
): Promise<Profile> {
  const { data: result, error } = await supabase!.functions.invoke(
    "admin-users",
    { body: data },
  );
  if (error) {
    let code = "USER_CREATION_FAILED";
    try {
      const payload = await error.context?.json();
      code = payload?.error_code ?? code;
    } catch {
      /* use safe fallback */
    }
    throw new Error(code);
  }
  return result.profile;
}
