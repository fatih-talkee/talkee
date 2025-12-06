# 📱 How to View Android App Logs

## Step 1: Enable USB Debugging on Your Phone

1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times (enables Developer Options)
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**
5. Enable **USB Debugging (Security Settings)** if available

## Step 2: Connect Your Phone

1. Connect your phone to your computer via USB cable
2. On your phone, when prompted, **Allow USB debugging** (check "Always allow" if you want)
3. Verify connection by running: `adb devices`
   - You should see your device listed

## Step 3: View Logs

### Method 1: Use the Script (Easiest) ⭐

```bash
./check-app-logs.sh
```

This will:
- Clear old logs
- Show only relevant logs (your app, React Native, errors)

### Method 2: Manual Commands

**View all app-related logs:**
```bash
adb logcat | grep -iE "net\.talkee\.app|ReactNativeJS|\[App\]|\[i18n\]|error|exception"
```

**View only errors:**
```bash
adb logcat *:E
```

**Save logs to a file:**
```bash
adb logcat > app-logs.txt
# Press Ctrl+C to stop, then check app-logs.txt
```

**Clear logs and start fresh:**
```bash
adb logcat -c
adb logcat | grep -iE "net\.talkee\.app|ReactNativeJS|\[App\]|\[i18n\]"
```

## Step 4: Test the App

1. **Before opening the app:** Start the log viewer (run `./check-app-logs.sh` or one of the commands above)
2. **Open the app** on your phone
3. **Watch the terminal** - you'll see real-time logs

## What You'll See

✅ **Good logs (working):**
- `[App] Starting i18n initialization...`
- `[i18n] Starting initialization...`
- `[i18n] Initialization complete`
- `[App] All initialization complete, hiding splash screen`

❌ **Bad logs (errors):**
- `FATAL EXCEPTION`
- `ReactNativeJS: Error: ...`
- `[App] Failed to initialize i18n:`
- `Exception`

## Troubleshooting

**Device not showing up?**
- Make sure USB debugging is enabled
- Try a different USB cable
- Try a different USB port
- On your phone, make sure you tapped "Allow" when prompted

**No logs appearing?**
- Make sure the app is installed and running
- Try without grep filter: `adb logcat`
- Check device connection: `adb devices`

