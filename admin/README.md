# Chiqim admin

React + TypeScript + Vite. Alohida dependency va lockfile.

```powershell
npm.cmd ci
Copy-Item .env.example .env
# .env ichiga haqiqiy URL va publishable/anon kalitini qo‘ying
npm.cmd run dev
```

Production: `.env` yoki hosting build env sozlang, so‘ng `npm.cmd run build`; natija `dist/`. Tekshiruv: `npm.cmd test`.

Backend va xavfsiz admin bootstrap: `../docs/backend/README.md`. Mobil shartnoma: `../docs/integration-contract.md`.

Ixtiyoriy development preview: `http://localhost:5173/?demo=1`. Faqat namunalar, barcha yozish amallari o‘chiq; productionda yo‘q.
