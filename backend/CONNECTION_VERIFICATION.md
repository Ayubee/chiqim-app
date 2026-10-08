# Ulanishni tuzatish hisoboti — 2026-10-09

## Aniq sabab va hozirgi chegara

Admin kutilgan `VITE_SUPABASE_URL` va `VITE_SUPABASE_PUBLISHABLE_KEY` qiymatlarini olmagan: admin/backend ichida faqat `.env.example` mavjud. Haqiqiy `.env.local`, loyiha process env qiymatlari yoki linked project ref topilmadi. Foydalanuvchi cloud Supabase loyiha yaratmaganini tasdiqladi.

Supabase CLI 2.120.0 o‘rnatilgan. Docker va Podman PATHda topilmadi; Docker Desktopning Program Files va LOCALAPPDATA standart o‘rnatish yo‘llarida ham yo‘q. `wsl --version` WSL o‘rnatilmaganini bildirdi. Windows 11 Pro va taxminan 31 GB RAM bor; firmware virtualization CIM bo‘yicha yoqilgan. Lokal Supabase API 54321 portida ishlamayapti. Docker/WSL o‘rnatilmagan sharoitda haqiqiy kalit, Auth user yoki serverdagi migration holatini olish imkoni yo‘q.

Soxta env, boshqa loyiha kaliti, yangi cloud loyiha yoki standart parol yaratilmagan. Mavjud DB reset qilinmagan, ma’lumot o‘chirilmagan. Haqiqiy login, bazadan magazin/chiqim yuklash va ishlayotgan Edge runtime sinovi hali bajarilmagan.

## Tuzatilgan fayllar

- `admin/src/config.ts`, `.env.example`, `vite.config.ts`: aniq env nomlari, `.env.local` yo‘li, legacy anon alias, URL/key tekshiruvi; service-role/secret kalit, noto‘g‘ri yoki namuna qiymatlar builddan oldin rad etiladi. Faqat kerakli env maydonlari klientga uzatiladi.
- `admin/src/auth.ts`, `App.tsx`, `format.ts`: Supabase email/password Auth; serverda `getUser` orqali sessiya tasdig‘i; profil aynan shu Auth ID, admin rol va faol holatga tekshiriladi. Konfiguratsiya, tarmoq, noto‘g‘ri parol, admin huquqi, yetishmagan schema va bo‘sh magazinlar alohida ko‘rsatiladi. Logout/sessiya almashishida yuklash holati boshqariladi.
- `admin/src/api.ts`: dashboard va chiqimlar faqat haqiqiy RPCdan, audit DBdan, seller yaratish Edge Functiondan. Demo parametriga ko‘ra soxta ma’lumot yoki admin sessiyasi berilmaydi. SQL biznes xatolari saqlanadi; schema/tarmoq xatolari alohida talqin qilinadi.
- `admin/scripts/check-connection.mjs`, `package.json`: kalitni ko‘rsatmasdan Auth serverga ochiq ulanish tekshiruvi.
- `backend/scripts/setup-local.mjs`, `package.json`: Docker preflight, shu loyihaning `start` va `db push --local` buyruqlari; CLI chiqishi maxfiy holda olinadi, faqat haqiqiy lokal URL/ochiq kalit ignored admin envga yoziladi. Mavjud boshqa env almashtirilmaydi. `local:functions` buyrug‘i ham qo‘shildi.
- `backend/scripts/diagnostics.sql`: DB egasi uchun read-only jadvallar, RLS, funksiyalar va admin soni tekshiruvi.
- Admin/backend README, `LOCAL_SETUP.md`, `CLOUD_SETUP.md`: Windows dasturlari, standart parolsiz Studio Auth + bog‘langan admin profili, dev serverni restart qilish, haqiqiy tekshiruv va kelajakdagi cloud ulanish yo‘riqnomalari.
- `admin/tests/connection.test.mjs`, `backend/tests/database.test.mjs`: ulanish xatolari, privilegiyali kalitlarni rad etish, Auth/profil bog‘lanishi va bo‘sh baza javoblari tekshiruvi.

## Bajarilgan tekshiruvlar

- Admin: 8 test o‘tdi. TypeScript va production build o‘tdi; haqiqiy yoki taxminiy env kiritilmasdan qurildi. Excel eksportining lazy chunk hajmi haqida Vite ogohlantirishi bor, build xatosi yo‘q.
- Backend: 18 test o‘tdi, `tsc --noEmit` o‘tdi. Migration PGlite PostgreSQL test muhitida bajarildi: jadvallar/RLS, seller izolyatsiyasi, huquqni o‘zboshimcha oshirish taqiqi, sync/audit/idempotency va hisobot tekshirildi. Yangi bo‘sh bazada admin dashboard `{stores: [], profiles: []}` qaytardi.
- Bu testlarning izolatsiyalangan fixture/mocklari haqiqiy Supabase Auth, gateway yoki Deno Edge runtime ishlashini tasdiqlamaydi.
- `local:setup` bajarib ko‘rildi: Docker yo‘qligini aniq bildirdi; env yaratish/migration bosqichiga o‘tmadi. `check:connection` ikki yetishmayotgan env nomini ko‘rsatdi.
- Eski admin Vite serveri to‘xtatilib, `127.0.0.1:5173` da qayta ishga tushirildi. Brauzerda konfiguratsiya yetishmasligi ko‘rildi; `?demo=1` ham shu ekran bilan qoldi.
- Env ignore qoidalari tekshirildi. Kalit yoki parol terminal/hisobot/Gitga yozilmadi. Bu ishdagi fayl o‘zgarishlari faqat admin/backend ichida; boshqa agentning mobile/docs o‘zgarishlariga tegilmadi.

## Qolgan ish

Foydalanuvchi [LOCAL_SETUP.md](LOCAL_SETUP.md) bo‘yicha WSL 2 va Docker Desktopni o‘rnatib ishga tushirishi kerak. Keyin `backend` ichida `npm.cmd run local:setup`, alohida terminalda `npm.cmd run local:functions`; Studio orqali noyob parolli admin Auth user va profil; admin server restart va haqiqiy login/data sinovi qoladi. Mavjud bo‘lmagan cloud URL yoki kalit qayta so‘ralmaydi. Lokal server internetga deploy qilingan emas; telefonlar uchun [CLOUD_SETUP.md](CLOUD_SETUP.md) alohida bajariladi.
