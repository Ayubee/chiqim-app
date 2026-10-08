# Build Yo'riqnomasi — Android APK va iOS

## Talablar

| Asbob | Versiya | O'rnatish |
|-------|---------|-----------|
| Node.js | ≥ 18.x | https://nodejs.org |
| npm | ≥ 9.x | Node bilan birga |
| Expo CLI | ≥ 7.x | `npm i -g expo-cli` |
| EAS CLI | ≥ 10.x | `npm i -g eas-cli` |
| Android Studio | Flamingo+ | Android build uchun |
| Xcode | ≥ 15.x | iOS build uchun (faqat macOS) |

---

## 1. Loyihani o'rnatish

```bash
cd mobile
npm install
cp .env.example .env
```

`.env` faylini to'ldiring:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
EXPO_PUBLIC_USE_MOCK=false
```

---

## 2. Android APK (Test Build)

### A. EAS Cloud Build (Tavsiya etiladi)

```bash
# EAS ga kiring
eas login

# Birinchi marta: loyihani EAS ga ulang
eas init --id REPLACE_WITH_EAS_PROJECT_ID

# Preview APK yaratish (keystore avtomatik yaratiladi)
eas build --platform android --profile preview
```

Build tugagach, APK yuklab olish havolasi ko'rsatiladi. Qurilmaga o'rnatish:
```bash
adb install /path/to/downloaded.apk
# yoki QR kod orqali to'g'ridan-to'g'ri
```

### B. Lokal Build (Android Studio kerak)

```bash
# Java keystore yarating (birinchi marta)
keytool -genkey -v -keystore chiqim-release.keystore \
  -alias chiqim -keyalg RSA -keysize 2048 -validity 10000

# Expo prebuild (native kod yaratadi)
npx expo prebuild --platform android --clean

# Gradle bilan build
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Imzolash (lokal build uchun)

`android/app/build.gradle` da signing konfiguratsiyasi:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../chiqim-release.keystore')
            storePassword System.getenv("KEYSTORE_PASS")
            keyAlias 'chiqim'
            keyPassword System.getenv("KEY_PASS")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

---

## 3. iOS Build

> ⚠️ **Muhim**: iOS build faqat **macOS** da ishlaydi. Haqiqiy qurilmaga o'rnatish uchun **Apple Developer** hisobi (yillik 99 USD) talab qilinadi.

### Apple hisob talablari

| Maqsad | Apple Developer | Xcode Simulator |
|--------|----------------|-----------------|
| Simulatorda test | ✅ Kerak emas | ✅ |
| Haqiqiy qurilma | ✅ Kerak | ✅ |
| TestFlight | ✅ Kerak | — |
| App Store | ✅ Kerak | — |

### A. Xcode Simulatorda (Apple hisob kerak emas)

```bash
# Expo bilan
npx expo run:ios

# yoki
npx expo start --ios
```

### B. Haqiqiy qurilmada (Development)

```bash
# Apple hisob bilan EAS login
eas login

# App Store Connect da bundle ID ro'yxatga oling:
# uz.kirimchiqim.mobile

# Development profil yarating
eas device:create  # qurilma UDID ro'yxatga olish
eas build --platform ios --profile development
```

### C. TestFlight (Ad Hoc Distribution)

```bash
# eas.json da ios preview profili:
# "ios": {"simulator": false}
eas build --platform ios --profile preview
# EAS avtomatik signing sertifikatlarini boshqaradi

# Build tayyor bo'lgach TestFlight ga yuklash
eas submit --platform ios
```

### D. Lokal Xcode Build

```bash
# Expo prebuild
npx expo prebuild --platform ios --clean

# CocoaPods o'rnatish
cd ios && pod install && cd ..

# Xcode da ochish
open ios/KirimChiqimMobile.xcworkspace
```

Xcode da:
1. **Signing & Capabilities** → Team tanlang
2. **Bundle Identifier**: `uz.kirimchiqim.mobile`
3. **Scheme** → `KirimChiqimMobile`
4. Qurilma tanlang → ▶ Run

---

## 4. app.json ni yangilash

`mobile/app.json` da quyidagilarni to'ldiring:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR_ACTUAL_EAS_PROJECT_ID"
      }
    }
  }
}
```

EAS project ID olish:
```bash
eas init
# yoki https://expo.dev loyiha yaratish
```

---

## 5. Real Backendga Ulash

1. Supabase loyiha yarating: https://supabase.com
2. `docs/integration-contract.md` dagi jadvallarni yarating
3. `sync-expenses` Edge Function deploy qiling
4. `.env` ni to'ldiring:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
   EXPO_PUBLIC_USE_MOCK=false
   ```
5. Supabase Auth → Email login yoqing, signup o'chiring
6. Admin orqali seller hisob yarating

---

## 6. Tekshiruvlar Ro'yxati

### ✅ Mock bilan tekshirilgan

- [x] Offline chiqim yaratish va lokal saqlash
- [x] Ilovani qayta ochganda yozuv saqlanishi (SQLite)
- [x] Bir marta bosish = bitta yozuv (idempotent save)
- [x] Nol/manfiy summa rad qilinishi
- [x] Bo'sh izoh rad qilinishi
- [x] Kelajak sana rad qilinishi
- [x] Toshkent vaqti zoni hisobi
- [x] Kalendar jamilari (oylik)
- [x] Tanlangan sana xarajatlari
- [x] Sync status ko'rsatish (pending/synced/failed)
- [x] Profil ma'lumotlari ko'rsatish
- [x] Logout ogohlantirishи (pending yozuvlar bor bo'lsa)
- [x] Session eslab qolish

### 🔲 Real qurilmada tekshirilishi kerak

- [ ] Internet qaytganda avtomatik sync
- [ ] Foreground qa qaytganda sync
- [ ] Token muddati tugashi va qayta autentifikatsiya
- [ ] Server accepted/duplicate holati — takror yozuv yo'qligi
- [ ] Qisman muvaffaqiyatli batch (bir qismi accepted, biri rejected)
- [ ] Sync vaqtida yangi chiqim qo'shish
- [ ] Admin tahrirlagan yozuvning mobilda yangilanishi
- [ ] Hisob almashish — eski request yangi bazaga ta'sir qilmasligi
- [ ] Push notification (bu versiyada yo'q)
- [ ] Kichik/katta ekran (safe area, klaviatura)
- [ ] iPhone SE va iPad layout
- [ ] Katta shrift (Accessibility text size)

### 🚫 Integration Blocker (Shartnoma bilan farqlar)

Hozircha `docs/integration-contract.md` bilan to'liq mos keladi — V1 shartnomasi qo'llanilgan:
- `X-Store-Id` va `X-Store-Assignment-Version` sarlavhalari ✅
- `assignment_version` lokal saqlash ✅  
- Batch context tekshiruvi (bir xil store+version) ✅
- `duplicate` holati = `accepted` kabi `synced` belgilash ✅
- `last_synced_at` faqat to'liq muvaffaqiyatli batchdan keyin ✅

---

## 7. Muammolar va Yechimlar

### "Metro bundler error: Cannot find module..."
```bash
npm install
npx expo start --clear
```

### iOS CocoaPods xatosi
```bash
cd ios
pod deintegrate
pod install
```

### Android Gradle build muvaffaqiyatsiz
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### SQLite migration xatosi
```bash
# DB ni tozalash (faqat development):
# Settings → App info → Clear Data
```
