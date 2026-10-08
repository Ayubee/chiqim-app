# Chiqim backend

Supabase migratsiya, RLS, audit, idempotent sync va serverdagi seller provisioning.

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run check
```

Joriy lokal sozlash, Docker/WSL talablari va xavfsiz admin bootstrap: [LOCAL_SETUP.md](LOCAL_SETUP.md).
Keyinchalik sotuvchi telefonlari uchun cloud: [CLOUD_SETUP.md](CLOUD_SETUP.md).
`npm.cmd run local:setup` mavjud ma’lumotlarni reset qilmasdan lokal backend va admin envni tayyorlaydi; Docker ishlashi kerak.
Jadvallar/RLS/RPCni faqat o‘qib tekshirish: `scripts/diagnostics.sql`.
Avvalgi API arxitekturasi: `../docs/backend/README.md` (joriy ulanish uchun yuqoridagi yo‘riqnomadan foydalaning).
Mobil API: `../docs/integration-contract.md`.
