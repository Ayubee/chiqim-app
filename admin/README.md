# Chiqim admin

React + TypeScript + Vite. Alohida dependency va lockfile.

```powershell
npm.cmd ci
# Lokal Supabase uchun avval backend ichida npm.cmd run local:setup
# Cloud uchun .env.example dan .env.local yarating; faqat haqiqiy loyiha qiymatlari
npm.cmd run check:connection
npm.cmd run dev
```

Kutiladigan nomlar: `VITE_SUPABASE_URL` va `VITE_SUPABASE_PUBLISHABLE_KEY`. Legacy `VITE_SUPABASE_ANON_KEY` ham qabul qilinadi. `admin/.env.local` Gitdan chiqarilgan. Env o‘zgarsa dev serverni qayta boshlang. Secret/service-role kaliti frontend uchun taqiqlangan.

Production: hosting build env sozlang, so‘ng `npm.cmd run build`; natija `dist/`. Tekshiruv: `npm.cmd test`.

Backend va xavfsiz admin bootstrap: [LOCAL_SETUP.md](../backend/LOCAL_SETUP.md). Cloud: [CLOUD_SETUP.md](../backend/CLOUD_SETUP.md). Mobil shartnoma: `../docs/integration-contract.md`.

Panel faqat haqiqiy Supabase Auth, RPC va Edge orqali ishlaydi. `?demo=1` ulanishni chetlab o‘tmaydi. Bo‘sh `stores` ro‘yxati — muvaffaqiyatli javob; tarmoq yoki migration xatosi undan alohida ko‘rsatiladi.
