# Tekshiruv natijalari

2026-10-09 (Asia/Tashkent). Source `backend/`, `admin/`, `docs/backend/`, `docs/integration-contract.md` ichida yaratildi. Dastlab workspace bo‘sh, Git repository va AGENTS.md yo‘q edi. Mobile va root dependency fayllari yaratilmagan/o‘zgartirilmagan.

## Avtomatik tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| Backend `npm.cmd test` | 17/17 pass (parent test + 11 DB holati + 5 HTTP holati) |
| Backend `npm.cmd run check` | TypeScript noEmit muvaffaqiyatli |
| Admin `npm.cmd test` | 5/5 pass |
| Admin `npm.cmd run build` | TypeScript + Vite production bundle muvaffaqiyatli; sozlanmagan env va xavfsiz placeholder env bilan tekshirildi |
| Backend `npm.cmd audit --json` | 0 ma’lum vulnerability |
| Admin `npm.cmd audit --json` | 0 ma’lum vulnerability |

DB testlari mock SQL emas: PGlite ichidagi PostgreSQL dvigateliga migration to‘liq qo‘llanadi, `authenticated`/`anon` rollari, haqiqiy RLS, PL/pgSQL RPC va triggerlar ishlaydi. Supabase `auth.users` va `auth.uid()` uchun minimal test fixture bor; haqiqiy GoTrue/Auth servisi ishlatilmagan.

Tekshirilgan holatlar:

- Boshqa seller expense/profil/store/audit ma’lumotini o‘qiy olmaydi.
- Profile role/store o‘zgartirish, table insert/update/delete va admin RPC orqali vakolat oshirish rad qilinadi; anon RPC ishlata olmaydi.
- Aynan bir xil operation/expense qayta yuborilsa duplicate; boshqa mazmun conflict; jami oshmaydi.
- Qisman bajarilgan syncdan keyin retry; noma’lum operation bilan last_synced_at yangilanmaydi.
- Expense insertdan so‘ng sun’iy trigger xatosida expense/audit/idempotency to‘liq rollback; keyingi retry qabul qilinadi.
- Toshkent kuni 19:00 UTC da almashadi; bugun yuborilgan kechagi expense kechagi jamiga kiradi.
- Bir magazindagi ikki seller jami to‘g‘ri.
- Noto‘g‘ri summa, izoh, sana, vaqt va yetishmagan magazin konteksti rad qilinadi.
- Admin edit versiyani oshiradi; eski versiya yozuvni ustidan yozmaydi; bekor qilish jamidan chiqaradi, audit saqlanadi.
- Admin tuzatishidan keyin original create retry eski qiymatlarni qaytarmaydi, joriy version bilan duplicate bo‘ladi.
- Magazin almashishi va oldingi magazinga qaytishi eski queued create’ni rad qiladi; avvalgi accepted create duplicate bo‘lib qoladi.
- Faolsiz seller/store yangi expense yubora olmaydi. Faolsiz magazindagi seller hisobini ham admin faolsizlantira oladi.
- Admin tarixiy magazinga asl UUID bilan auditli expense kirita oladi.
- SQL hisobot sahifasidan tashqari yozuvlarni ham jami/countga oladi; export bekor qilingan yozuvlarni olmaydi va haqiqiy snapshot jamini beradi.
- HTTP har operation uchun acknowledgement beradi, RPC transport xatosidan keyin qolgan operationlarni davom ettiradi; qisman xato batch last_syncni belgilamaydi.
- HTTP origin, method/preflight, body hajmi, envelope, role va auth error holatlari.
- Seller Auth user yarata olmaydi; admin request validatsiyasi; profil saqlanishida DB yoki transport xatosi bo‘lsa yaratilgan Auth user cleanup qilinadi.
- XLSX write/read round-trip: raqamli summa, raqamli jami, literal formula ko‘rinishidagi izoh, filter, freeze panes, sarlavha, seller va Toshkent vaqti. Bekor qilinganlar olinmaydi. Aniqlik chegarasidan oshgan jami rad qilinadi.
- Frontend BigInt jami va o‘zbekcha sana browser CLDRga bog‘liq emas.

## Brauzer tekshiruvi

Developmentdagi **faqat ko‘rgazma** rejimida:

- Magazinlar sahifasi, ko‘p sotuvchili magazin, magazin tafsilotlari va sotuvchilar ro‘yxati ochildi.
- Seller filtri 285 000 so‘mdan Aziz Karimovning 130 000 so‘mlik ikki yozuviga ajratdi.
- XLSX haqiqatan brauzerdan yuklandi. Fayl ExcelJS bilan qayta o‘qildi: `F5 = 85000`, `F7 = 130000`, `autoFilter = A4:F6`, 7 qator.
- Sana filtri oldingi kunda 0 natija va bo‘sh holatni ko‘rsatdi. Teskari sana oralig‘i aniq xato berdi.
- Seller qidiruvi besh hisobdan “Aziz” bo‘yicha bitta natija qoldirdi.
- Oy nomi ayrim brauzerlarda `M10` chiqishi topilib, aniq o‘zbekcha formatga tuzatildi.
- Ko‘rgazmada barcha yozish amallari o‘chirilgan; demo banner ko‘rinadi.
- Oddiy URL da env yo‘qligi “Ulanishni sozlash kerak” va “Haqiqiy ma’lumotlar hali yuklanmagan” holatini ko‘rsatishi brauzerda tasdiqlandi.

Panel ko‘rinishi: [admin-demo.jpg](screenshots/admin-demo.jpg). Bu haqiqiy production ma’lumotlari emas.

Parallel yaratilgan mobile kodi faqat o‘qib tekshirildi: `syncService.ts` endpoint, JSON request va `X-Store-Id`/`X-Store-Assignment-Version` sarlavhalarini shartnomaga mos yuboradi; `authService.ts` profildagi `assignment_version` ni o‘qiydi. Mobile fayllari tahrirlanmadi. Bu statik moslik tekshiruvi; mobil build yoki live end-to-end sinovi emas.

## Chegaralar va bajarilmagan tashqi tekshiruvlar

- Docker/Podman o‘rnatilmagan. `supabase start` konfiguratsiyani o‘qib, `DockerLifecycleInspectError: docker: command not found (podman also not found)` bilan tugadi. To‘liq lokal Supabase stack va local advisors ishlatilmadi.
- Haqiqiy Supabase project URL/ref, credential, admin Auth user va hosting manzili berilmagan. Remote migration, Edge deploy, live login, haqiqiy mobil/Auth/Edge end-to-end sinovi va production deploy bajarilmadi.
- Deno runtime bu muhitda yo‘q. Edge handlerlar Node 24 native TypeScript orqali test qilindi va TS declaration bilan typecheck qilindi; haqiqiy Deno Edge runtime sinovi deploy/lokal Docker keyin bajariladi.
- PostgreSQL lock/unique qoidalari kodda bor va duplicate/version holatlari test qilingan. Ko‘p alohida DB connection bilan parallel load testi PGlite suite doirasida bajarilmagan.
- ExcelJS lazy export bundle taxminan 939 kB minified, faqat eksport bosilganda yuklanadi; Vite bu chunk hajmi uchun ogohlantiradi.
- Oxirgi production bundle integratsiya kodini tekshirish uchun **ishlamaydigan, maxfiy bo‘lmagan placeholder env** bilan yig‘ilgan. Uni productionga joylamang: haqiqiy env bilan qayta build qiling.

Keyingi tashqi tekshiruv uchun [README.md](README.md) dagi lokal/hosted setup, bootstrap va deployment qadamlarini bajaring.
