import { createClient } from "@supabase/supabase-js";
import type { Dashboard, Filters, Report, Audit, Profile } from "./types";
import { readSupabaseConfig } from "./config";
import { classifyFailure, ConnectionFailure } from "./auth";
export const configuration = readSupabaseConfig({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});
export const supabase =
  configuration.status === "ready"
    ? createClient(configuration.url, configuration.key)
    : null;
export async function command<T>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error("UNCONFIGURED");
  const result = await supabase.rpc("admin_command", { action, data });
  if (result.error) {
    const failure = classifyFailure(result.error);
    throw failure.code === "backend" ? result.error : failure;
  }
  if (result.data === null) throw new ConnectionFailure("backend");
  return result.data as T;
}
export const dashboard = async (): Promise<Dashboard> => {
  const data = await command<Dashboard>("dashboard");
  if (!Array.isArray(data.stores) || !Array.isArray(data.profiles))
    throw new ConnectionFailure("schema");
  return data;
};
export const report = async (
  filters: Filters,
  exporting = false,
): Promise<Report> => {
  const data = await command<Report>(exporting ? "export" : "report", {
    ...filters,
  });
  if (
    !Array.isArray(data.rows) ||
    typeof data.total !== "string" ||
    typeof data.count !== "number"
  )
    throw new ConnectionFailure("schema");
  return data;
};
export async function audit(id: string): Promise<Audit[]> {
  const result = await supabase!
    .from("expense_audit")
    .select("*")
    .eq("expense_id", id)
    .order("id");
  if (result.error) throw classifyFailure(result.error);
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
    const failure = classifyFailure(error);
    if (failure.code === "network" || failure.code === "session") throw failure;
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
