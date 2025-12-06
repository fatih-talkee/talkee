# 🔧 SUPABASE SETUP - ENVIRONMENT VARIABLES

## ❌ HATA: "supabaseUrl is required"

Bu hata **environment variables** eksik olduğu için oluyor!

---

## ✅ ÇÖZÜM:

### **Adım 1: Supabase Keys'i Al**

1. Git: https://supabase.com/dashboard
2. Projenizi seçin: **hmimorfmdhcgjhxbwn**
3. Sol menü → **Settings** → **API**
4. Şu bilgileri kopyala:
   - **Project URL**: `https://hmimorfmdhcgjhxbwn.supabase.co`
   - **anon/public key**: `eyJ...` (uzun bir token)

---

### **Adım 2: .env Dosyası Oluştur**

Projenin **root** klasöründe (package.json'ın olduğu yerde) `.env` dosyası oluştur:

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://hmimorfmdhcgjhxbwn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaW1vcmZtZGhjZ2poeGJ3biIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMzNDkwMjA1LCJleHAiOjIwNDkwNjYyMDV9.YOUR_ACTUAL_KEY_HERE
```

**NOT:** 
- ✅ `EXPO_PUBLIC_` prefix **ZORUNLU** (Expo için)
- ✅ `YOUR_ACTUAL_KEY_HERE` yerine gerçek key'i yapıştır
- ❌ `.env` dosyasını git'e commit ETME (add to .gitignore)

---

### **Adım 3: .gitignore'a Ekle**

`.gitignore` dosyasına ekle:

```
# Environment variables
.env
.env.local
.env.production
```

---

### **Adım 4: Dev Server'ı Restart Et**

```bash
# Server'ı durdur (Ctrl+C)
# Tekrar başlat
npm start
# veya
npx expo start --clear
```

---

## 🔐 **SUPABASE KEYS NEDİR?**

### **1. Project URL**
```
https://hmimorfmdhcgjhxbwn.supabase.co
```
- Supabase projenin API endpoint'i
- Tüm database işlemleri bu URL'e yapılır

### **2. Anon/Public Key**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **Public** key - frontend'de kullanılabilir
- **Güvenli** - sadece RLS policy'lere erişir
- **Service role key DEĞİL** (service role backend için)

---

## 📁 **DOSYA YERLEŞİMİ:**

```
talkee/
├── .env                    ← BURAYA OLUŞTUR
├── .gitignore             ← .env ekle
├── package.json
├── app/
├── lib/
│   └── supabase.ts        ← Bu dosya .env'i okuyor
└── ...
```

---

## 🧪 **TEST ET:**

.env dosyasını oluşturduktan sonra:

```bash
# Server'ı restart et
npm start

# Browser'da aç
# Login sayfasına git
# Artık "supabaseUrl is required" hatası gitmeli
```

---

## 🚨 **ALTERNATIF: Hardcode (Sadece Development)**

Eğer .env çalışmazsa, **geçici olarak** `lib/supabase.ts`'i güncelleyebilirsin:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ⚠️ TEMPORARY - Replace with your actual keys
const supabaseUrl = 'https://hmimorfmdhcgjhxbwn.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY_FROM_SUPABASE_DASHBOARD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
```

**⚠️ UYARI:** 
- Bu yaklaşım sadece development için!
- Production'da **MUTLAKA** environment variables kullan
- Key'leri git'e commit ETME

---

## ✅ **DOĞRU SETUP:**

```env
# .env
EXPO_PUBLIC_SUPABASE_URL=https://hmimorfmdhcgjhxbwn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...gerçek_key_buraya
```

```typescript
// lib/supabase.ts
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```

---

## 📞 **YARDIM:**

Supabase keys'i bulamıyorsan:
1. https://supabase.com/dashboard
2. Project: **hmimorfmdhcgjhxbwn**
3. Settings → API
4. Copy **Project URL** ve **anon public** key

Keys'leri buraya yapıştır, ben .env dosyasını hazırlayayım! 😊
