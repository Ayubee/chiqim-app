import { classifyFailure, ConnectionFailure } from "./auth.ts";
export const money = (value: string | number | bigint) =>
  BigInt(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export function tashkentDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const time = (value: string) =>
  new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
const months = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];
export const dateLabel = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return `${day}-${months[month - 1]}, ${year}`;
};
export const syncLabel = (value: string | null) =>
  value
    ? `${dateLabel(tashkentDate(new Date(value)))} · ${time(value)}`
    : "Hali sinxronlanmagan";
export function message(error: unknown): string {
  if (error instanceof ConnectionFailure) return error.message;
  const raw = error instanceof Error ? error.message : String(error);
  const map: Record<string, string> = {
    INVALID_AMOUNT: "Summani musbat butun so‘m ko‘rinishida kiriting.",
    INVALID_NOTE: "Izoh 1 dan 1000 tagacha belgidan iborat bo‘lsin.",
    INVALID_DATE: "Haqiqiy xarajat sanasini tanlang; sana kelajakda bo‘lmasin.",
    NOT_FOUND: "Yozuv topilmadi. Sahifani yangilang.",
    VERSION_CONFLICT:
      "Yozuv boshqa admin tomonidan o‘zgartirilgan. Yangilab, qayta urinib ko‘ring.",
    FORBIDDEN: "Bu amal uchun ruxsat yo‘q.",
    INACTIVE_STORE: "Faol magazinni tanlang.",
    EXPORT_LIMIT:
      "Eksport uchun 10 000 tagacha yozuv tanlang. Sana oralig‘ini qisqartiring.",
    USER_CREATION_FAILED:
      "Hisob yaratilmadi. Email bandligi va parol talablarini tekshiring.",
    PROFILE_CREATION_FAILED:
      "Profil yaratilmadi. Magazinning faol ekanligini tekshiring.",
    ALREADY_CANCELLED: "Bu yozuv allaqachon bekor qilingan.",
  };
  for (const key in map) if (raw.includes(key)) return map[key];
  return classifyFailure(error).message;
}
