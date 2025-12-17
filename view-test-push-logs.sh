#!/bin/bash

# View Test Push logs from Android device
# Usage: ./view-test-push-logs.sh

echo "📱 Filtering logs for Test Push notifications..."
echo "Press Ctrl+C to stop"
echo ""
echo "Looking for logs starting with:"
echo "  🧪 [TEST-PUSH]"
echo "  📤 [SEND-PUSH]"
echo "  📥 [SEND-PUSH]"
echo "  🎫 [SEND-PUSH]"
echo ""

# Filter logs for test push related logs
adb logcat | grep -E "\[TEST-PUSH\]|\[SEND-PUSH\]|TEST-PUSH|SEND-PUSH|test-push|send-push"


