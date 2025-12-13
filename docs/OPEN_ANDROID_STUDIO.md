# Android Studio'yu Açma - Komutlar

## 🚀 Hızlı Komutlar

### ✅ Terminal'den Direkt Aç (En Kolay - Tek Komut)

**Tek satır komut (kopyala-yapıştır):**

```bash
open -a "Android Studio" /Users/fatihb./Projects/talkee/android
```

**Veya proje klasöründen:**

```bash
cd /Users/fatihb./Projects/talkee && open -a "Android Studio" android
```

**Script ile (en kolay - tek komut):**

```bash
./scripts/open-android-studio.sh
```

**Tüm komutlar aynı işi yapar - hangisini tercih edersen onu kullan!**

### Yöntem 2: Android Studio Komutu (PATH'te varsa)

Eğer `studio` komutu çalışıyorsa:

```bash
studio /Users/fatihb./Projects/talkee/android
```

**`studio` komutunu PATH'e eklemek için:**

```bash
# Android Studio'yu PATH'e ekle (bir kere yap)
echo 'export PATH="$PATH:/Applications/Android Studio.app/Contents/MacOS"' >> ~/.zshrc
source ~/.zshrc

# Artık şu komut çalışır:
studio /Users/fatihb./Projects/talkee/android
```

### Yöntem 3: Manuel Açma

1. **Android Studio'yu aç**
2. **File** → **Open**
3. Şu klasörü seç: `/Users/fatihb./Projects/talkee/android`
4. **OK** tıkla

**⚠️ ÖNEMLİ:** Root klasörü (`talkee`) değil, **`android`** klasörünü aç!

---

## 📋 Adım Adım

### 1. Android Studio'yu Aç

**macOS'ta:**

```bash
# Applications klasöründen aç
open -a "Android Studio"

# Veya Spotlight'tan: Cmd + Space → "Android Studio"
```

### 2. Projeyi Aç

**Terminal'den:**

```bash
cd /Users/fatihb./Projects/talkee
open -a "Android Studio" android
```

**Manuel:**

1. Android Studio'da **File** → **Open**
2. `/Users/fatihb./Projects/talkee/android` klasörünü seç
3. **OK**

### 3. Gradle Sync Bekle

- Android Studio otomatik olarak Gradle sync yapacak
- "Gradle sync finished" mesajını bekle
- İlk açılışta birkaç dakika sürebilir

---

## 🔧 Alternatif Komutlar

### Android Studio'yu PATH'e Ekle (Opsiyonel)

Eğer `studio` komutu çalışmıyorsa:

**macOS:**

```bash
# Android Studio'yu PATH'e ekle
echo 'export PATH="$PATH:/Applications/Android Studio.app/Contents/MacOS"' >> ~/.zshrc
source ~/.zshrc

# Artık şu komut çalışır:
studio /Users/fatihb./Projects/talkee/android
```

---

## ✅ Doğru Klasör Yapısı

```
talkee/
├── android/          ← BUNU AÇ (Android Studio için)
│   ├── app/
│   ├── build.gradle
│   └── ...
├── app/
├── components/
└── ...
```

**❌ YANLIŞ:** Root klasörü (`talkee`) açma  
**✅ DOĞRU:** `android` klasörünü aç

---

## 🎯 Hızlı Başlangıç (Tek Komut)

**En hızlı yöntem - kopyala-yapıştır:**

```bash
open -a "Android Studio" /Users/fatihb./Projects/talkee/android
```

**Veya script ile:**

```bash
./scripts/open-android-studio.sh
```

**Veya proje klasöründen:**

```bash
cd /Users/fatihb./Projects/talkee && open -a "Android Studio" android
```

---

## 📱 Android Studio'da Ne Yapabilirsin?

1. **Run App** - Uygulamayı cihazda/emulator'de çalıştır
2. **Debug** - Breakpoint'lerle debug yap
3. **Logcat** - Real-time logları gör
4. **Build** - APK/AAB build et
5. **Device Manager** - Emulator'leri yönet

---

## 🆘 Sorun Giderme

### "Gradle sync failed"

```bash
# Cache'i temizle
cd android
./gradlew clean

# Android Studio'da:
# File → Invalidate Caches → Invalidate and Restart
```

### "SDK not found"

1. Android Studio → **Tools** → **SDK Manager**
2. Gerekli SDK'ları yükle
3. **Apply** → **OK**

### "NDK not found"

1. **Tools** → **SDK Manager** → **SDK Tools**
2. **NDK (Side by side)** işaretle
3. **Apply** → **OK**

---

## 📚 İlgili Dosyalar

- `docs/RUN_IN_ANDROID_STUDIO.md` - Detaylı Android Studio kullanım rehberi
- `readme/ANDROID_APK.md` - APK build rehberi
