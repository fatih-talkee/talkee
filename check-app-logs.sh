#!/bin/bash

# Script to check app logs for errors

echo "🔍 Checking Android device connection..."
adb devices

echo ""
echo "📱 Clearing old logs..."
adb logcat -c

echo ""
echo "🔎 Monitoring app logs (Press Ctrl+C to stop)..."
echo "Filtering for: React, errors, exceptions, crashes, and app-specific logs"
echo ""

# Watch for app-specific logs with error indicators
adb logcat | grep -iE "net\.talkee\.app|ReactNativeJS|\[App\]|\[i18n\]|error|exception|crash|fatal|ReactNative"

