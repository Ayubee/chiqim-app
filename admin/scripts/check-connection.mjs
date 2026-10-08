import { loadEnv } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSupabaseConfig } from "../src/config.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = readSupabaseConfig({
  ...loadEnv("development", root, "VITE_"),
  ...process.env,
});
if (config.status !== "ready") {
  console.error(
    config.status === "missing"
      ? `Konfiguratsiya yetishmaydi: ${config.missing.join(", ")}`
      : config.reason,
  );
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(
        [401, 403].includes(response.status)
          ? "Ochiq API kaliti qabul qilinmadi."
          : "Supabase Auth javobi muvaffaqiyatsiz.",
      );
      process.exitCode = 1;
    } else
      console.log(
        "Supabase Auth ochiq kalitni qabul qildi. Bu tekshiruv login, RLS yoki Edge Functions ishlashini tasdiqlamaydi.",
      );
  } catch {
    console.error("Supabase serveriga ulanib bo‘lmadi.");
    process.exitCode = 1;
  }
}
