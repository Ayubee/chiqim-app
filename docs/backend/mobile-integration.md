# Mobile ulanishi

Umumiy V1: [integration-contract.md](../integration-contract.md). Mobile fayllarini backend/admin ishlab chiqish jarayoni o‘zgartirmaydi.

## Environment

Joriy Expo mobile `.env` qiymatlari:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_USE_MOCK=false
```

Lokal server uchun real telefon `127.0.0.1` orqali kompyuterdagi Supabasega ulanmaydi. Kompyuterning LAN IP manzilini ishlating, Docker gateway porti telefondan ko‘rinadigan bo‘lsin. Android emulatorda host odatda `10.0.2.2:54321`; qurilma/network sharoitini tekshiring. Hosted HTTPS URL qurilmalar uchun bir xil ishlaydi. Secret/service-role key mobilega berilmaydi.

## Ketma-ketlik

1. Backend migration va ikkala Edge Functionni sozlang. Admin bootstrapni bajaring; paneldan magazin/seller hisobini yarating.
2. Mobil Supabase Auth email/password bilan kirsin. Tokenning seller useriga tegishli ekanligi serverda `getUser` bilan tekshiriladi.
3. RLS orqali joriy profilni (`id,full_name,store_id,role,is_active,assignment_version`) va magazinni (`id,name,is_active`) o‘qing.
4. Yozuv lokal yaratilganda UUID, stable operation UUID, xarajat sanasi, occurred_at va o‘sha paytdagi `store_id/assignment_version` saqlansin. ID va kontekst retryda yangilanmasin.
5. Bir xil kontekstdagi navbat yozuvlarini batch qiling. `POST /functions/v1/sync-expenses` da JWT, `apikey`, JSON va ikki kontekst headerini yuboring. Maximum 100 operation/128 KiB; katta izohlar bilan batchni byte hajmi bo‘yicha ham ajrating.
6. Har acknowledgementni operation_id **va expense_id** bilan moslashtiring. Accepted/duplicate va haqiqiy version bo‘lgandagina synced qiling. Missing acknowledgement yoki HTTP errorni muvaffaqiyat deb qabul qilmang. `INTERNAL_ERROR`/HTTP 5xx/transport xatosida xuddi o‘sha so‘rov bilan backoff retry qiling.
7. `STORE_ASSIGNMENT_CHANGED` bo‘lsa eski yozuvni yangi kontekst bilan qayta yubormang. Admin eski magazinni ochib asl UUID bilan auditli qo‘lda kiritadi; keyin mobil navbat operator tasdig‘i bilan arxivlanadi.
8. `INACTIVE_PROFILE`, `INACTIVE_STORE`, 401/403 holatlarida yangi syncni to‘xtating, operatorga tushunarli sabab ko‘rsating. Eski lokal yozuvlarni yo‘qotmang.

## Endpoint

```text
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-expenses
Authorization: Bearer <seller_access_token>
apikey: <publishable_key>
Content-Type: application/json
X-Store-Id: <saved_store_uuid>
X-Store-Assignment-Version: <saved_assignment_version>
```

Request/response shakli umumiy shartnomada. `server_time` UTC, kunlik hisob `expense_date` va Asia/Tashkent bo‘yicha. `last_synced_at` to‘liq muvaffaqiyatli batchdan keyin DB tomonidan belgilanadi; haqiqiy online holatini anglatmaydi.

## Real integratsiya sinovi

Credentiallar sozlangandan keyin test magazin/seller bilan bajaring:

- Bitta expense yuboring va accepted/version=1 oling; aynan takrorini yuborib duplicate oling; admin jami oshmasin.
- Internetni uzib retry qiling; yangi UUID yoki operation_id yaratilmang.
- Kechagi expense bugungi syncda kechagi filtrda ko‘rinsin.
- Sellerni boshqa magazinga biriktiring; eski kontekstdagi yangi create rejected/STORE_ASSIGNMENT_CHANGED olsin.
- Sellerni faolsizlantiring; eski JWT bo‘lsa ham yozuv qabul qilinmasin.
- Admin tahrir/bekor qilishdan keyin original request retry duplicate va joriy version qaytarsin, tahrir yo‘qolmasin.

Bu live sinovlar credentiallar bo‘lmagani uchun hozir bajarilmagan. Mahalliy avtomatik DB/HTTP tekshiruvlari [verification.md](verification.md) da.
