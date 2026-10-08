# Chiqim backend va admin

Faqat magazin chiqimlari uchun Supabase Auth + PostgreSQL + RLS + Edge Functions va React/TypeScript/Vite admin paneli. `mobile/`, `docs/mobile/` va root dependency fayllari bu ishga kirmaydi.

## Fayllar

- `backend/supabase/migrations/`: jadvallar, RLS, transaction RPC, audit va hisobotlar.
- `backend/supabase/functions/sync-expenses/`: mobil batch endpoint.
- `backend/supabase/functions/admin-users/`: admin tomonidan Auth seller hisobini yaratish.
- `admin/`: o‘zbekcha panel; magazin/seller boshqaruvi, sana/seller filtri, sahifalash, tahrir/bekor qilish, audit va XLSX.
- `docs/integration-contract.md`: mobil V1 JSON va majburiy magazin konteksti.
- `docs/backend/verification.md`: bajarilgan tekshiruvlar va chegaralar.

## Talablar

Node.js 24 LTS, npm. To‘liq lokal Supabase uchun Docker Desktop (Linux containers) ishlashi kerak. Supabase CLI backend ichida aniq versiya bilan o‘rnatiladi. `backend/` va `admin/` alohida `package.json` va `package-lock.json` ishlatadi.

PowerShell terminalida:

```powershell
cd D:\kirim_chiqim_app\backend
npm.cmd ci
npm.cmd test
npm.cmd run check

cd D:\kirim_chiqim_app\admin
npm.cmd ci
npm.cmd test
```

Windows sandbox `EPERM realpath` bersa, buildni odatiy ruxsatli terminalda bajaring.

## Lokal Supabase

Quyidagi buyruqlar `backend/` ichida bajariladi:

```powershell
npx supabase start
npx supabase db push --local
npx supabase status
```

Yangi lokal stack ochilganda migration start vaqtida ham qo‘llanishi mumkin; `db push --local` faqat hali qo‘llanmagan migrationlarni qo‘llaydi. `db reset` kerak emas. `status` chiqaradigan kalitlarni ommaviy logga qo‘ymang.

`backend/.env.example` dan `backend/.env` yarating va lokal URL/anon/service-role kalitlarini to‘ldiring. Lokal Edge runtime o‘zining `SUPABASE_*` qiymatlarini ham taqdim qiladi. `ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173` qo‘ying. Custom origin o‘zgaruvchisigina kerak bo‘lsa alohida `.env.functions` ishlatish mumkin:

```powershell
npx supabase functions serve --env-file .env
```

`verify_jwt=false` ongli ravishda qo‘yilgan: gateway legacy JWT verifikatoriga bog‘lanmaslik uchun. **Har ikkala handler ichida** `Authorization: Bearer` tokeni `auth.getUser(token)` bilan serverda tekshiriladi, so‘ng faol profil/role o‘qiladi. Anon yoki publishable API keyning o‘zi yetarli emas. DB RPC ham `auth.uid()` va joriy profilni qayta tekshiradi.

## Birinchi administratorni xavfsiz yaratish

1. Supabase Studio/Dashboard Auth → Users orqali o‘zingiz boshqaradigan email uchun kuchli parolli user yarating; tasdiqlangan email ishlating. Ochiq signupni yoqmang. Uning UUID sini oling.
2. Ishonchli Dashboard SQL Editor (yoki lokal postgres egasi) orqali, UUID va ismni almashtirib, quyidagini bir marta bajaring:

```sql
insert into public.profiles (id, full_name, store_id, role, is_active)
values ('AUTH_USER_UUID'::uuid, 'Administrator', null, 'admin', true);
```

