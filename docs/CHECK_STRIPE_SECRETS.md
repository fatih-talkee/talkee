# 🔍 Stripe Secrets Kontrol Rehberi

## Yöntem 1: Supabase Dashboard'dan Kontrol (En Kolay)

### ⚠️ ÖNEMLİ: Doğru Yere Git!

**YANLIŞ:** Settings → API Keys (Bu Supabase'in kendi key'leri için)
**DOĞRU:** Settings → Secrets veya Edge Functions → Secrets

### Adımlar:

1. **Supabase Dashboard'a Git**

   ```
   https://supabase.com/dashboard
   ```

2. **Projenizi Seçin**

   - Project: `hmimorflmdhcgjhlxbwn` (veya proje adınız)

3. **Secrets Bölümüne Git** (İki yol var):

   **Yol 1: Settings → Secrets**

   - Sol menüden **Settings** → **Secrets**
   - (Bazı Supabase versiyonlarında "API" → "Secrets" olabilir)

   **Yol 2: Edge Functions → Secrets**

   - Sol menüden **Edge Functions** → **Secrets**

   ⚠️ **"API Keys" bölümü değil!** O Supabase'in kendi key'leri için.

4. **Kontrol Et:**
   - `STRIPE_SECRET_KEY` var mı?
   - `STRIPE_WEBHOOK_SECRET` var mı?

### Görünmesi Gereken:

```
Secrets:
├── STRIPE_SECRET_KEY = sk_test_... (veya sk_live_...)
└── STRIPE_WEBHOOK_SECRET = whsec_...
```

---

## Yöntem 2: Supabase CLI ile Kontrol

### Kurulum (eğer yoksa):

```bash
npm install -g supabase
```

### Kontrol:

```bash
# Supabase CLI ile login
supabase login

# Secrets listesi
supabase secrets list
```

---

## Yöntem 3: Function Test ile Kontrol

### Test Payment Intent Function:

```bash
# Supabase Functions test
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/create-payment-intent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "userId": "test-user-id"
  }'
```

**Eğer hata alırsanız:**

- `STRIPE_SECRET_KEY is not defined` → Secret yok, eklemeniz gerekiyor
- `Invalid API Key` → Secret yanlış, güncellemeniz gerekiyor

---

## Yöntem 4: Function Logs Kontrol

### Supabase Dashboard → Functions → Logs

1. **Functions** → **create-payment-intent**
2. **Logs** sekmesine git
3. Son çalıştırmalara bak
4. Hata mesajlarını kontrol et

**Olası Hatalar:**

- `STRIPE_SECRET_KEY environment variable is not set`
- `Invalid API Key provided`

---

## ❌ Eğer Secrets Yoksa

### Adım 1: Stripe Keys'i Al

1. **Stripe Dashboard**

   - Test: https://dashboard.stripe.com/test/apikeys
   - Secret key: `sk_test_...`

2. **Webhook Secret**
   - Developers → Webhooks
   - Endpoint oluştur: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Secret'ı kopyala: `whsec_...`

### Adım 2: Supabase Secrets'e Ekle

**Supabase Dashboard → Settings → Secrets:**

1. **Add Secret** butonuna tıkla
2. **Name:** `STRIPE_SECRET_KEY`
3. **Value:** `sk_test_...` (Stripe'den aldığınız)
4. **Save**

5. Tekrar **Add Secret**
6. **Name:** `STRIPE_WEBHOOK_SECRET`
7. **Value:** `whsec_...` (Webhook'tan aldığınız)
8. **Save**

---

## ✅ Hızlı Test

### Test Script:

```bash
# Test payment intent oluşturma
curl -X POST \
  https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/create-payment-intent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "userId": "test-123"
  }'
```

**Başarılı Response:**

```json
{
  "clientSecret": "pi_...",
  "paymentIntentId": "pi_..."
}
```

**Hata Response:**

```json
{
  "error": "STRIPE_SECRET_KEY environment variable is not set"
}
```

---

## 📝 Checklist

- [ ] Supabase Dashboard'a gittim
- [ ] Settings → Secrets kontrol ettim
- [ ] `STRIPE_SECRET_KEY` var mı? ✅ / ❌
- [ ] `STRIPE_WEBHOOK_SECRET` var mı? ✅ / ❌
- [ ] Yoksa ekledim
- [ ] Test payment intent çalışıyor mu? ✅ / ❌

---

## 🆘 Sorun Giderme

### Problem: "Secret not found"

**Çözüm:**

- Supabase Dashboard → Secrets
- Secret'ı ekle veya ismini kontrol et
- Function'ı redeploy et

### Problem: "Invalid API Key"

**Çözüm:**

- Stripe Dashboard'dan key'i yeniden kopyala
- Supabase Secrets'te güncelle
- Function'ı redeploy et

### Problem: "Webhook signature verification failed"

**Çözüm:**

- Webhook secret'ı kontrol et
- Stripe Dashboard'da webhook endpoint URL'ini kontrol et
- Secret'ı yeniden kopyala ve güncelle
