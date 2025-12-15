# 🔗 Webhook Secret Kurulum Rehberi

## ✅ Mevcut Durum

- ✅ `STRIPE_SECRET_KEY` - **Mevcut ve çalışıyor**
- ❌ `STRIPE_WEBHOOK_SECRET` - **Eksik, eklenmesi gerekiyor**

---

## 📋 Adım Adım: Webhook Secret Ekleme

### 1. Stripe Dashboard'da Webhook Endpoint Oluştur

1. **Stripe Dashboard'a Git**

   ```
   https://dashboard.stripe.com/test/webhooks
   ```

   (Test modunda çalışıyorsanız `test/webhooks`, production için `webhooks`)

2. **"Add endpoint" Butonuna Tıkla**

3. **Endpoint URL'ini Gir**

   ```
   https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook
   ```

   ⚠️ **Önemli:** Proje URL'inizi kontrol edin. `.env` dosyanızdaki `EXPO_PUBLIC_SUPABASE_URL` ile aynı olmalı.

4. **Events to Send Seç**
   Aşağıdaki event'leri seçin:

   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `customer.created`
   - ✅ `charge.refunded`

5. **"Add endpoint" Butonuna Tıkla**

---

### 2. Webhook Secret'ı Kopyala

1. **Oluşturduğunuz Webhook Endpoint'e Tıklayın**

2. **"Signing secret" Bölümünü Bul**

   - "Signing secret" veya "Reveal" butonuna tıklayın
   - Secret `whsec_...` ile başlar

3. **Secret'ı Kopyala**
   ```
   whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

### 3. Supabase Secrets'e Ekle

1. **Supabase Dashboard → Edge Functions → Secrets**

2. **"ADD OR REPLACE SECRETS" Bölümünde:**

   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** Kopyaladığınız secret (`whsec_...`)

3. **"Save" Butonuna Tıkla**

---

## ✅ Doğrulama

### Test 1: Secrets Listesinde Görünüyor mu?

Supabase Dashboard → Edge Functions → Secrets

- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅ (yeni eklendi)

### Test 2: Webhook Function Çalışıyor mu?

Stripe Dashboard'da test webhook gönderin:

1. **Stripe Dashboard → Webhooks → Endpoint'inize Tıklayın**
2. **"Send test webhook" Butonuna Tıklayın**
3. **Event seçin:** `payment_intent.succeeded`
4. **"Send test webhook"**

**Başarılı ise:**

- Webhook gönderildi ✅
- Supabase function log'larında görünür ✅

**Hata alırsanız:**

- Webhook secret'ı kontrol edin
- Function log'larına bakın

---

## 🔍 Troubleshooting

### Problem: "Webhook signature verification failed"

**Çözüm:**

1. Supabase Secrets'te `STRIPE_WEBHOOK_SECRET` doğru mu kontrol edin
2. Stripe Dashboard'da webhook endpoint URL'i doğru mu kontrol edin
3. Secret'ı yeniden kopyalayıp Supabase'e ekleyin

### Problem: "No webhook endpoint found"

**Çözüm:**

1. Stripe Dashboard'da webhook endpoint oluşturuldu mu kontrol edin
2. Endpoint URL'i doğru mu kontrol edin:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
   ```

### Problem: "Event not received"

**Çözüm:**

1. Supabase Edge Functions → Logs'a bakın
2. Function deploy edildi mi kontrol edin
3. Webhook endpoint aktif mi kontrol edin

---

## 📝 Checklist

- [ ] Stripe Dashboard'da webhook endpoint oluşturdum
- [ ] Endpoint URL doğru (`https://...supabase.co/functions/v1/stripe-webhook`)
- [ ] Event'leri seçtim (`payment_intent.succeeded`, vb.)
- [ ] Webhook secret'ı kopyaladım (`whsec_...`)
- [ ] Supabase Secrets'e `STRIPE_WEBHOOK_SECRET` ekledim
- [ ] Test webhook gönderdim
- [ ] Function log'larında başarılı görünüyor

---

## 🎯 Sonuç

Webhook secret eklendikten sonra:

- ✅ Ödemeler başarılı olduğunda krediler otomatik eklenir
- ✅ Ödeme başarısız olduğunda bildirim gönderilir
- ✅ İadeler otomatik işlenir
- ✅ Güvenli webhook doğrulama çalışır

**Webhook olmadan Stripe entegrasyonu tamamlanmış sayılmaz!**
