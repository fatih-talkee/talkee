#!/bin/bash
clear
echo "=================================="
echo "📱 Android Log Viewer for Talkee"
echo "=================================="
echo ""
echo "Step 1: Checking device connection..."
adb devices
echo ""
echo "Step 2: Clearing old logs..."
adb logcat -c
echo ""
echo "Step 3: Starting log viewer..."
echo "👉 Now OPEN YOUR APP on the phone!"
echo "👉 Watch this window for logs..."
echo ""
echo "Press Ctrl+C to stop"
echo "=================================="
echo ""
adb logcat | grep -iE "net\.talkee\.app|ReactNativeJS|\[App\]|\[i18n\]|error|exception|crash|fatal"
