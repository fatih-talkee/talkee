# 💳 Stripe Payment Integration Setup

## ✅ Mevcut Durum

Stripe entegrasyonu **kısmen tamamlanmış**. Aşağıdaki adımları takip ederek tamamlayın.

---

## 📋 Yapılanlar

1. ✅ **Stripe SDK Kurulu**

   - `@stripe/stripe-react-native` paketi yüklü
   - Web için mock implementasyonu var

2. ✅ **Backend Functions**

   - `create-payment-intent` - Payment intent oluşturma
   - `create-customer` - Stripe customer oluşturma
   - `stripe-webhook` - Webhook handler

3. ✅ **Frontend Service**

   - `services/supabase/stripe.service.ts` - Stripe API çağrıları

4. ✅ **Payment Flow**

   - `app/credit-selection.tsx` - Credit purchase flow with Stripe Payment Sheet
   - StripeProvider wrapper eklendi

5. ✅ **Android Initialization**
   - `MainApplication.kt` içinde Stripe initialize edilmiş

---

## 🔧 Yapılması Gerekenler

### 1. Environment Variables Ayarla

#### `.env` Dosyası Oluştur

Proje root'unda `.env` dosyası oluştur:

```env
# Stripe Keys
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Test key
# EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # Production key
```

#### Supabase Secrets Ayarla

Supabase Dashboard → Project Settings → Secrets:

1. **STRIPE_SECRET_KEY**

   - Test: `sk_test_...`
   - Production: `sk_live_...`

2. **STRIPE_WEBHOOK_SECRET**
   - Webhook endpoint'inden alınacak
   - Format: `whsec_...`

**Nasıl Alınır:**

1. Stripe Dashboard → Developers → Webhooks
2. Endpoint oluştur: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Webhook secret'ı kopyala
4. Supabase Secrets'e ekle

---

### 2. Stripe Account Setup

#### Test Mode

1. **Stripe Dashboard'a Git**

   - https://dashboard.stripe.com/test/apikeys

2. **API Keys Al**

   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

3. **Webhook Endpoint Oluştur**
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

#### Production Mode

1. **Live Mode'a Geç**

   - Stripe Dashboard → Toggle "Test mode" off

2. **Live API Keys Al**

   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

3. **Production Webhook Oluştur**
   - Aynı endpoint, live mode'da

---

### 3. iOS Configuration

#### Merchant Identifier (Apple Pay için)

1. **Apple Developer Portal**

   - https://developer.apple.com/account/resources/identifiers/list
   - Merchant ID oluştur: `merchant.net.talkee.app`
   - Certificate oluştur ve Stripe'e yükle

2. **Stripe Dashboard**
   - Settings → Apple Pay
   - Merchant ID'yi ekle
   - Certificate'i yükle

**Not:** Apple Pay kullanmayacaksanız bu adım opsiyonel.

---

### 4. Android Configuration

Android için zaten yapılandırılmış:

- `MainApplication.kt` içinde Stripe initialize edilmiş
- `build.gradle` içinde `STRIPE_PUBLISHABLE_KEY` config var

**Gradle Properties:**

`android/gradle.properties` dosyasına ekle:

```properties
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

### 5. Test Payment Flow

#### Test Kartları

Stripe test kartları:

```
# Başarılı ödeme
Card: 4242 4242 4242 4242
Expiry: Herhangi bir gelecek tarih
CVC: Herhangi bir 3 haneli sayı
ZIP: Herhangi bir 5 haneli sayı

# 3D Secure gerektiren
Card: 4000 0025 0000 3155

# Başarısız ödeme
Card: 4000 0000 0000 0002
```

#### Test Adımları

1. **App'i Başlat**

   ```bash
   npm start
   ```

2. **Credits Sayfasına Git**

   - Tab bar → Credits

3. **Credit Paketi Seç**

   - Örn: $50

4. **Ödeme Yap**

   - Test kartı bilgilerini gir
   - Ödeme tamamlanmalı

5. **Webhook Kontrolü**
   - Stripe Dashboard → Events
   - `payment_intent.succeeded` event'ini kontrol et
   - Database'de credit'in eklendiğini kontrol et

---

## 🔍 Troubleshooting

### Problem: "Stripe is not available on this platform"

**Çözüm:**

- Web platform'da Stripe çalışmaz (mock var)
- Sadece iOS ve Android'de çalışır

### Problem: "Invalid publishable key"

**Çözüm:**

- `.env` dosyasında `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` kontrol et
- Key'in `pk_test_` veya `pk_live_` ile başladığından emin ol
- Dev server'ı restart et

### Problem: "Payment intent creation failed"

**Çözüm:**

- Supabase Secrets'te `STRIPE_SECRET_KEY` kontrol et
- Supabase Function loglarını kontrol et
- Network bağlantısını kontrol et

### Problem: "Webhook signature verification failed"

**Çözüm:**

- Supabase Secrets'te `STRIPE_WEBHOOK_SECRET` kontrol et
- Webhook endpoint URL'ini kontrol et
- Stripe Dashboard'da webhook secret'ı yeniden kopyala

---

## 📝 Checklist

### Development

- [ ] `.env` dosyası oluşturuldu
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` eklendi (test key)
- [ ] Supabase Secrets'e `STRIPE_SECRET_KEY` eklendi (test key)
- [ ] Test payment başarılı
- [ ] Webhook çalışıyor

### Production

- [ ] Production Stripe account oluşturuldu
- [ ] Production API keys alındı
- [ ] Production webhook oluşturuldu
- [ ] Supabase Secrets'e production keys eklendi
- [ ] Apple Pay merchant ID (iOS için)
- [ ] Production test payment yapıldı

---

## 🔗 Kaynaklar

- [Stripe React Native Docs](https://stripe.dev/stripe-react-native/)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Supabase Functions](https://supabase.com/docs/guides/functions)

---

## ⚠️ Önemli Notlar

1. **Test vs Production Keys**

   - Development'ta test keys kullan
   - Production'da live keys kullan
   - Keys'leri asla git'e commit etme

2. **Webhook Security**

   - Webhook secret'ı mutlaka ayarla
   - Signature verification çalışıyor mu kontrol et

3. **Apple Pay**

   - iOS'ta Apple Pay kullanmak için merchant ID gerekli
   - Certificate Stripe'e yüklenmeli

4. **Error Handling**
   - Payment errors kullanıcıya gösterilmeli
   - Failed payments loglanmalı
   - Retry mechanism eklenebilir
