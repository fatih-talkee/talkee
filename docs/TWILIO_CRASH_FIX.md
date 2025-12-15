# 🐛 Twilio Voice SDK Crash Fix

## 🚨 Hata

```
FATAL EXCEPTION: create_react_context
java.lang.NullPointerException: Attempt to read from field 'com.twiliovoicereactnative.JSEventEmitter com.twiliovoicereactnative.VoiceApplicationProxy.jsEventEmitter' on a null object reference
```

## ✅ Çözüm

Twilio Voice SDK initialize edilmemişti. `MainApplication.kt` dosyasına eklendi:

1. **Import eklendi:**

   ```kotlin
   import com.twilivoicereactnative.VoiceApplicationProxy
   ```

2. **VoiceApplicationProxy instance oluşturuldu:**

   ```kotlin
   private val voiceApplicationProxy = VoiceApplicationProxy(this)
   ```

3. **onCreate()'de initialize edildi:**

   ```kotlin
   override fun onCreate() {
       super.onCreate()
       voiceApplicationProxy.onCreate() // ← Bu eklendi
       // ... diğer kodlar
   }
   ```

4. **onTerminate() eklendi:**
   ```kotlin
   override fun onTerminate() {
       voiceApplicationProxy.onTerminate()
       super.onTerminate()
   }
   ```

## 🔄 Sonraki Adımlar

1. **APK'yı yeniden build edin:**

   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

2. **APK'yı yükleyin:**

   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

3. **Test edin:**
   - App açılıyor mu?
   - Crash oluyor mu?

## 📝 Not

Twilio Voice SDK kullanmıyorsanız, package.json'dan kaldırabilirsiniz:

```bash
npm uninstall @twilio/voice-react-native-sdk
```

Ama şu an için initialize edilmesi yeterli, app çalışacak.