3. Admin panelga email/parol bilan kiring. Yangi magazin va sellerlarni paneldan yarating. Sellerlar hech qachon Auth metadata yoki signup orqali admin bo‘lmaydi: avtomatik profil yaratish triggeri yo‘q.
4. Production Dashboard Auth sozlamalarida **Allow new users to sign up** ni o‘chiring; anonymous sign-ins ham yoqilmasin. Lokal `config.toml` buni o‘chiradi; hosted loyihada Dashboard sozlamasini alohida tekshiring.

Service-role keyni brauzer/mobile env, source, screenshot yoki Gitga kiritmang. Uni faqat Edge runtime/serverda saqlang. Bootstrap uchun frontendda service-role ishlatish kerak emas.

## Adminni ishga tushirish

`admin/.env.example` dan `admin/.env` yarating:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_LOCAL_ANON_OR_PUBLISHABLE_KEY
```

```powershell
cd D:\kirim_chiqim_app\admin
npm.cmd run dev
```

Brauzer: `http://localhost:5173`. Kalit/URL berilmasa panel “Ulanishni sozlash kerak” holatini ko‘rsatadi. Auth/DB haqiqatan ulanmaguncha real ma’lumot bor deb ko‘rsatilmaydi.

Faqat dizaynni ko‘rish uchun developmentda **ochiq ravishda** `http://localhost:5173/?demo=1` oching. Banner va o‘zgartirish taqiqi bor. Namunalar DBga yozilmaydi, seed o‘chiq. Production buildda demo rejimi ishlamaydi. Bu rejim backend/Auth integratsiyasini tekshirmaydi.

## Production sozlash va chiqarish

Production deploy bu topshiriq davomida bajarilmadi. Project ref, credentiallar va admin hosting manzili kerak. Credentiallarni chat yoki sourcega yozish o‘rniga lokal environment va Supabase Dashboard Secrets ishlating.

1. Hosted Supabase loyiha yarating, signupni o‘chiring; faqat `public` schema Data APIga chiqsin. `private` schemani exposed schemas ro‘yxatiga qo‘shmang.
2. CLI uchun kerakli loyihaga cheklangan scoped access tokenni xavfsiz environmentda sozlang. Buyruqlarni avval `--help` bilan tekshiring (quyidagilar o‘rnatilgan CLI 2.120.0 yordamida tekshirilgan):

```powershell
cd D:\kirim_chiqim_app\backend
npx supabase db push --project-ref YOUR_PROJECT_REF --dry-run
npx supabase db push --project-ref YOUR_PROJECT_REF
npx supabase db advisors --project-ref YOUR_PROJECT_REF --type all --fail-on error
npx supabase secrets set ALLOWED_ORIGINS=https://YOUR_ADMIN_HOST --project-ref YOUR_PROJECT_REF
npx supabase functions deploy sync-expenses admin-users --project-ref YOUR_PROJECT_REF --use-api
```

