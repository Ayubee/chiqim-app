# Integratsiya Shartnomasi bilan Solishtirish Hujjati (V1)

Ushbu hujjat `docs/integration-contract.md` dagi talablar bilan mobil ilova (`mobile/`) amalga oshirilishining muvofiqligini tasdiqlaydi.

## 1. Modellar va Maydonlar Mosligi

| Shartnoma Maydoni | Turi / Formati | Mobil Ilovadagi Holati | Holat |
|-------------------|----------------|------------------------|-------|
| `stores.id` | UUID | `Store.id` (string) | Mos |
| `stores.name` | text | `Store.name` (string) | Mos |
| `stores.is_active` | boolean | `Store.is_active` (boolean) | Mos |
| `profiles.id` | UUID (= auth.users.id) | `Profile.id` | Mos |
| `profiles.full_name` | text | `Profile.full_name` | Mos |
| `profiles.store_id` | UUID (nullable) | `Profile.store_id` | Mos |
| `profiles.role` | admin \| seller | `Profile.role` | Mos |
| `profiles.assignment_version` | integer (default 1) | `Profile.assignment_version` | Mos |
| `expenses.id` | UUID (mobil yaratadi) | Barqaror `react-native-uuid` | Mos |
| `expenses.seller_id` | UUID | Auth foydalanuvchi ID | Mos |
| `expenses.store_id` | UUID | Yozuv paytidagi magazin ID | Mos |
| `expenses.amount_uzs` | bigint (1..9007199254740991) | Musbat butun son, validatsiya bor | Mos |
| `expenses.note` | text (trim 1..1000) | Majburiy izoh validatsiyasi bor | Mos |
| `expenses.expense_date` | YYYY-MM-DD (Asia/Tashkent) | `getTashkentToday()` va kalendar | Mos |
| `expenses.occurred_at` | timestamptz (ISO +05:00) | `getTashkentNowISO()` | Mos |
| `expenses.version` | integer (default 1) | Server javobidan saqlanadi | Mos |
| `expenses.deleted_at` | timestamptz nullable | Jamiga qo‘shilmaydi | Mos |
| `device_sync` | seller_id, device_id, last_synced_at | SecureStore va sync_meta | Mos |

---

## 2. API va Sync Protokoli

| Talab | Shartnoma | Mobil Ilova Amalga Oshirilishi | Holat |
|-------|-----------|--------------------------------|-------|
| Sync Endpoint | `POST /functions/v1/sync-expenses` | `callSyncAPI` orqali to‘g‘ri so‘rov | Mos |
| Headers | `Authorization`, `apikey`, `Content-Type` | Qo‘shilgan | Mos |
| Kontekst Headers | `X-Store-Id`, `X-Store-Assignment-Version` | Batch guruhlanib, mos qiymatlar uzatiladi | Mos |
| Request Payload | `{device_id, operations: [{operation_id, type: "create", expense: {...}}]}` | `SyncRequest` interfeysiga 100% mos | Mos |
| Response Payload | `{results: [{operation_id, expense_id, status, version, error_code}], server_time}` | `SyncResponse` orqali to‘liq ishlanadi | Mos |
| Idempotency | `accepted` / `duplicate` | Har ikkisi uchun versiya o‘rnatilib, `synced` qilinadi | Mos |
| Conflict / Reject | `rejected` (masalan `STORE_ASSIGNMENT_CHANGED`) | Yozuv o‘chirilmaydi, sababi ko‘rsatiladi | Mos |
| Batch cheklovi | Maksimum 100 operation | `MAX_BATCH_SIZE = 100` bilan bo‘lib jo‘natiladi | Mos |
| Timeout & Retry | Cheklangan exponential backoff | 30s timeout, max 5 retry, backoff 1s..30s | Mos |

---

## 3. Integratsiya To‘siqlari (Blockers)

Hozirgi paytda mobil ilova va `docs/integration-contract.md` o‘rtasida **hech qanday nomutanosiblik yoki Integration Blocker mavjud emas**.
Mobil qism to‘liq shartnoma qoidalariga rioya qilgan holda ishlab chiqildi.
