# Windowsda haqiqiy lokal Supabase

2026-10-09 tekshiruvi: Node/npm va loyiha ichidagi Supabase CLI 2.120.0 mavjud. Docker/Podman topilmadi (PATH va Docker Desktopning odatiy umumiy/per-user kataloglari tekshirildi). `wsl --version` WSL o‘rnatilmaganini bildirdi. Windows 11 Pro, taxminan 31 GB RAM. Lokal API 54321 portida ishlamayapti; haqiqiy Auth login hali tekshirilmagan. Hozir `.env.local` uchun haqiqiy kalit yo‘q.

## Bir marta o‘rnatish

1. Administrator sifatida ochilgan PowerShell'da `wsl --install` bajaring, Windows so‘rasa qayta yuklang. So‘ng `wsl --update` va `wsl --version` bilan tekshiring. WSL 2.1.5 yoki yangiroq kerak. Virtualizatsiya talab qilinsa Task Manager → Performance → CPU dagi Virtualization holatini tekshiring va BIOS/UEFI orqali yoqing.
2. [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) o‘rnating. WSL 2 backend va Linux containers ishlating. Docker Desktopni ochib, engine ishga tushishini kuting. Yangi terminalda `docker info --format '{{.OSType}}'` natijasi `linux` bo‘lsin.

Microsoft yo‘riqnomasi: [WSL o‘rnatish](https://learn.microsoft.com/en-us/windows/wsl/install). Ushbu ish davomida Windows komponentlari o‘rnatilmadi yoki o‘zgartirilmadi.

## Backend va admin env

```powershell
cd D:\kirim_chiqim_app\backend
npm.cmd ci
npm.cmd run local:setup
```

`local:setup` faqat ushbu katalogdagi Supabase loyihasini ishga tushiradi; yangi bazada migrationlar start vaqtida, keyingi migrationlar `db push --local` orqali qo‘llanadi. Seed o‘chiq. Skript `db reset` bajarmaydi, volume yoki ma’lumot o‘chirmaydi. CLI start/status chiqishidagi maxfiy qiymatlar terminalga uzatilmaydi.

Skript CLI statusidan haqiqiy **lokal** API URL va publishable yoki legacy anon kalitini olib `admin/.env.local` yaratadi. Bu fayl admin `.gitignore` ichida; service-role kaliti unga yozilmaydi. Mavjud, boshqa mazmundagi `.env.local` avtomatik almashtirilmaydi. CLI/Docker xatosida env uchun taxminiy qiymat yozilmaydi. Ilk ishga tushirish internetdan Docker imagelarini yuklaydi va vaqt olishi mumkin.

Edge Functions uchun alohida terminalni ochiq qoldiring:

```powershell
cd D:\kirim_chiqim_app\backend
npm.cmd run local:functions
```

Bu `sync-expenses` va `admin-users` funksiyalarini lokal xizmatga beradi. Lokal runtime `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` beradi; ularni frontendga ko‘chirmang. Standart CORS localhost/127.0.0.1:5173 ga ruxsat beradi. `verify_jwt=false` gateway sozlamasiga qaramay, ikkala handler serverda `auth.getUser(token)`, faol profil va rolni tekshiradi; RLS/RPC himoyasi saqlangan.

## Birinchi admin — standart parolsiz

1. Lokal Studio `http://127.0.0.1:54323` → Authentication → Users → Add user orqali o‘zingizning emailingiz va o‘zingiz tanlagan noyob kuchli parol bilan Auth user yarating. Emailni tasdiqlangan qilib yarating. Parolni kod, env yoki SQL fayliga yozmang. Ochiq signupni yoqmang.
2. Shu foydalanuvchining UUID sini oling. Studio SQL Editor'da quyidagini bajaring, faqat UUID o‘rnini haqiqiy Auth UUID bilan almashtiring. Bu yangi admin profili qo‘shadi; mavjud profil bo‘lsa xato bilan to‘xtaydi va uni yashirincha admin qilmaydi:

```sql
insert into public.profiles (id, full_name, store_id, role, is_active)
select id, 'Administrator', null, 'admin', true
from auth.users where id = 'AUTH_USER_UUID'::uuid
returning id, role, is_active;
```

Natija aynan bitta satr bo‘lsin: `id = Auth user UUID`, `role = admin`, `is_active = true`. Natija nol bo‘lsa UUID noto‘g‘ri. Profile ID tashqi kalit bilan `auth.users.id` ga bog‘langan. Mavjud hisobni o‘zgartirish zarur bo‘lsa avval uning kimga tegishli ekanligini alohida tekshiring.

3. Dev server avval ochilgan bo‘lsa Ctrl+C bilan to‘xtating, qayta boshlang:

```powershell
cd D:\kirim_chiqim_app\admin
npm.cmd run check:connection
npm.cmd run dev -- --port 5173 --strictPort
```

Brauzer: `http://127.0.0.1:5173`. `check:connection` faqat Auth serveri ochiq kalitni qabul qilishini tekshiradi; login/RLS/Edge tekshiruvi o‘rnini bosmaydi. Dev server qayta boshlanganidan keyin yuqoridagi email/parol bilan kiring.

## Haqiqiy tekshiruv

- Yangi, bo‘sh bazada admin kirgach “Magazinlar hali yo‘q” ko‘rinishi kerak. Bu ulanish xatosi emas.
- Kerakli haqiqiy magazinni paneldan yarating; yangilaganda DBdan qayta yuklansin. “Sotuvchi qo‘shish” orqali noyob email va o‘zingiz tanlagan parol bilan seller yarating — bu `admin-users` Edge Functionni ham tekshiradi.
- Chiqimni paneldagi qo‘lda kiritish yoki sotuvchi sync oqimi orqali yarating, so‘ng magazin hisoboti, sana filtri va sahifani qayta ochishda saqlangan summa/izohni tekshiring. Kirim yoki balans yo‘q. Sinov yozuvlarini kiritish ongli operator amali; avtomatik demo seed yo‘q.
- `backend/scripts/diagnostics.sql` ni ishonchli Studio SQL Editor'da bajaring: jadvallar, RLS, RPC va faol admin sonini ko‘rsatsin. `npm.cmd run supabase -- migration list --local` bilan migration tarixini tekshiring. Baza yo‘q bo‘lsa faqat fayllar mavjudligi tekshirilgan hisoblanadi.
- Docker o‘chirilganda server xatosi; noto‘g‘ri parolda login xatosi; seller bilan kirishda admin huquqi xatosi ko‘rinsin. RLSni o‘chirib tekshirmang.

Lokal server ushbu kompyuter uchun ishlab chiqish muhiti. Internetga deploy qilinmagan. Sotuvchilarning telefonlarida `127.0.0.1` telefonning o‘zini anglatadi; keyingi foydalanish uchun [cloud yo‘riqnomasi](CLOUD_SETUP.md) bo‘yicha alohida Supabase loyihasi kerak.
