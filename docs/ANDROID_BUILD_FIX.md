# Android Build Fix Guide

## 🔍 Sorun

Build `packageRelease` task'ında başarısız oluyor:

```
> Task :app:packageRelease FAILED
Execution failed for task ':app:packageRelease'.
> A failure occurred while executing com.android.build.gradle.tasks.PackageAndroidArtifact$IncrementalSplitterRunnable
```

Ayrıca JVM Metaspace tükeniyor:

```
The Daemon will expire after the build after running out of JVM Metaspace.
The currently configured max heap space is '2 GiB' and the configured max metaspace is '512 MiB'.
```

---

## ✅ Yapılan Düzeltmeler

### 1. Gradle Memory Ayarları Artırıldı

`android/gradle.properties` dosyasında:

```properties
# Önceki:
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m

# Yeni:
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

**Değişiklikler:**

- Heap memory: 2GB → 4GB
- Metaspace: 512MB → 1024MB
- Heap dump eklendi (OOM durumunda debug için)
- UTF-8 encoding eklendi

---

## 🔧 Build'i Tekrar Deneyin

### Seçenek 1: Normal Build

```bash
cd android
./gradlew assembleRelease
```

### Seçenek 2: Detaylı Hata Mesajı (Önerilen)

```bash
cd android
./gradlew assembleRelease --stacktrace
```

### Seçenek 3: Daha Fazla Bilgi

```bash
cd android
./gradlew assembleRelease --info
```

### Seçenek 4: Debug Mode (Hızlı test)

```bash
cd android
./gradlew assembleDebug
```

---

## 🚨 Eğer Hala Hata Alırsanız

### 1. Gradle Daemon'ı Durdurun

```bash
cd android
./gradlew --stop
```

### 2. Build Cache'i Temizleyin

```bash
cd android
./gradlew clean
rm -rf .gradle
rm -rf app/build
```

### 3. Gradle Wrapper'ı Güncelleyin

```bash
cd android
./gradlew wrapper --gradle-version=8.14.3
```

### 4. Native Libraries Kontrolü

Eğer hata native library ile ilgiliyse:

```bash
# Android NDK versiyonunu kontrol edin
# build.gradle'da ndkVersion kontrol edin
```

### 5. APK Signing Kontrolü

Eğer signing hatası varsa:

- `android/app/build.gradle` dosyasında `signingConfigs` kontrol edin
- Keystore dosyası mevcut mu kontrol edin

---

## 📋 Olası Hata Nedenleri

1. **Memory Sorunları** ✅ (Düzeltildi - memory artırıldı)
2. **APK Signing** - Keystore eksik veya yanlış
3. **Resource Sorunları** - Çok büyük dosyalar veya duplicate resources
4. **Native Library** - NDK build hatası
5. **Dependency Conflict** - Çakışan kütüphaneler

---

## 🔍 Detaylı Debug

### Stacktrace ile Build

```bash
cd android
./gradlew assembleRelease --stacktrace 2>&1 | tee build-error.log
```

### Sadece packageRelease Task'ını Çalıştır

```bash
cd android
./gradlew :app:packageRelease --stacktrace
```

### Gradle Daemon Status

```bash
cd android
./gradlew --status
```

---

## 💡 İpuçları

1. **İlk build uzun sürebilir** - Normal, sabırlı olun
2. **Memory yeterli değilse** - `gradle.properties`'te daha da artırın
3. **Disk alanı kontrol edin** - Build çok yer kaplayabilir
4. **Internet bağlantısı** - Dependencies indirmek için gerekli

---

## ✅ Başarılı Build Sonrası

APK dosyası şurada olacak:

```
android/app/build/outputs/apk/release/app-release.apk
```

Test için:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```
