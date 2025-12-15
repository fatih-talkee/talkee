# 🐛 APK Crash Debug Rehberi

## 🔍 Hızlı Log Kontrolü

### Yöntem 1: ADB Logcat (En Hızlı)

```bash
# Tüm logları göster
adb logcat

# Sadece hataları göster
adb logcat *:E

# React Native logları
adb logcat | grep -i "react\|expo\|error"

# Crash loglarını göster
adb logcat | grep -i "fatal\|exception\|crash"
```

### Yöntem 2: Filtrelenmiş Loglar

```bash
# Sadece Talkee app logları
adb logcat | grep -i "talkee"

# Son 100 satır
adb logcat -t 100

# Temizle ve baştan başla
adb logcat -c && adb logcat
```

---

## 🚨 Yaygın Crash Nedenleri

### 1. Environment Variables Eksik

**Hata:** `EXPO_PUBLIC_SUPABASE_URL is not defined`

**Çözüm:**

- `.env` dosyası build'e dahil edilmemiş olabilir
- `app.json` veya `app.config.js`'de environment variables kontrol et

### 2. Stripe Key Eksik

**Hata:** `Stripe publishable key is not defined`

**Çözüm:**

- `.env` dosyasında `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` var mı?
- Build sırasında environment variables yüklenmiş mi?

### 3. Native Module Hatası

**Hata:** `Native module not found`

**Çözüm:**

- Native dependencies rebuild gerekebilir
- `cd android && ./gradlew clean && ./gradlew assembleRelease`

### 4. Network Permission

**Hata:** `Network request failed`

**Çözüm:**

- `AndroidManifest.xml`'de internet permission var mı kontrol et

---

## 🔧 Adım Adım Debug

### Adım 1: Logları Al

```bash
# Terminal'de çalıştır
adb logcat -c  # Logları temizle
adb logcat > crash_log.txt  # Logları dosyaya kaydet

# App'i aç (telefonda)
# App crash olduktan sonra Ctrl+C ile durdur

# Log dosyasını kontrol et
cat crash_log.txt | grep -i "error\|exception\|fatal"
```

### Adım 2: Hata Mesajını Bul

Log'larda şunları arayın:

- `FATAL EXCEPTION`
- `AndroidRuntime`
- `Exception`
- `Error`
- `ReactNativeJS`

### Adım 3: Stack Trace'i İncele

Hata mesajının altındaki stack trace'i okuyun:

```
FATAL EXCEPTION: main
Process: net.talkee.app, PID: 12345
java.lang.RuntimeException: ...
    at ...
    at ...
```

---

## 🛠️ Hızlı Çözümler

### Çözüm 1: Environment Variables Kontrol

```bash
# .env dosyasını kontrol et
cat .env | grep EXPO_PUBLIC

# Eksikse ekle
echo "EXPO_PUBLIC_SUPABASE_URL=..." >> .env
echo "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=..." >> .env
```

### Çözüm 2: Clean Build

```bash
# Android clean
cd android
./gradlew clean
./gradlew assembleRelease

# Veya
npm run android:clean
npm run build:apk
```

### Çözüm 3: Debug APK ile Test

```bash
# Debug APK build (daha fazla log)
cd android
./gradlew assembleDebug

# Debug APK yükle
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📋 Checklist

### Log Kontrol:

- [ ] `adb logcat` çalıştırıldı
- [ ] Hata mesajı bulundu
- [ ] Stack trace incelendi

### Environment Variables:

- [ ] `.env` dosyası var
- [ ] `EXPO_PUBLIC_SUPABASE_URL` var
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` var
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` var

### Build:

- [ ] Clean build yapıldı
- [ ] Native dependencies rebuild edildi

---

## 🔍 Örnek Hata Mesajları ve Çözümleri

### Hata 1: "Cannot find module"

```
Error: Cannot find module '@expo/vector-icons'
```

**Çözüm:**

```bash
npm install
cd android && ./gradlew clean
```

### Hata 2: "Network request failed"

```
Error: Network request failed
```

**Çözüm:**

- Internet permission kontrol et
- Supabase URL doğru mu kontrol et
- Firewall/VPN kapalı mı kontrol et

### Hata 3: "Stripe initialization failed"

```
Error: Stripe publishable key is required
```

**Çözüm:**

- `.env` dosyasında key var mı?
- Build sırasında environment variables yüklendi mi?

---

## 🚀 Hızlı Debug Komutları

```bash
# 1. Logları temizle ve baştan başla
adb logcat -c && adb logcat

# 2. Sadece hataları göster
adb logcat *:E

# 3. React Native logları
adb logcat | grep -i "react"

# 4. Crash loglarını dosyaya kaydet
adb logcat > crash_log.txt

# 5. App'i yeniden yükle
adb uninstall net.talkee.app
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 📝 Log Analizi

### Önemli Log Satırları:

1. **FATAL EXCEPTION:** Crash'in nedeni
2. **AndroidRuntime:** Android runtime hatası
3. **ReactNativeJS:** React Native JavaScript hatası
4. **Expo:** Expo framework hatası
5. **Stripe:** Stripe SDK hatası

### Log Formatı:

```
12-14 22:45:30.123  1234  5678 E AndroidRuntime: FATAL EXCEPTION: main
12-14 22:45:30.123  1234  5678 E AndroidRuntime: Process: net.talkee.app, PID: 1234
12-14 22:45:30.123  1234  5678 E AndroidRuntime: java.lang.RuntimeException: ...
```

---

## 🆘 Yardım

Eğer hata bulamazsanız:

1. **Log dosyasını paylaş:** `crash_log.txt`
2. **Hata mesajını paylaş:** Logcat'ten kopyala
3. **Build loglarını kontrol et:** Build sırasında hata var mı?

---

## 🎯 Sonraki Adımlar

1. ✅ Logları al (`adb logcat`)
2. ✅ Hata mesajını bul
3. ✅ Stack trace'i incele
4. ✅ Çözümü uygula
5. ✅ Yeniden build et
6. ✅ Test et
