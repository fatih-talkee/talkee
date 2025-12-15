#!/bin/bash

# APK Crash Debug Script

echo "🐛 APK Crash Debug Başlatılıyor..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo -e "${RED}❌ Telefon bağlı değil!${NC}"
    echo ""
    echo "Telefonu USB ile bağlayın ve USB debugging'i açın."
    exit 1
fi

echo -e "${GREEN}✅ Telefon bağlı${NC}"
echo ""

# Clear logs
echo "📋 Loglar temizleniyor..."
adb logcat -c

echo ""
echo -e "${YELLOW}⚠️  Şimdi app'i açın (telefonda)${NC}"
echo "App crash olduktan sonra Enter'a basın..."
read

echo ""
echo "🔍 Loglar analiz ediliyor..."
echo ""

# Get logs
LOG_FILE="/tmp/talkee_crash_log.txt"
adb logcat -d > "$LOG_FILE"

# Find errors
echo -e "${RED}=== FATAL ERRORS ===${NC}"
grep -i "fatal\|exception" "$LOG_FILE" | tail -20

echo ""
echo -e "${RED}=== REACT NATIVE ERRORS ===${NC}"
grep -i "reactnativejs\|error" "$LOG_FILE" | tail -20

echo ""
echo -e "${RED}=== EXPO ERRORS ===${NC}"
grep -i "expo.*error" "$LOG_FILE" | tail -20

echo ""
echo -e "${YELLOW}=== FULL LOG FILE ===${NC}"
echo "Tam log dosyası: $LOG_FILE"
echo ""
echo "Log dosyasını görüntülemek için:"
echo "  cat $LOG_FILE"
echo ""
echo "Sadece hataları görmek için:"
echo "  cat $LOG_FILE | grep -i 'error\|exception\|fatal'"
