# Chiqim — Mobil Ilova

React Native + Expo + TypeScript bilan qurilgan magazin chiqimlarini hisoblash ilovasi.

## Texnik Stek

- **Expo SDK 51** + **React Native 0.74**
- **TypeScript** (strict mode)
- **expo-sqlite** — lokal ma'lumotlar bazasi
- **expo-secure-store** — session tokenlari
- **@supabase/supabase-js** — backend auth va RLS
- **@react-navigation/native** + **bottom-tabs** — navigatsiya

## Tuzilish

```
mobile/
├── App.tsx                    # Asosiy kirish nuqtasi
├── app.json                   # Expo konfiguratsiyasi
├── eas.json                   # EAS Build konfiguratsiyasi
├── package.json               # Alohida dependencies
├── tsconfig.json              # TypeScript sozlamalari
├── babel.config.js
├── expo-env.d.ts
├── .env.example               # Muhit o'zgaruvchilari namunasi
├── assets/                    # Ikonkalar va splash screen
├── src/
│   ├── constants/             # Tema, ranglar, konstantalar
│   ├── types/                 # TypeScript interfeyslari
│   ├── utils/                 # Yordam funksiyalari (sana, validatsiya, uuid)
│   ├── db/                    # SQLite ma'lumotlar bazasi
│   ├── services/              # API, Auth, Sync xizmatlari
│   ├── context/               # React Context (Auth, Expense)
│   ├── components/            # Qayta ishlatiladigan UI komponentlar
│   ├── screens/               # Ekranlar
│   └── navigation/            # Navigatsiya
└── __tests__/                 # Testlar
```

## O'rnatish

```bash
cd mobile
npm install
cp .env.example .env
# .env fayliga Supabase URL va kalitni kiriting
```

## Ishga tushirish

```bash
# Development
npm start

# Android qurilmada
npm run android

# iOS simulatorda
npm run ios
```

## Muhit O'zgaruvchilari

`.env.example` dan nusxa oling va `.env` faylini to'ldiring:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
EXPO_PUBLIC_USE_MOCK=false
```

⚠️ **Muhim**: `.env` faylini git-ga yuklash taqiqlanadi. Hech qachon `service_role` kalitini mobil ilovaga qo'shmang.

## Mock Rejimi (Faqat Development)

`.env` da `EXPO_PUBLIC_USE_MOCK=true` qo'yilsa, real backend o'rniga mock API ishlatiladi. Bu `__DEV__` muhitida ishlaydi — production buildda avtomatik o'chiriladi.

## Testlar

```bash
npm test
npm run type-check
```

## Build (docs/mobile/BUILD_GUIDE.md ga qarang)
