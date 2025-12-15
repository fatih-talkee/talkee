# 🔧 Webhook 401 Hatası - Final Çözüm

## ❌ Sorun

Stripe webhook'ları hala `401 Unauthorized` hatası alıyor:

```
POST | 401 | https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook
```

## 🔍 Neden Oluyor?

Supabase Edge Functions varsayılan olarak **JWT verification** gerektirir. Ancak **Stripe webhook'ları JWT göndermez** - sadece `stripe-signature` header'ı gönderir.

## ✅ Çözüm: config.toml Güncellemesi

### 1. config.toml Dosyasını Güncelleyin ✅

`supabase/config.toml` dosyasında `stripe-webhook` function'ı için `verify_jwt = false` yapın:

```toml
[functions.stripe-webhook]
enabled = true
verify_jwt = false  # Webhook'lar public olmalı - Stripe JWT göndermez
import_map = "./functions/stripe-webhook/deno.json"
entrypoint = "./functions/stripe-webhook/index.ts"
```

**Değişiklik:** `verify_jwt = true` → `verify_jwt = false`

### 2. Function'ı Redeploy Edin (GEREKLİ)

**Supabase CLI ile:**

```bash
cd /Users/fatihb./Projects/talkee
supabase functions deploy stripe-webhook
```

**Veya Supabase Dashboard'dan:**

1. Supabase Dashboard → Edge Functions → stripe-webhook
2. "Deploy" veya "Redeploy" butonuna tıklayın

⚠️ **ÖNEMLİ:** `config.toml` değişikliği sadece redeploy sonrası etkili olur!

### 3. Test Edin

Stripe Dashboard'dan test webhook gönderin:

1. Stripe Dashboard → Webhooks → Endpoint'inize tıklayın
2. "Send test webhook" → `payment_intent.succeeded` seçin
3. "Send test webhook" butonuna tıklayın
4. Supabase logs'da `200 OK` görünmeli (401 değil!)

---

## 🔒 Güvenlik Notu

`verify_jwt = false` yapmak function'ı public yapar, ama:

- ✅ **Güvenlik:** Stripe signature verification ile sağlanıyor
- ✅ **Function içinde:** `stripe.webhooks.constructEventAsync()` ile signature kontrol ediliyor
- ✅ **Sadece Stripe'dan gelen istekler:** Signature verification başarılı olur

---

## 📋 Checklist

- [ ] `supabase/config.toml` dosyasında `verify_jwt = false` yapıldı
- [ ] Function redeploy edildi
- [ ] Stripe Dashboard'dan test webhook gönderildi
- [ ] Supabase logs'da `200 OK` görünüyor
- [ ] "Webhook event received" log'u görünüyor
- [ ] Wallet balance güncelleniyor
- [ ] Transaction history oluşuyor

---

## 🆘 Hala 401 Alıyorsanız

1. **Function'ı tekrar redeploy edin**

   ```bash
   supabase functions deploy stripe-webhook
   ```

2. **config.toml dosyasının doğru olduğundan emin olun**

   - `verify_jwt = false` olmalı
   - Function adı `stripe-webhook` olmalı

3. **Supabase Dashboard'dan kontrol edin**

   - Edge Functions → stripe-webhook → Settings
   - Authentication ayarı varsa "Public" olmalı

4. **Webhook secret kontrolü**
   - Supabase Dashboard → Edge Functions → Secrets
   - `STRIPE_WEBHOOK_SECRET` var mı kontrol edin

---

## 📚 İlgili Dokümanlar

- `docs/WEBHOOK_401_FIX.md` - İlk çözüm denemesi
- `docs/WEBHOOK_TEST_METHODS.md` - Webhook test yöntemleri
- `docs/COMPLETE_FIX_ACTION_PLAN.md` - Tüm sorunlar için eylem planı
