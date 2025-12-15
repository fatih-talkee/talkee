# 🔧 APK Build - Environment Variables Sorunu

## 🚨 Sorun

APK build'inde environment variables (`EXPO_PUBLIC_*`) dahil edilmemiş olabilir, bu yüzden app crash ediyor.

## ✅ Çözüm 1: app.json'da extra Field (Önerilen)

`app.json` dosyasına `extra` field'ı ekleyin:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://hmimorflmdhcgjhlxbwn.supabase.co",
      "supabaseAnonKey": "YOUR_ANON_KEY_HERE",
      "stripePublishableKey": "pk_test_..."
    }
  }
}
```

Sonra `lib/supabase.ts` dosyasını güncelleyin:

```typescript
import Constants from 'expo-constants';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  '';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  '';
```

## ✅ Çözüm 2: app.config.js Kullan (Daha İyi)

`app.json` yerine `app.config.js` kullanın (dynamic config):

```javascript
// app.config.js
export default {
  expo: {
    name: 'Talkee',
    // ... diğer config'ler
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
  },
};
```

## ✅ Çözüm 3: Build Sırasında Environment Variables Yükle

Build yapmadan önce:

```bash
# .env dosyasını kontrol et
cat .env

# Clean build
cd android
./gradlew clean

# Build (Expo otomatik olarak .env'i okur)
./gradlew assembleRelease
```

## 🔍 Debug: Environment Variables Kontrol

App başlangıcında log ekleyin:

```typescript
// lib/supabase.ts
console.log('🔍 Environment Check:');
console.log(
  'SUPABASE_URL:',
  process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅' : '❌'
);
console.log(
  'SUPABASE_ANON_KEY:',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'
);
```

Logları görmek için:

```bash
adb logcat | grep "Environment Check"
```

## 📝 Hızlı Test

1. `lib/supabase.ts` dosyasına log ekleyin
2. APK'yı yeniden build edin
3. App'i açın
4. Logları kontrol edin:
   ```bash
   adb logcat | grep -i "environment\|supabase"
   ```

## 🎯 Önerilen Çözüm

**app.config.js** kullanın - bu en güvenilir yöntem!
