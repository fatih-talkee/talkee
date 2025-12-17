# Test Push Loglarını Görüntüleme Rehberi

Test push notification loglarını takip etmek için farklı yöntemler var:

## 1. 📱 Metro Bundler Terminali (React Native App Logları)

Metro bundler çalışırken (`npx expo start`), test-push sayfasındaki loglar terminalde görünür.

**Kullanım:**
```bash
# Metro bundler'ı başlat
npx expo start

# Veya eğer zaten çalışıyorsa, terminalde şunları arayın:
# 🧪 [TEST-PUSH]
# 📤 [TEST-PUSH]
# 📥 [TEST-PUSH]
```

## 2. 🔍 Android Logcat (Detaylı Device Logları)

Android cihazınızdan tüm logları görmek için:

```bash
# Test push ile ilgili logları filtrele
adb logcat | grep -i "test-push\|send-push\|TEST-PUSH\|SEND-PUSH"

# Veya tüm React Native loglarını görmek için
adb logcat *:S ReactNative:V ReactNativeJS:V

# Veya console.log çıktılarını görmek için
adb logcat *:S ReactNativeJS:V
```

## 3. 📊 Supabase Edge Function Logları

Edge function (`send-push`) loglarını görmek için:

1. **Supabase Dashboard'a gidin:**
   - https://supabase.com/dashboard
   - Projenizi seçin

2. **Edge Functions → send-push → Logs:**
   - Sol menüden "Edge Functions" → "send-push" → "Logs" sekmesi
   - Veya direkt link: `https://supabase.com/dashboard/project/[PROJECT_ID]/functions/send-push/logs`

3. **Logları filtreleyin:**
   - Loglar `📤 [SEND-PUSH]`, `📥 [SEND-PUSH]`, `🎫 [SEND-PUSH]` prefix'leriyle başlar
   - Real-time olarak görünür

## 4. 🌐 Expo Dev Tools (Web Interface)

Expo Go veya development build kullanıyorsanız:

1. Metro bundler çalışırken, tarayıcıda `http://localhost:19002` açın
2. "Logs" sekmesine gidin
3. Console loglarını buradan görebilirsiniz

## 5. 📝 Örnek Log Çıktıları

### Test Push Sayfasından (React Native):
```
🧪 [TEST-PUSH] Starting push notification test...
📱 [TEST-PUSH] Device tokens fetched: { count: 1, ... }
📤 [TEST-PUSH] Calling send-push function...
📥 [TEST-PUSH] Response received: { status: 200, ... }
📊 [TEST-PUSH] Push result details: { success_count: 1, ... }
```

### Edge Function'dan (Supabase):
```
📤 [SEND-PUSH] Function invoked
📥 [SEND-PUSH] Request body received: { user_id: "...", ... }
📱 [SEND-PUSH] Device tokens query result: { device_count: 1, ... }
📝 [SEND-PUSH] Creating push messages...
🌐 [SEND-PUSH] Sending request to Expo Push API...
📥 [SEND-PUSH] Expo API response received: { status: 200, ... }
🎫 [SEND-PUSH] Processing tickets...
✅ [SEND-PUSH] Token 1 accepted by Expo API
📊 [SEND-PUSH] Final summary: { total_success: 1, ... }
```

## 🚀 Hızlı Test Komutu

Tüm logları aynı anda görmek için:

```bash
# Terminal 1: Metro bundler
npx expo start

# Terminal 2: Android logcat (React Native logları)
adb logcat *:S ReactNativeJS:V | grep -i "test-push\|send-push"

# Browser: Supabase Dashboard
# https://supabase.com/dashboard/project/[PROJECT_ID]/functions/send-push/logs
```

## 💡 İpuçları

1. **Loglar görünmüyorsa:**
   - Metro bundler'ın çalıştığından emin olun
   - Cihazınızın bağlı olduğundan emin olun (`adb devices`)
   - Expo Dev Tools'u deneyin

2. **Edge function logları görünmüyorsa:**
   - Supabase Dashboard'da doğru projeyi seçtiğinizden emin olun
   - Function'ın deploy edildiğinden emin olun
   - Real-time loglar için sayfayı yenileyin

3. **Filtreleme:**
   - Logcat'te `grep` kullanarak sadece ilgili logları görebilirsiniz
   - Metro bundler terminalinde `Cmd+F` (Mac) veya `Ctrl+F` (Windows/Linux) ile arama yapabilirsiniz


