import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { readSupabaseConfig } from "../../admin/src/config.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const admin = resolve(root, "../admin");
const cli = join(root, "node_modules/supabase/dist/supabase.js");
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
if (!existsSync(cli))
  fail("Backend katalogida npm.cmd ci bajaring: Supabase CLI yetishmaydi.");
const dockerCandidates = ["docker"];
if (process.platform === "win32") {
  dockerCandidates.push(
    join(
      process.env.ProgramFiles ?? "C:/Program Files",
      "Docker/Docker/resources/bin/docker.exe",
    ),
  );
  dockerCandidates.push(
    join(
      process.env.LOCALAPPDATA ?? "",
      "Programs/DockerDesktop/resources/bin/docker.exe",
    ),
  );
}
const docker = dockerCandidates.find(
  (bin) =>
    spawnSync(bin, ["--version"], { encoding: "utf8", windowsHide: true })
      .status === 0,
);
if (!docker)
  fail(
    "Docker topilmadi. WSL 2 va Docker Desktop (Linux containers) o‘rnating. backend/LOCAL_SETUP.md ni o‘qing. Hech qanday env yoki baza o‘zgartirilmadi.",
  );
const info = spawnSync(docker, ["info", "--format", "{{.OSType}}"], {
  encoding: "utf8",
  windowsHide: true,
});
if (info.status !== 0 || info.stdout.trim() !== "linux")
  fail(
    "Docker Desktopni ishga tushiring va Linux containers rejimini tanlang. Baza o‘zgartirilmadi.",
  );
const env = {
  ...process.env,
  PATH: isAbsolute(docker)
    ? `${dirname(docker)}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
    : process.env.PATH,
};
// Capture all CLI output: start/status can include privileged keys. Never echo it.
const run = (args, step) => {
  console.log(step);
  const result = spawnSync(
    process.execPath,
    [cli, ...args, "--workdir", root, "--agent", "no"],
    {
      cwd: root,
      env,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.status !== 0)
    fail(
      `${step} bajarilmadi. Docker holati, disk/tarmoq va backend/LOCAL_SETUP.md ni tekshiring. Kalitlar logga chiqarilmadi; reset qilinmadi.`,
    );
  return result.stdout;
};
run(
  ["start"],
  "Shu loyihaning lokal Supabase konteynerlari ishga tushirilmoqda…",
);
run(["db", "push", "--local"], "Faqat qo‘llanmagan migrationlar qo‘llanmoqda…");
let status;
try {
  status = JSON.parse(
    run(["status", "-o", "json"], "Lokal ochiq ulanish sozlamalari olinmoqda…"),
  );
} catch {
  fail(
    "CLI status JSON o‘qilmadi. Env yozilmadi; CLI chiqishini ommaviy logga chiqarmang.",
  );
}
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
const config = readSupabaseConfig({
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
});
if (
  config.status !== "ready" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.url).hostname)
)
  fail("CLI haqiqiy lokal URL va ochiq kalit qaytarmadi. Env yozilmadi.");
if (Object.keys(process.env).some((name) => /^VITE_SUPABASE_/.test(name)))
  fail(
    "Terminaldagi VITE_SUPABASE_* qiymatlari faylni bosib ketadi. Ularni olib tashlab qayta ishga tushiring. Env yozilmadi.",
  );
const target = join(admin, ".env.local");
const content = `# Generated from this backend's local Supabase; never commit.\nVITE_SUPABASE_URL=${config.url}\nVITE_SUPABASE_PUBLISHABLE_KEY=${config.key}\n`;
if (existsSync(target)) {
  const current = readFileSync(target, "utf8");
  if (current !== content)
    fail(
      "admin/.env.local allaqachon mavjud va almashtirilmadi. Uning loyiha manzilini mahalliy tekshiring. Baza reset qilinmadi.",
    );
} else writeFileSync(target, content, { flag: "wx", mode: 0o600 });
console.log(
  "admin/.env.local haqiqiy lokal URL/ochiq kalit bilan tayyor. Kalitlar chiqarilmadi. Admin dev serverini qayta boshlang; backend/LOCAL_SETUP.md bo‘yicha Auth admin yarating.",
);
