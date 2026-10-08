# Chiqim integratsiyasi — V1

Backend va mobile uchun umumiy shartnoma. Faqat chiqim: kirim, balans, qoldiq, savdo yoki ombor yo‘q.

## Jadvallar

- `stores`: `id UUID`, `name text`, `is_active boolean`.
- `profiles`: `id UUID = auth.users.id`, `full_name text`, `store_id UUID` (faqat admin uchun nullable), `role: admin | seller`, `is_active boolean`.
- `expenses`: `id UUID` (mobil qurilmada yaratiladi), `seller_id UUID`, `store_id UUID`, `amount_uzs bigint` (musbat butun so‘m), `note text` (majburiy), `expense_date date` (`YYYY-MM-DD`, Asia/Tashkent), `occurred_at timestamptz`, `server_received_at timestamptz` (server), `version integer` (dastlab 1), `deleted_at timestamptz nullable` (bekor qilish).
- `expense_audit`: oldingi/yangi qiymatlar, `actor_id`, server vaqti.
- `device_sync`: `seller_id`, `device_id UUID`, `last_synced_at` (faqat to‘liq muvaffaqiyatli batchdan keyin server).

`pending/failed/synced` faqat mobil lokal holatlar. Sotuvchi V1 da tahrirlash yoki bekor qilish huquqiga ega emas. Admin versiya tekshiruvi va audit bilan tuzatadi/bekor qiladi.

## Auth va o‘qish

Supabase Auth `signInWithPassword({email,password})`. Ochiq signup o‘chiriladi. `profiles`, `stores`, `expenses` SELECT so‘rovlari RLS orqali himoyalangan. Faol seller faqat o‘z profili/chiqimlari va joriy magazinini o‘qiydi. Admin barcha ma’lumotni o‘qiydi. Hech bir klient jadvallarga to‘g‘ridan-to‘g‘ri yozmaydi.

## Sync

`POST {SUPABASE_URL}/functions/v1/sync-expenses`

Headers: `Authorization: Bearer <access_token>`, `apikey: <publishable_or_anon_key>`, `Content-Type: application/json`.

```json
{"device_id":"UUID","operations":[{"operation_id":"UUID","type":"create","expense":{"id":"UUID","amount_uzs":12000,"note":"Yetkazib berish","expense_date":"2026-10-08","occurred_at":"2026-10-08T17:30:00+05:00"}}]}
```

```json
{"results":[{"operation_id":"UUID","expense_id":"UUID","status":"accepted","version":1}],"server_time":"2026-10-08T12:30:01Z"}
```

Status `accepted | duplicate | rejected`. Accepted/duplicate: `version`. Rejected: `error_code`. Har operation alohida DB transaction; batch uzilib qolsa xuddi o‘sha operation ID va payload bilan qayta yuboriladi. Bir xil ID boshqa mazmun bilan kelsa `CONFLICT`. Javob olinmagan operation lokal navbatdan o‘chirilmaydi. `server_time` UTC ISO timestamp.

### Majburiy magazin konteksti (JSON shaklini o‘zgartirmaydi)

`profiles` server boshqaradigan qo‘shimcha `assignment_version integer` maydoniga ega (dastlab 1, store o‘zgarganda oshadi). Mobil yozuvni lokal yaratish vaqtida joriy profilning `store_id` va `assignment_version` qiymatlarini yozuv bilan birga saqlaydi. Batch faqat bir xil kontekstdagi yozuvlardan tuziladi va quyidagi sarlavhalarni yuboradi:

- `X-Store-Id: <lokal yaratish paytidagi store_id>`
- `X-Store-Assignment-Version: <lokal yaratish paytidagi assignment_version>`

Bu identity sifatida qabul qilinmaydi: server foydalanuvchini JWT va profil orqali oladi, sarlavhalarni joriy profilga solishtiradi. Kontekstsiz yangi create `STORE_CONTEXT_REQUIRED`, eski kontekst `STORE_ASSIGNMENT_CHANGED`. Magazin almashtirilib keyin oldingisiga qaytarilsa ham versiya farqi conflict beradi. Navbatdagi kontekstni avtomatik yangilamang. Admin eski yozuvni tegishli magazinda audit bilan qo‘lda kiritadi (`admin_record_expense`) va mobil operator tasdig‘idan so‘ng rad qilingan lokal yozuvni arxivlaydi. Oldin qabul qilingan aynan bir xil takroriy so‘rov eski kontekst bilan ham `duplicate` qaytaradi.

### Cheklovlar va xatolar

Maksimum 100 operation/batch, 128 KiB UTF-8 body; bitta operationning PostgreSQL JSON ko‘rinishi 8 KiB dan oshmasin. `amount_uzs`: 1..9007199254740991 (JS safe integer); `note`: trimdan keyin 1..1000 belgi; sana haqiqiy `YYYY-MM-DD`, 2000-01-01 dan Toshkent bo‘yicha bugungacha; `occurred_at`: timezone bor ISO vaqt, 2000-yildan server vaqti +5 daqiqagacha. Expense sanasi occurred_at sanasidan mustaqil; kechagi yozuv bugun sync qilinsa kechagi jamiga tushadi.

Per-operation: `INVALID_OPERATION`, `INVALID_EXPENSE`, `INVALID_AMOUNT`, `INVALID_NOTE`, `INVALID_DATE`, `INVALID_TIME`, `STORE_CONTEXT_REQUIRED`, `STORE_ASSIGNMENT_CHANGED`, `INACTIVE_PROFILE`, `INACTIVE_STORE`, `FORBIDDEN`, `CONFLICT`, `INTERNAL_ERROR` (qayta urinish mumkin). Butun request HTTP 400 (noto‘g‘ri envelope), 401 (token), 403 (seller/admin huquqi), 413 (hajm), 500 (server). HTTP xato yoki yetishmagan acknowledgementda lokal yozuv synced bo‘lmaydi. `last_synced_at` faqat barcha operation accepted/duplicate bo‘lganda yangilanadi.

## Admin

`admin-users` Edge Function: faol admin tokeni bilan seller yaratish. Store va seller boshqaruvi, chiqim tuzatish/bekor qilish DB RPC orqali. Admin tahriri `expected_version` talab qiladi; eskirgan versiya `VERSION_CONFLICT`. Bekor qilingan yozuvlar jamiga kirmaydi, audit o‘chirilmaydi. Bir magazinda ko‘p seller bo‘lishi mumkin. Haqiqiy online indikator yo‘q: `last_synced_at` ko‘rsatiladi.

Mobile env qiymatlari: Supabase URL va publishable key (yoki legacy anon key). Joriy Expo ilovadagi aniq nomlar: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `EXPO_PUBLIC_USE_MOCK=false` haqiqiy API uchun. Backend serverida `SUPABASE_URL`/`SUPABASE_ANON_KEY`, admin buildida `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` ishlatiladi. Barchasi bir loyiha URL/ochiq kalitiga ishora qiladi. Service-role kaliti faqat Edge serverida. `.env` va parollarni commit qilmang. Backend setup: `docs/backend/README.md`.
