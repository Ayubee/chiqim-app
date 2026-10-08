export type SupabaseConfig =
  | { status: "ready"; url: string; key: string }
  | { status: "missing"; missing: string[] }
  | { status: "invalid"; reason: string };

export function readSupabaseConfig(
  env: Record<string, unknown>,
): SupabaseConfig {
  const value = (name: string) =>
    typeof env[name] === "string" ? env[name].trim() : "";
  const url = value("VITE_SUPABASE_URL");
  const primary = value("VITE_SUPABASE_PUBLISHABLE_KEY");
  const legacy = value("VITE_SUPABASE_ANON_KEY");
  const key = primary || legacy;
  const invalid = (reason: string): SupabaseConfig => ({
    status: "invalid",
    reason,
  });
  // Validate even an unused alias or a key supplied without a URL before bundling.
  for (const candidate of [primary, legacy].filter(Boolean)) {
    if (
      candidate.startsWith("sb_publishable_") &&
      /^[A-Za-z0-9_-]{20,}$/.test(candidate.slice(15))
    )
      continue;
    if (candidate.startsWith("sb_secret_"))
      return invalid(
        "Secret/service-role kaliti frontend uchun taqiqlangan. Publishable yoki anon kalitini ishlating.",
      );
    try {
      const parts = candidate.split(".");
      if (parts.length !== 3) throw new Error();
      const claims = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (claims.role !== "anon")
        return invalid(
          "Frontend uchun faqat publishable yoki anon kaliti mumkin. Service-role kalitini olib tashlang.",
        );
    } catch {
      return invalid(
        "Ochiq API kaliti formati noto‘g‘ri yoki namuna qiymat yozilgan.",
      );
    }
  }
  const missing = [
    !url && "VITE_SUPABASE_URL",
    !key && "VITE_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean) as string[];
  if (missing.length) return { status: "missing", missing };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return invalid("Supabase URL to‘liq http:// yoki https:// manzil bo‘lsin.");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    return invalid(
      "Supabase URL formati noto‘g‘ri. Faqat API manzilini kiriting.",
    );
  if (
    /^(example|your-project|your_project|YOUR_PROJECT_REF)\./i.test(
      parsed.hostname,
    )
  )
    return invalid(
      "Namuna URL o‘rniga shu loyihaning haqiqiy Supabase manzilini kiriting.",
    );
  if (key.startsWith("sb_secret_"))
    return invalid(
      "Secret/service-role kaliti frontend uchun taqiqlangan. Publishable yoki anon kalitini ishlating.",
    );
  if (
    key.startsWith("sb_publishable_") &&
    /^[A-Za-z0-9_-]{20,}$/.test(key.slice(15))
  )
    return { status: "ready", url: url.replace(/\/$/, ""), key };
  try {
    const parts = key.split(".");
    if (parts.length !== 3) throw new Error();
    const claims = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    // Only a guard against accidentally bundling a privileged key, not JWT authorization.
    if (claims.role !== "anon")
      return invalid(
        "Frontend uchun faqat publishable yoki anon kaliti mumkin. Service-role kalitini olib tashlang.",
      );
    const project = parsed.hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
    if (project && claims.ref && claims.ref !== project)
      return invalid(
        "URL va anon kaliti turli Supabase loyihalariga tegishli.",
      );
    return { status: "ready", url: url.replace(/\/$/, ""), key };
  } catch {
    return invalid(
      "Ochiq API kaliti formati noto‘g‘ri yoki namuna qiymat yozilgan.",
    );
  }
}