Hosted runtime `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ni taqdim qiladi; ularni `secrets set` orqali qayta o‘rnatmang. CORS — brauzer himoyasi, authorization o‘rniga ishlatilmaydi. Mobil native klient Origin sarlavhasiz ishlaydi.

3. Yuqoridagi bootstrap bilan admin profilini yarating.
4. Admin hosting build environmentiga hosted `VITE_SUPABASE_URL` va **publishable key** qo‘ying; bu qiymatlar build vaqtida bundle ichiga yoziladi. Keyingi o‘zgarishda qayta build qiling:

```powershell
cd D:\kirim_chiqim_app\admin
npm.cmd run build
npm.cmd run preview
```

`admin/dist/` statik hostingga joylanadi. Productionda HTTPS va xavfsiz hosting sarlavhalarini sozlang. SPA URL routing ishlatilmagan, sahifalar React state bilan boshqariladi. Yakunda haqiqiy Auth, Edge, RLS va mobile syncni alohida tekshiring.

## Admin RPC

Supabase klient: `rpc('admin_command', {action, data})`. Faqat faol admin. Barcha summalar hisobot JSON da aniq decimal **string**, individual expense amount DBda bigint. Frontend hisoblari `BigInt` ishlatadi.

| action | data |
|---|---|
| `dashboard` | `{}`; stores + today_total + last_synced_at, seller profiles |
| `save_store` | yangi: `{name}`; o‘zgartirish: `{id,name,is_active}` |
| `save_seller` | `{id,full_name,store_id,is_active,expected_assignment_version}`; hisobni yaratish uchun Edge ishlating |
| `report` | `{store_id,from,to,seller_id:null,offset:0,limit:50}`; `{rows,count,total}` |
| `export` | shu filtr; bir DB snapshotda barcha bekor qilinmagan yozuvlar; 10 000 dan oshsa `EXPORT_LIMIT` |
| `edit_expense` | `{id,expected_version,amount_uzs,note,expense_date}` |
| `cancel_expense` | `{id,expected_version}` |
| `admin_record_expense` | `{id,seller_id,store_id,amount_uzs,note,expense_date,occurred_at}`; tarixiy magazin konteksti uchun |

Seller yaratish: `POST /functions/v1/admin-users`, faol admin bearer tokeni bilan `{email,password,full_name,store_id}`. Parol 12..128 belgi. User yaratilib profil saqlanmasa Auth userni cleanup qilishga uriniladi; cleanup ham yiqilsa server logidagi orphan UUID ni operator tekshiradi. Auth API va PostgreSQL o‘rtasida distributed transaction yo‘q. Qayta urinishda email band bo‘lsa qayta hisob yaratilmaydi.

Audit `expense_audit` SELECT orqali faqat admin uchun. Tarixiy yozuvni qo‘lda tiklashda asl mobil `expense.id` ishlating: UUID unique bo‘lgani uchun ikkinchi yozuv yaratilmaydi. Mobileda eski queued operation statusini admin tasdig‘i bilan hal qiling; server avtomatik boshqa magazinga o‘tkazmaydi.

## Hisob va cheklovlar

- “Bugun” serverda `Asia/Tashkent`; jami `expense_date` bo‘yicha, serverga kelish sanasi bo‘yicha emas.
- Bekor qilish `deleted_at` va version oshiradi; audit va asl create fingerprint saqlanadi. Takroriy sync admin tuzatishini qaytarib yozmaydi.
- Har operation bitta RPC transaction: expense, audit va idempotency birgalikda commit/rollback. Unique ID + transaction advisory locks parallel takrorlashni himoya qiladi. Profil/store share lock qayta biriktirish va faolsizlantirish bilan ketma-ketlikni ta’minlaydi.
- Batch qisman muvaffaqiyatsiz bo‘lsa qabul qilingan operationlar commit bo‘ladi, rad qilinganlar aniq acknowledgement oladi; klient xavfsiz qayta yuboradi.
- `device_sync` faqat to‘liq accepted/duplicate batchdan keyin yangilanadi. “Online” emas. Dashboard joriy magazinga biriktirilgan sellerlarning oxirgi muvaffaqiyatli syncini ko‘rsatadi.
- Hisobot sahifasi 50 yozuv; server jami/count barcha filtrlangan yozuvlardan hisoblaydi. XLSX bitta snapshotni oladi va sahifa cheklovi bilan qisqarmaydi. Excel aniq son chegarasidan jami oshsa eksport rad qilinadi, filtrni qisqartiring.
- XSSdan React escaping, spreadsheet formula injectiondan literal string cells himoya qiladi. XLSX eksporti ExcelJS orqali lazy chunkda yuklanadi.
- Katta hajmlar uchun export job va rate limiting kelajakdagi alohida ish; V1 100 operation/128 KiB va 10 000 export yozuvi bilan chegaralangan. Payload tekshiruvi Edge va DB ichida ham bor.

Rasmiy manbalar: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Edge authentication](https://supabase.com/docs/guides/functions/auth), [server-only createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [CLI config](https://supabase.com/docs/guides/local-development/cli/config).
