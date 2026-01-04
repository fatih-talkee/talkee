# 🔐 TWILIO_WEBHOOK_URL Environment Variable Setup

## 📋 Adım Adım: Supabase Dashboard'da TWILIO_WEBHOOK_URL Ayarlama

### 1. Supabase Dashboard'a Git

1. **Supabase Dashboard'u aç:**

   ```
   https://supabase.com/dashboard
   ```

2. **Projeyi seç:**
   - Proje: `hmimorflmdhcgjhlxbwn` (veya proje adınız)

### 2. Edge Functions → Secrets Bölümüne Git

1. **Sol menüden "Edge Functions" seç**
2. **"Secrets" sekmesine tıkla**
3. **"ADD OR REPLACE SECRETS" bölümünü bul**

### 3. TWILIO_WEBHOOK_URL Secret'ını Ekle/Güncelle

**Name:** `TWILIO_WEBHOOK_URL`

**Value:**

```
https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/twilio-webhook/voice
```

⚠️ **Önemli:**

- ✅ HTTPS kullan (HTTP değil)
- ✅ `/functions/v1/` path'ini dahil et
- ✅ `/voice` path'ini dahil et (Twilio Console'da bu path kullanılıyor)

### 4. Save Butonuna Tıkla

Secret kaydedildikten sonra Edge Function'lar otomatik olarak yeni environment variable'ı kullanacak.

---

## ✅ Doğrulama

### Test 1: Secret Eklendi mi?

Supabase Dashboard → Edge Functions → Secrets

- `TWILIO_WEBHOOK_URL` ✅ görünüyor mu?
- Value doğru mu? (`https://.../functions/v1/twilio-webhook/voice`)

### Test 2: Webhook Loglarını Kontrol Et

Yeni bir call yaptıktan sonra webhook loglarını kontrol et:

1. **Supabase Dashboard → Edge Functions → twilio-webhook → Logs**

2. **Şu log'u ara:**

   ```
   🔐 [twilio-webhook] Signature verification details
   ```

3. **Kontrol et:**
   - ✅ `ConfiguredUrl`: `https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/twilio-webhook/voice`
   - ✅ `HasAuthToken`: `true`
   - ✅ Signature verification başarılı mı? (`✅ [twilio-webhook] Signature verification successful`)

---

## 🔧 Alternatif: Supabase CLI ile (Eğer login olduysan)

```bash
# Supabase CLI'ye login ol
supabase login

# Secret'ı set et
supabase secrets set TWILIO_WEBHOOK_URL="https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/twilio-webhook/voice" --project-ref hmimorflmdhcgjhlxbwn
```

---

## 📝 Notlar

- **TWILIO_AUTH_TOKEN** zaten set edilmiş olmalı (signature verification için)
- **TWILIO_WEBHOOK_URL** sadece signature verification için kullanılıyor
- Eğer `TWILIO_WEBHOOK_URL` set edilmezse, `req.url` fallback olarak kullanılır (ama bu her zaman doğru çalışmayabilir)

---

## 🐛 Sorun Giderme

### Sorun: Signature verification hala başarısız

**Kontrol et:**

1. `TWILIO_WEBHOOK_URL` doğru mu? (HTTPS, `/functions/v1/` path'i var mı?)
2. Twilio Console'da webhook URL'i ile eşleşiyor mu?
3. `TWILIO_AUTH_TOKEN` doğru mu?

### Sorun: `TWILIO_WEBHOOK_URL` görünmüyor

**Çözüm:**

- Secret'ı tekrar ekle
- Edge Function'ı redeploy et: `supabase functions deploy twilio-webhook`
