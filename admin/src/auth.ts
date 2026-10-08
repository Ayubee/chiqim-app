import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types.ts";

export type FailureCode =
  | "network"
  | "credentials"
  | "api_key"
  | "session"
  | "admin_required"
  | "inactive"
  | "schema"
  | "auth"
  | "backend";
export const failureMessages: Record<FailureCode, string> = {
  network:
    "Supabase serveriga ulanib bo‘lmadi. Lokal Docker/Supabase ishlayotganini va tarmoq aloqasini tekshiring.",
  credentials: "Email yoki parol noto‘g‘ri. Qayta urinib ko‘ring.",
  api_key:
    "Supabase ochiq API kaliti qabul qilinmadi. URL va publishable/anon kaliti bir loyihaga tegishli ekanligini tekshiring.",
  session: "Kirish sessiyasi tugagan. Hisobdan chiqib, qayta kiring.",
  admin_required:
    "Bu hisobda faol administrator huquqi yo‘q. Auth foydalanuvchisiga bog‘langan profiles.id, role = admin va is_active = true talab qilinadi.",
  inactive:
    "Administrator hisobi faolsizlantirilgan. Hisobni loyiha administratori faollashtirishi kerak.",
  schema:
    "Backend jadvallari yoki admin funksiyasi topilmadi. Ushbu loyihaning migrationlarini qo‘llash kerak.",
  auth: "Supabase kirishni rad etdi. Email tasdiqlanganini va email/parol orqali kirish sozlamasini tekshiring.",
  backend:
    "Backend ma’lumotlarini yuklab bo‘lmadi. Qayta urinib ko‘ring; davom etsa server sozlamalarini tekshiring.",
};
export class ConnectionFailure extends Error {
  code: FailureCode;
  constructor(code: FailureCode) {
    super(failureMessages[code]);
    this.code = code;
  }
}
export function classifyFailure(
  error: unknown,
  phase: "login" | "data" = "data",
): ConnectionFailure {
  if (error instanceof ConnectionFailure) return error;
  const e =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const code = String(e.code ?? "");
  const text = `${e.name ?? ""} ${e.message ?? ""} ${e.details ?? ""}`;
  const status = Number(e.status ?? 0);
  if (
    /invalid.?api.?key|no api key|Invalid JWT/i.test(text) &&
    phase === "login"
  )
    return new ConnectionFailure("api_key");
  if (
    /fetch|network|ECONN|ENOTFOUND|timed?\s?out|timeout|AbortError/i.test(
      text,
    ) ||
    status >= 500
  )
    return new ConnectionFailure("network");
  if (code === "invalid_credentials")
    return new ConnectionFailure("credentials");
  if (["42P01", "PGRST202", "PGRST205", "42703"].includes(code))
    return new ConnectionFailure("schema");
  if (/FORBIDDEN/.test(text) || status === 403)
    return new ConnectionFailure("admin_required");
  if (status === 401)
    return new ConnectionFailure(phase === "login" ? "api_key" : "session");
  return new ConnectionFailure(phase === "login" ? "auth" : "backend");
}
export async function loadAdminProfile(
  client: SupabaseClient,
  expectedUserId: string,
): Promise<Profile> {
  const user = await client.auth.getUser();
  if (user.error) throw classifyFailure(user.error);
  if (!user.data.user || user.data.user.id !== expectedUserId)
    throw new ConnectionFailure("session");
  const profile = await client
    .from("profiles")
    .select("*")
    .eq("id", user.data.user.id)
    .maybeSingle();
  if (profile.error) throw classifyFailure(profile.error);
  if (
    !profile.data ||
    profile.data.id !== user.data.user.id ||
    profile.data.role !== "admin"
  )
    throw new ConnectionFailure("admin_required");
  if (profile.data.is_active !== true) throw new ConnectionFailure("inactive");
  return profile.data as Profile;
}
