# 🔍 Supabase URL Verification Guide

## ⚠️ DNS Error: `hmimorfmdhcgjhxbwn.supabase.co` not found

This means the Supabase project URL in your `.env` file is incorrect or the project doesn't exist.

---

## ✅ **STEP 1: Verify Your Supabase Project URL**

1. Go to: https://supabase.com/dashboard
2. Check your project list - make sure the project exists
3. Click on your project
4. Go to: **Settings** → **API**
5. Copy the **exact** Project URL shown there

**Example format:**
```
https://xxxxxxxxxxxxx.supabase.co
```

**NOT:**
- `https://hmimorfmdhcgjhxbwn.supabase.co` (if this doesn't work)

---

## ✅ **STEP 2: Update Your .env File**

1. Open `.env` in the project root
2. Update the `EXPO_PUBLIC_SUPABASE_URL` with the **correct** URL from Step 1

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_ACTUAL_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## ✅ **STEP 3: Restart Dev Server**

```bash
# Stop the server (Ctrl+C)
npm run dev
# or
npx expo start --clear
```

---

## 🧪 **STEP 4: Test the URL**

After updating, try accessing this URL directly in your browser:
```
https://YOUR_PROJECT_ID.supabase.co/rest/v1/
```

If it works, you'll see a JSON response. If not, check:
- ✅ Project exists in Supabase dashboard
- ✅ No typos in the project ID
- ✅ Project is not paused/deleted

---

## 🔑 **Alternative: Create a New Supabase Project**

If the project doesn't exist:

1. Go to: https://supabase.com/dashboard
2. Click **New Project**
3. Fill in project details
4. Copy the new Project URL
5. Update `.env` with the new URL

---

## 📝 **Quick Check Command**

Run this to see what URL is currently configured:
```bash
cd /Users/fatihb./Projects/talkee
grep EXPO_PUBLIC_SUPABASE_URL .env
```

