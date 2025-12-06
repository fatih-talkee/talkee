# 🔐 OAUTH SETUP - PORT 8081 VERSION

## ✅ DOĞRU PORT: 8081

Senin setup'ın **localhost:8081** kullanıyor!

---

## 🎯 **SUPABASE DASHBOARD SETUP:**

### **1. Redirect URLs Ekle:**

**Supabase Dashboard:**
```
https://supabase.com/dashboard/project/hmimorfmdhcgjhxbwn/auth/url-configuration
```

**Site URL:**
```
http://localhost:8081
```

**Redirect URLs (hepsini ekle):**
```
http://localhost:8081/auth/callback
http://localhost:19006/auth/callback
https://your-production-domain.com/auth/callback
talkee://auth/callback
```

---

## 🔑 **GOOGLE CONSOLE SETUP:**

### **Authorized JavaScript Origins:**
```
http://localhost:8081
http://localhost:19006
https://hmimorfmdhcgjhxbwn.supabase.co
```

### **Authorized Redirect URIs:**
```
http://localhost:8081/auth/callback
https://hmimorfmdhcgjhxbwn.supabase.co/auth/v1/callback
```

---

## 💡 **CODE EXPLANATION:**

```typescript
// ✅ This automatically detects your port!
const redirectUrl = Platform.OS === 'web' 
  ? `${window.location.origin}/auth/callback` 
  : 'talkee://auth/callback';

// For you, it will be:
// http://localhost:8081/auth/callback ✅
```

**`window.location.origin`** otomatik olarak şunu döndürür:
- Senin için: `http://localhost:8081`
- Başkası için: `http://localhost:19006`
- Production'da: `https://your-domain.com`

**Yani port'u hardcode etmeye gerek yok!** 🎉

---

## 🧪 **TEST FLOW:**

```
1. Browser: http://localhost:8081
2. Click "Google Sign-In"
3. Redirect to: https://hmimorfmdhcgjhxbwn.supabase.co/auth/v1/authorize?provider=google&redirect_to=http://localhost:8081/auth/callback
4. Google login page
5. Authorize
6. Redirect back: http://localhost:8081/auth/callback ✅
7. Create profile (if new user)
8. Navigate to main app
```

---

## 🚀 **SETUP ADIMLARI:**

### **1. Supabase Dashboard'a Git:**

```
https://supabase.com/dashboard/project/hmimorfmdhcgjhxbwn/auth/providers
```

**Google Provider:**
- Toggle: **Enabled** ✅
- Client ID: `YOUR_GOOGLE_CLIENT_ID`
- Client Secret: `YOUR_GOOGLE_CLIENT_SECRET`
- **Save**

**URL Configuration:**
```
Settings → Authentication → URL Configuration

Site URL: http://localhost:8081

Redirect URLs:
- http://localhost:8081/auth/callback
- talkee://auth/callback
```

---

### **2. Google Console:**

1. **Git:** https://console.cloud.google.com/apis/credentials

2. **Create OAuth 2.0 Client ID**

3. **Application Type:** Web application

4. **Authorized JavaScript origins:**
   ```
   http://localhost:8081
   https://hmimorfmdhcgjhxbwn.supabase.co
   ```

5. **Authorized redirect URIs:**
   ```
   http://localhost:8081/auth/callback
   https://hmimorfmdhcgjhxbwn.supabase.co/auth/v1/callback
   ```

6. **Create** → Copy Client ID + Secret

7. **Supabase'e Yapıştır** (Step 1)

---

## 📦 **FILES TO UPDATE:**

### **1. app/auth/login.tsx**
```typescript
// Replace with login.oauth-fixed.tsx
```

### **2. app/auth/callback.tsx** (NEW)
```typescript
// Create new file from callback.tsx
```

### **3. app/auth/_layout.tsx**
```typescript
// Add callback route
<Stack.Screen name="callback" options={{ headerShown: false }} />
```

---

## 🔍 **DEBUG:**

Login'de console'a bak:
```typescript
console.log('OAuth redirect URL:', redirectUrl);
```

**Görmen gereken:**
```
OAuth redirect URL: http://localhost:8081/auth/callback
```

Eğer farklı bir şey görüyorsan (ör. `talkee://`), Platform.OS === 'web' check'i çalışmıyor demektir.

---

## ⚡ **HIZLI TEST:**

Google Console setup yapmadan önce test et:

```typescript
// Login.tsx'te
const handleSocialLogin = async (provider: string) => {
  const redirectUrl = Platform.OS === 'web' 
    ? `${window.location.origin}/auth/callback` 
    : 'talkee://auth/callback';
  
  console.log('Platform:', Platform.OS);
  console.log('Window origin:', window.location?.origin);
  console.log('Final redirect URL:', redirectUrl);
  
  // Temporarily disable actual OAuth
  toast.info({
    title: 'Debug Info',
    message: `Redirect URL: ${redirectUrl}`,
    duration: 5000,
  });
};
```

**Görmem gereken:**
```
Platform: web
Window origin: http://localhost:8081
Final redirect URL: http://localhost:8081/auth/callback
```

---

## 💡 **ÖNERİ:**

1. ✅ **Önce debug yap** - console.log ile redirect URL'i kontrol et
2. ✅ **Supabase'e ekle** - `http://localhost:8081/auth/callback`
3. ✅ **Google Console setup** - OAuth client oluştur
4. ✅ **Test et** - Google Sign-In

---

**Şimdi ne yapmak istersin?**
- **A)** Debug için console.log ekle, URL'i kontrol et
- **B)** Supabase redirect URL'lerini ayarla
- **C)** Google Console'u setup et
- **D)** Social login'i şimdilik disable et, main pages'e geç

Ben **D** öneriyorum! OAuth sonra hallederiz 😊
