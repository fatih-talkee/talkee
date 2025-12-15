# 🔄 Google Login Loop Sorunu - Çözüm

## ❌ Sorun

Google login yapınca:

1. Email seçiliyor
2. Kısa bir süre login sayfasına dönüyor (1 saniye)
3. Sonra home sayfasına gidiyor

## 🔍 Neden Oluyor?

**Race condition:** `index.tsx`'teki session check, `callback.tsx`'teki navigation'dan önce çalışıyor ve kullanıcıyı login'e yönlendiriyor.

## ✅ Çözüm

### 1. callback.tsx - Navigation Öncesi Bekleme ✅

Navigation'dan önce 500ms bekleyerek session'ın tamamen hazır olmasını sağladık:

```typescript
// Wait a bit to ensure session is fully established before navigation
await new Promise((resolve) => setTimeout(resolve, 500));

// Navigate to main app (home page)
router.replace('/(tabs)');
```

### 2. index.tsx - Callback Sayfasında Daha Uzun Bekleme ✅

Callback sayfasındayken, session check'i 1 saniye geciktirdik:

```typescript
if (isOnCallback) {
  // On callback page, wait longer before checking to avoid race condition
  const timer = setTimeout(() => {
    // Only check after callback has had time to complete
    const checkSession = async () => {
      // ... session check
    };
    checkSession();
  }, 1000); // Wait 1 second for callback to complete

  return () => clearTimeout(timer);
}
```

---

## 📋 Test

1. **Google login yapın**
2. **Email seçin**
3. **Beklenen davranış:**
   - ✅ Direkt home sayfasına gitmeli
   - ❌ Login sayfasına dönmemeli
   - ❌ Loop olmamalı

---

## 🆘 Hala Loop Oluyorsa

1. **Bekleme süresini artırın:**

   - `callback.tsx`: 500ms → 1000ms
   - `index.tsx`: 1000ms → 2000ms

2. **Session check'i tamamen devre dışı bırakın:**

   - `index.tsx`'te callback sayfasındayken hiçbir şey yapmayın

3. **Navigation method'unu değiştirin:**
   - `router.replace()` yerine `router.push()` deneyin

---

## 📚 İlgili Dosyalar

- `app/auth/callback.tsx` - OAuth callback handler
- `app/index.tsx` - Initial routing logic
