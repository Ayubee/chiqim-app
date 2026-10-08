# Keyinchalik cloud Supabasega ulash

Hozir cloud loyiha yaratilmagan va deployment bajarilmagan. Lokal DB cloudga avtomatik ko‘chmaydi. Sotuvchi telefonlari uchun cloud HTTPS URL va shu loyihaning ochiq publishable kaliti ishlatiladi.

1. O‘zingizning Supabase hisobingizda aynan Chiqim uchun yangi loyiha yarating. Database parolini parol menejerida saqlang. Auth email/password kirishini yoqing; yangi foydalanuvchilar signupini va anonymous signupni o‘chiring. Data API exposed schemas faqat `public` bo‘lsin, `private` ochilmasin.
2. CLI uchun shu loyihaga cheklangan scoped access tokenni xavfsiz local environmentda sozlang. Kalit/parollarni chatga yoki sourcega yozmang. Loyihaning haqiqiy project ref qiymatini Dashboarddan oling. Quyidagi `<PROJECT_REF>` yozuvlarini shu ref bilan almashtiring. Buyruqlar `backend/` ichida bajariladi:

```powershell
npm.cmd run supabase -- db push --project-ref <PROJECT_REF> --dry-run
npm.cmd run supabase -- db push --project-ref <PROJECT_REF>
npm.cmd run supabase -- db advisors --project-ref <PROJECT_REF> --type all --fail-on error
npm.cmd run supabase -- functions deploy sync-expenses admin-users --project-ref <PROJECT_REF> --use-api
```

Avval dry-run'dagi migrationlarni tekshiring. Mavjud boshqa loyiha bilan aralashtirmang. `db reset` ishlatmang. Shu migration allaqachon qo‘llangan bazada uni qayta SQL Editor'da bajarmang. Lokal ma’lumotlarni cloudga ko‘chirish alohida, tekshiriladigan export/import amali; bu buyruqlar buni bajarmaydi.

3. Admin hostingning haqiqiy HTTPS originini `ALLOWED_ORIGINS` Edge secret sifatida qo‘ying (`supabase secrets set --help` bo‘yicha). Runtime taqdim etadigan `SUPABASE_*` secretlarini qo‘lda frontendga ko‘chirmang. Har bir funksiya bearer access token va faol rolni tekshiradi; `verify_jwt=false` authenticationni o‘chirmaydi.
4. [Lokal yo‘riqnomadagi](LOCAL_SETUP.md#birinchi-admin--standart-parolsiz) Auth user + profil yaratish oqimini **cloud Dashboard**da bajaring. UUID cloud Auth userniki bo‘lsin; lokal UUIDni taxminan ko‘chirmang. Default/hardcoded admin paroli yo‘q.
5. Cloud Dashboard Connect/API Keys bo‘limidan shu loyiha URL va **publishable key** oling. Admin uchun `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` ni hosting build enviga yozing. Lokal `.env.local`ni cloud kalit bilan avtomatik almashtirmang; lokal va production build qiymatlarini ajratib boshqaring. Vite env o‘zgarishida qayta build talab qilinadi:

```powershell
cd D:\kirim_chiqim_app\admin
npm.cmd test
npm.cmd run build
```

Natija `admin/dist/`; HTTPS statik hostingga joylang. Mobil ilovani ishlab chiquvchi ham aynan shu cloud URL va publishable keyni o‘z konfiguratsiyasiga ulashi kerak. Service-role/secret key admin yoki telefon kodiga kirmaydi. Ushbu topshiriqda mobile fayllari o‘zgartirilmaydi.

6. Cloud admin login, magazinlar, haqiqiy chiqimlar, seller provisioning, mobil sync va turli sotuvchilar orasidagi RLSni alohida tekshiring. Bo‘sh cloud baza to‘g‘ri ulangan bo‘lsa magazinlar yo‘qligi ko‘rsatiladi. Auth URL va ochiq kalitning ishlashi o‘zicha DB/RLS/Edge tekshiruvi hisoblanmaydi.

Manbalar: [Supabase local development](https://supabase.com/docs/guides/local-development), [API keys](https://supabase.com/docs/guides/api/api-keys), [Edge authentication](https://supabase.com/docs/guides/functions/auth).
