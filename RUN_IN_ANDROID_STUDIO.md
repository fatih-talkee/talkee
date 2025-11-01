# 📱 Running App in Android Studio with Real Device

## ✅ Prerequisites

1. **Android Studio** installed (download from https://developer.android.com/studio)
2. **Android SDK** installed (Android Studio will guide you)
3. **Real Android device** with USB debugging enabled
4. **USB cable** to connect device

## 📋 Step-by-Step Guide

### Step 1: Open Project in Android Studio

1. Open **Android Studio**
2. Click **File** → **Open**
3. Navigate to your project folder: `/Users/fatihb./Projects/Talkee`
4. Select the **`android`** folder (NOT the root project folder)
5. Click **OK**

**Important:** You must open the `android` folder specifically, not the root `Talkee` folder!

### Step 2: Wait for Gradle Sync

- Android Studio will automatically sync Gradle files
- Wait for "Gradle sync finished" message
- This may take a few minutes on first open

### Step 3: Connect Your Device

1. Enable **USB Debugging** on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. Connect your phone via USB cable

3. On your phone, tap **"Allow USB debugging"** when prompted

### Step 4: Verify Device Connection

In Android Studio:
1. Look at the **top toolbar** → Device dropdown (next to Run button)
2. Your device should appear in the list
3. Or check: **View** → **Tool Windows** → **Device Manager**

Alternatively, in terminal:
```bash
adb devices
```
You should see your device listed.

### Step 5: Run the App

**Option A: Using Run Button**
1. Click the green **▶️ Run** button (top toolbar)
2. Select your device from the dropdown
3. Click **OK**
4. App will build and install on your device

**Option B: Using Menu**
1. Click **Run** → **Run 'app'**
2. Select your device
3. Click **OK**

### Step 6: View Logs in Android Studio

**Method 1: Logcat Window (Easiest)**
1. Click **View** → **Tool Windows** → **Logcat**
   - Or click the **Logcat** tab at the bottom
2. Filter by your app: Type `net.talkee.app` in the filter box
3. You'll see all logs in real-time!

**Method 2: Use Filter**
In Logcat:
- Filter dropdown → Select "Show only selected application"
- Or type in search: `ReactNativeJS` or `[App]` or `[i18n]`

### Step 7: Debug Issues

**View Errors:**
- Logcat shows errors in **red**
- Click on errors to see full stack trace

**Debug Breakpoints:**
1. Click left of line number to set breakpoint (red dot)
2. Run in **Debug Mode**: Click **🐛 Debug** button (bug icon)
3. App will pause at breakpoints

## 🎯 Benefits of Running in Android Studio

✅ **Real-time logs** - See all logs in Logcat window  
✅ **Easy debugging** - Set breakpoints and step through code  
✅ **Faster iteration** - Rebuild faster than EAS  
✅ **Better error messages** - See native errors clearly  
✅ **Device Manager** - Manage emulators and devices easily  

## 🔧 Troubleshooting

**Device not showing up?**
- Enable USB debugging
- Check USB cable connection
- Run `adb devices` to verify connection
- Try different USB port

**Gradle sync failed?**
- Click **File** → **Invalidate Caches** → **Invalidate and Restart**
- Wait for Gradle sync to complete

**Build errors?**
- Check Logcat for error messages
- Try **Build** → **Clean Project**
- Then **Build** → **Rebuild Project**

**App crashes?**
- Check Logcat window for crash logs
- Look for "FATAL EXCEPTION" messages
- Check for red error messages

## 📝 Quick Commands

**Build from terminal:**
```bash
cd android
./gradlew assembleDebug
```

**Install APK:**
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**View logs:**
```bash
adb logcat | grep -iE "net\.talkee\.app|ReactNativeJS|\[App\]|\[i18n\]"
```

