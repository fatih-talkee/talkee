#!/bin/bash

echo "📱 Test Push Notification Loglarını Görüntüleme"
echo "=============================================="
echo ""
echo "Seçenekler:"
echo "1. Metro Bundler terminalinde logları görün (npx expo start çalışırken)"
echo "2. Android Logcat ile görüntüle (bu script)"
echo "3. Supabase Dashboard'dan Edge Function loglarını görüntüle"
echo ""
echo "Android Logcat başlatılıyor..."
echo "Logları görmek için Ctrl+C ile durdurun"
echo ""
echo "Arayacağımız loglar:"
echo "  🧪 [TEST-PUSH]"
echo "  📤 [TEST-PUSH]"
echo "  📥 [TEST-PUSH]"
echo "  📤 [SEND-PUSH]"
echo "  📥 [SEND-PUSH]"
echo "  🎫 [SEND-PUSH]"
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ ADB bulunamadı. Android SDK'yı kurduğunuzdan emin olun."
    exit 1
fi

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ Android cihaz bağlı değil. 'adb devices' ile kontrol edin."
    exit 1
fi

echo "✅ Android cihaz bulundu"
echo ""
echo "Loglar filtreleniyor..."
echo ""

# Filter logs for test push related logs
adb logcat -c  # Clear previous logs
adb logcat *:S ReactNativeJS:V | grep --color=always -i -E "\[TEST-PUSH\]|\[SEND-PUSH\]|TEST-PUSH|SEND-PUSH|test-push|send-push|🧪|📤|📥|🎫"
