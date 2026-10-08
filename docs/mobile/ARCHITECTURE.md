# Chiqim — Mobil Arxitektura va Sinxronlash Hujjati

## 1. Umumiy Arxitektura

Ilova **Offline-First** tamoyiliga asoslangan. Magazin sotuvchisi internet aloqasi bo‘lmagan joyda ham xarajatlarni uzluksiz kiritishi mumkin.

```
+-------------------------------------------------------------------+
|                        React Native UI                            |
|  HomeScreen          AddExpenseModal          HistoryScreen       |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                  State & Context Layer                            |
|             AuthContext           ExpenseContext                  |
+-------------------------------------------------------------------+
                                  |
                 +----------------+----------------+
                 |                                 |
                 v                                 v
+---------------------------------+  +-------------------------------+
|     Local SQLite Database       |  |      Sync Service Worker      |
|  - expenses (mahalliy chiqimlar)|  |  - Single active worker lock  |
|  - outbox (yuborish navbati)    |  |  - Batch grouping (store_id)  |
|  - sync_meta (device_id, vaqt)  |  |  - Exponential backoff & retry|
+---------------------------------+  +-------------------------------+
                                                   |
                                                   v  POST /sync-expenses
                                     +-------------------------------+
                                     |   Supabase Backend            |
                                     |  - Edge Function (sync)       |
                                     |  - Auth & RLS Read            |
                                     +-------------------------------+
```

---

## 2. Jadvallar va Mahalliy SQLite Sxemasi

### `expenses` Jadvali
- `id`: TEXT PRIMARY KEY (Qurilmada hosil qilingan barqaror UUID)
- `seller_id`: TEXT (Joriy sotuvchi auth user ID)
- `store_id`: TEXT (Yozuv kiritilgan paytdagi magazin ID)
- `assignment_version`: INTEGER (Yozuv kiritilgan paytdagi biriktirish versiyasi)
- `amount_uzs`: INTEGER (Musbat butun so‘m)
- `note`: TEXT (Majburiy izoh, trimdan so‘ng 1..1000 belgi)
- `expense_date`: TEXT (`YYYY-MM-DD`, Asia/Tashkent kalendar sanasi)
- `occurred_at`: TEXT (ISO vaqt mintaqasi bilan, e.g. `+05:00`)
- `sync_status`: TEXT (`pending` | `synced` | `failed`)
- `sync_error`: TEXT (Xatolik matni)
- `sync_error_code`: TEXT (Server xato kodi, masalan `STORE_ASSIGNMENT_CHANGED`)
- `version`: INTEGER (Serverdan qabul qilingan versiya)
- `deleted_at`: TEXT (Admin bekor qilgan bo‘lsa belgilangan vaqt)
- `created_at_local`: TEXT (Mahalliy yaratilgan vaqt)

### `outbox` Jadvali (Yuborish navbati)
- `operation_id`: TEXT PRIMARY KEY (Qayta urinishda o‘zgarmaydigan barqaror UUID)
- `expense_id`: TEXT REFERENCES expenses(id)
- `store_id`: TEXT
- `assignment_version`: INTEGER
- `retry_count`: INTEGER DEFAULT 0
- `last_attempted_at`: TEXT
- `created_at`: TEXT

Har bir yangi chiqim kiritilganda `expenses` va `outbox` yozuvlari **yagona SQLite tranzaksiyasi** (`withTransactionAsync`) ichida saqlanadi. Shu sababli ilova yopilsa yoki batareya o‘chsa ham ma’lumot yarim saqlanib qolmaydi.

---

## 3. Sinxronlash (Sync) Xizmati Qoidalari

1. **Yagona Worker (Concurrency Lock)**:
   - `syncInProgress` bayrog‘i orqali bir vaqtning o‘zida bir nechta sinxronlash jarayoni boshlanishi bloklanadi.
2. **Magazin Kontekstiga Ko‘ra Guruhlash**:
   - Outboxdagi yozuvlar `store_id` va `assignment_version` bo‘yicha guruhlanadi.
   - Har bir batch so‘rovida quyidagi maxsus sarlavhalar jo‘natiladi:
     - `X-Store-Id: <store_id>`
     - `X-Store-Assignment-Version: <assignment_version>`
   - Bu serverga sotuvchining eski magazinida kiritilgan yozuvini yangi magazinga jim o‘tkazib yuborilishining oldini oladi.
3. **Idempotentlik va Javobni Qayta Ishlash**:
   - `status === 'accepted'`: lokal yozuv `synced` holatiga o‘tkaziladi, serverdan kelgan `version` yoziladi, outboxdan o‘chiriladi.
   - `status === 'duplicate'`: `accepted` kabi xuddi shunday qabul qilinadi, qayta dublikat yaratilmaydi.
   - `status === 'rejected'`: yozuv o‘chirilmaydi; `failed` holatiga o‘tkazilib, serverdan kelgan `error_code` va tushuntirish foydalanuvchiga ko‘rsatiladi.
4. **Retry va Exponential Backoff**:
   - Tarmoq uzilishi yoki HTTP 5xx xatolarida outbox o‘chirilmaydi; `retry_count` oshirilib, cheklangan exponential backoff (1s, 2s, 4s, 8s, 16s, maks 30s) bilan qayta uriniladi.
   - 5 marta muvaffaqiyatsiz bo‘lsa, yozuv `failed` holatiga o‘tkaziladi va foydalanuvchiga "Qayta urinish" tugmasi taqdim etiladi.
5. **Hisoblar Izolyatsiyasi**:
   - Tizimdan chiqilganda yoki yangi sotuvchi kirganda `syncContext` tozalanadi. So‘rovlar doim faqat joriy `seller_id` ga tegishli outboxni filtrlaydi.

---

## 4. Xavfsizlik va Tokenlar

- Foydalanuvchi paroli hech qachon SQLite yoki qurilmaning oddiy xotirasida saqlanmaydi.
- Supabase sessiya tokenlari va qurilma identifikatori (`device_id`) iOS Keychain va Android Keystore tomonidan shifrlanadigan **Expo SecureStore** da saqlanadi.
- Token muddati tugasa, lokal yozuvlar yo‘qotilmaydi; foydalanuvchidan qayta kirish (re-authentication) so‘raladi.
