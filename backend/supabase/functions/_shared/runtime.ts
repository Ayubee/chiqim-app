import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { HttpError, type Identity } from "./http.ts";
const required = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};
export const origins = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((s) => s.trim());
export const url = required("SUPABASE_URL");
export const anonKey = required("SUPABASE_ANON_KEY");
export async function authenticate(req: Request): Promise<Identity> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new HttpError(401, "UNAUTHORIZED");
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new HttpError(401, "UNAUTHORIZED");
  const profile = await client
    .from("profiles")
    .select("role,is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile.error) throw new HttpError(500, "PROFILE_LOOKUP_FAILED");
  if (!profile.data?.is_active) throw new HttpError(403, "INACTIVE_PROFILE");
  return { client, userId: data.user.id, role: profile.data.role };
}
export function serviceClient() {
  return createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
