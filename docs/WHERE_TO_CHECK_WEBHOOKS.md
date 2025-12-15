# 🔍 Webhook'ları Nerede Kontrol Edeceğim?

## ⚠️ ÖNEMLİ: İki Farklı Webhook Türü Var!

### 1. 🎯 Stripe Webhooks (Stripe'tan gelen)

**Nerede kontrol edilir:** **Stripe Dashboard**

### 2. 🗄️ Database Webhooks (Supabase'in kendi özelliği)

**Nerede kontrol edilir:** **Supabase Dashboard → Integrations → Database Webhooks**

**Bunlar farklı şeyler!**

---

## ✅ Stripe Webhook'larını Kontrol Etme

### Yer 1: Stripe Dashboard (ÖNERİLEN)

1. **Stripe Dashboard'a git:**

   ```
   https://dashboard.stripe.com/test/webhooks
   ```

2. **Webhooks → Endpoints**

   - Endpoint'inizi bulun
   - "Events" sekmesine tıklayın
   - Gönderilen event'leri görün

3. **Göreceğiniz:**
   - ✅ Event type: `payment_intent.succeeded`
   - ✅ Status: `Succeeded` veya `Failed`
   - ✅ Response: `200 OK` veya hata
   - ✅ Timestamp

---

### Yer 2: Supabase Edge Functions

1. **Supabase Dashboard → Edge Functions**
2. **stripe-webhook** function'ını seç
3. **Logs** sekmesine tıkla
4. **Göreceğiniz:**
   - ✅ Function çalıştı mı?
   - ✅ Log mesajları
   - ✅ Hata varsa hata mesajları

---

## ❌ Database Webhooks (Yanlış Yer!)

**Supabase Dashboard → Integrations → Database Webhooks**

Bu bölüm:

- ❌ Stripe webhook'ları için **DEĞİL**
- ✅ Supabase database'de tablo değişikliklerinde webhook göndermek için
- ✅ Örnek: `users` tablosuna insert olduğunda başka bir API'ye webhook gönder

**Stripe webhook'ları için kullanılmaz!**

---

## 🎯 Hızlı Kontrol Rehberi

### Stripe Webhook'ları için:

1. ✅ **Stripe Dashboard → Webhooks → Events**

   - Event'lerin gönderildiğini görün
   - Status kontrol edin

2. ✅ **Supabase Dashboard → Edge Functions → stripe-webhook → Logs**

   - Function'ın çalıştığını görün
   - Log mesajlarını kontrol edin

3. ✅ **Supabase Dashboard → Table Editor**
   - `credit_transactions` tablosuna kayıt yapıldı mı?
   - `transactions` tablosuna kayıt yapıldı mı?
   - `notifications` tablosuna bildirim eklendi mi?

---

## 📊 Karşılaştırma

| Özellik                    | Stripe Webhooks   | Database Webhooks            |
| -------------------------- | ----------------- | ---------------------------- |
| **Nerede kontrol edilir?** | Stripe Dashboard  | Supabase Dashboard           |
| **Ne zaman tetiklenir?**   | Stripe event'leri | Database değişiklikleri      |
| **Nerede görünür?**        | Stripe → Webhooks | Supabase → Database Webhooks |
| **Bizim kullandığımız**    | ✅ Evet           | ❌ Hayır                     |

---

## 🔍 Doğru Kontrol Yerleri

### Test Webhook Gönderdikten Sonra:

1. **Stripe Dashboard → Webhooks → Events**

   - Event gönderildi mi? ✅
   - Status başarılı mı? ✅

2. **Supabase Dashboard → Edge Functions → stripe-webhook → Logs**

   - Function çalıştı mı? ✅
   - Log mesajları var mı? ✅

3. **Supabase Dashboard → Table Editor**
   - Database kayıtları oluştu mu? ✅

---

## 🚨 Yaygın Hata

**YANLIŞ:** Supabase → Database Webhooks'da Stripe webhook'larını aramak
**DOĞRU:** Stripe Dashboard → Webhooks'da kontrol etmek

---

## 📝 Özet

**Stripe webhook'larını kontrol etmek için:**

1. ✅ **Stripe Dashboard** → Webhooks → Events (ÖNERİLEN)
2. ✅ **Supabase Dashboard** → Edge Functions → stripe-webhook → Logs
3. ✅ **Supabase Dashboard** → Table Editor (Database kayıtları)

**Database Webhooks bölümü:**

- ❌ Stripe webhook'ları için **DEĞİL**
- ✅ Supabase'in kendi database webhook özelliği
