# 🔧 Webhook 401 Unauthorized Hatası - Çözüm Rehberi

## ❌ Sorun

Stripe webhook'ları `401 Unauthorized` hatası alıyor:

```
POST | 401 | https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook
```

## 🔍 Neden Oluyor?

Supabase Edge Functions varsayılan olarak authentication gerektirebilir. Ancak **Stripe webhook'ları Authorization header göndermez** - sadece `stripe-signature` header'ı gönderir.

Webhook güvenliği **signature verification** ile sağlanır, Authorization header ile değil.

## ✅ Çözüm

### 1. Function Kodu Güncellendi

`stripe-webhook/index.ts` dosyası güncellendi:

- Signature kontrolü eklendi
- Webhook secret kontrolü eklendi
- Daha iyi error handling

### 2. Supabase Dashboard'dan Function'ı Public Yapın

**ÖNEMLİ:** Supabase Edge Functions için authentication ayarlarını kontrol edin:

1. **Supabase Dashboard → Edge Functions → stripe-webhook**
2. **Settings** veya **Configuration** sekmesine gidin
3. **Authentication** ayarını kontrol edin:
   - ✅ **Public** olmalı (authentication gerektirmemeli)
   - ❌ **Authenticated** olmamalı

### 3. Alternatif: Function'ı Redeploy Edin

Eğer Supabase Dashboard'da authentication ayarı yoksa, function'ı redeploy edin:

```bash
# Supabase CLI ile
supabase functions deploy stripe-webhook

# Veya Supabase Dashboard'dan
# Edge Functions → stripe-webhook → Deploy
```

### 4. Webhook Secret Kontrolü

Webhook secret'ın doğru olduğundan emin olun:

1. **Supabase Dashboard → Edge Functions → Secrets**
2. `STRIPE_WEBHOOK_SECRET` var mı kontrol edin
3. Değer `whsec_...` ile başlamalı

### 5. Stripe Webhook Endpoint Kontrolü

Stripe Dashboard'da webhook endpoint'in doğru olduğundan emin olun:

1. **Stripe Dashboard → Developers → Webhooks**
2. Endpoint URL: `https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook`
3. **Signing secret** doğru mu kontrol edin

## 🧪 Test

### Test 1: Stripe Dashboard'dan Test Webhook Gönderin

1. **Stripe Dashboard → Webhooks → Endpoint'inize Tıklayın**
2. **"Send test webhook"** butonuna tıklayın
3. **Event:** `payment_intent.succeeded` seçin
4. **"Send test webhook"** butonuna tıklayın

**Beklenen Sonuç:**

- ✅ Status: `200 OK`
- ✅ Supabase logs'da "Webhook event received" görünmeli

### Test 2: Supabase Logs Kontrolü

1. **Supabase Dashboard → Edge Functions → stripe-webhook → Logs**
2. Son log'lara bakın:
   - ✅ "Webhook event received: payment_intent.succeeded" görünmeli
   - ❌ "401" veya "Unauthorized" görünmemeli

## 📋 Checklist

- [ ] Function kodu güncellendi (`stripe-webhook/index.ts`)
- [ ] Function redeploy edildi
- [ ] Supabase Dashboard'da function public olarak ayarlandı (eğer ayar varsa)
- [ ] `STRIPE_WEBHOOK_SECRET` Supabase Secrets'te var
- [ ] Stripe webhook endpoint URL doğru
- [ ] Test webhook gönderildi ve `200 OK` döndü
- [ ] Supabase logs'da "Webhook event received" görünüyor

## 🆘 Hala 401 Alıyorsanız

### Olası Nedenler:

1. **Function henüz redeploy edilmedi**

   - Çözüm: Function'ı redeploy edin

2. **Supabase'in authentication mekanizması aktif**

   - Çözüm: Supabase Dashboard'dan function'ı public yapın

3. **Webhook secret yanlış**

   - Çözüm: Stripe Dashboard'dan yeni secret alın ve Supabase'e ekleyin

4. **Stripe webhook endpoint URL yanlış**
   - Çözüm: Stripe Dashboard'da endpoint URL'ini kontrol edin

## 📚 İlgili Dokümanlar

- `docs/CHECK_STRIPE_SECRETS.md` - Stripe secrets kontrolü
- `docs/WEBHOOK_SECRET_SETUP.md` - Webhook secret kurulumu
- `docs/WEBHOOK_TEST_AND_DEPLOY.md` - Webhook test ve deploy
