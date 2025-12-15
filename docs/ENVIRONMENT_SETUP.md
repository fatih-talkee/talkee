# 🔧 Environment Variables Setup Guide

## 📋 Hızlı Başlangıç

### 1. Template Dosyasını Kopyala

```bash
cp .env.example .env
```

### 2. Gerçek Değerleri Doldur

`.env` dosyasını aç ve gerçek key'leri ekle.

---

## 🔑 Gerekli Environment Variables

### Frontend (.env dosyası)

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Backend (Supabase Secrets)

Supabase Dashboard → Project Settings → Secrets:

1. **STRIPE_SECRET_KEY** = `sk_test_...` veya `sk_live_...`
2. **STRIPE_WEBHOOK_SECRET** = `whsec_...`
3. **SUPABASE_SERVICE_ROLE_KEY** = (varsa)

---

## 📍 Key'leri Nereden Alınır?

### Supabase Keys

1. **Supabase Dashboard'a Git**

   - https://supabase.com/dashboard
   - Projenizi seçin

2. **Settings → API**
   - **Project URL**: `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public key**: `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Stripe Keys

1. **Stripe Dashboard'a Git**

   - Test: https://dashboard.stripe.com/test/apikeys
   - Production: https://dashboard.stripe.com/apikeys

2. **API Keys**

   - **Publishable key**: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key**: Supabase Secrets'e eklenecek

3. **Webhook Secret**
   - Developers → Webhooks → Endpoint oluştur
   - Secret'ı kopyala → Supabase Secrets'e ekle

---

## 🛠️ Platform-Specific Setup

### Android

`android/gradle.properties` dosyasına:

```properties
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Not:** Bu dosya git'e commit edilir. Test key kullanabilirsiniz, production'da EAS Build secrets kullanın.

### iOS

iOS için ekstra bir şey yapmaya gerek yok. `StripeProvider` otomatik olarak environment variable'dan okur.

---

## ✅ Doğrulama

### 1. Environment Variables Kontrolü

```bash
# .env dosyasının var olduğunu kontrol et
ls -la .env

# İçeriğini kontrol et (key'leri görmemek için)
grep -v "KEY" .env
```

### 2. Dev Server Restart

Environment variables değiştiğinde mutlaka restart edin:

```bash
# Server'ı durdur (Ctrl+C)
npm start
# veya
npx expo start --clear
```

### 3. Test

- App açılıyor mu?
- Supabase bağlantısı çalışıyor mu?
- Stripe payment sheet açılıyor mu?

---

## 🔒 Güvenlik

### ✅ Yapılması Gerekenler

1. **`.env` dosyasını gitignore'a ekle** (zaten var ✅)
2. **Secret keys'i asla frontend'e ekleme**
3. **Production keys'i test keys'lerden ayır**
4. **EAS Build secrets kullan** (production için)

### ❌ Yapılmaması Gerekenler

1. ❌ `.env` dosyasını git'e commit etme
2. ❌ Secret keys'i frontend koduna yazma
3. ❌ Production keys'i test ortamında kullanma
4. ❌ Keys'leri public repository'de paylaşma

---

## 📝 Checklist

### Development Setup

- [ ] `.env.example` dosyasını `.env` olarak kopyaladım
- [ ] Supabase URL ve anon key ekledim
- [ ] Stripe publishable key ekledim (test)
- [ ] Supabase Secrets'e STRIPE_SECRET_KEY ekledim
- [ ] Supabase Secrets'e STRIPE_WEBHOOK_SECRET ekledim
- [ ] Android `gradle.properties`'e Stripe key ekledim
- [ ] Dev server'ı restart ettim
- [ ] Test ettim - çalışıyor ✅

### Production Setup

- [ ] Production Supabase keys aldım
- [ ] Production Stripe keys aldım
- [ ] EAS Build secrets ayarladım
- [ ] Production webhook oluşturdum
- [ ] Production test yaptım

---

## 🆘 Sorun Giderme

### "supabaseUrl is required"

**Çözüm:**

- `.env` dosyası var mı kontrol et
- `EXPO_PUBLIC_SUPABASE_URL` doğru mu kontrol et
- Dev server'ı restart et

### "Invalid publishable key"

**Çözüm:**

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` doğru mu kontrol et
- Key `pk_test_` veya `pk_live_` ile başlamalı
- Dev server'ı restart et

### Environment variables okunmuyor

**Çözüm:**

1. `.env` dosyası root'ta mı? (package.json ile aynı yerde)
2. `EXPO_PUBLIC_` prefix var mı?
3. Dev server'ı restart ettin mi?
4. `.env` dosyasında syntax hatası var mı? (tırnak, boşluk)

---

## 📚 İlgili Dokümantasyon

- [Stripe Setup](./STRIPE_SETUP.md)
- [Supabase Setup](./SUPABASE_ENV_SETUP.md)
- [EAS Build Secrets](https://docs.expo.dev/build-reference/variables/)
