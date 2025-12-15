# 🚀 Webhook Test ve Deploy Rehberi

## 📋 Adım Adım: Test ve Deploy

### 1. ✅ Kod Kontrolü

Kod zaten güncellendi:

- ✅ `supabase/functions/stripe-webhook/index.ts` güncellendi
- ✅ Tüm iyileştirmeler eklendi

---

## 🔧 Deploy Etme

### Yöntem 1: Supabase CLI ile Deploy (Önerilen)

```bash
# Supabase CLI ile login
supabase login

# Project'e bağlan
supabase link --project-ref hmimorflmdhcgjhlxbwn

# Function'ı deploy et
supabase functions deploy stripe-webhook
```

### Yöntem 2: Supabase Dashboard'dan Deploy

1. **Supabase Dashboard → Edge Functions**
2. **stripe-webhook** function'ını seç
3. **Deploy** butonuna tıkla
4. Veya **Code Editor**'dan direkt deploy edebilirsin

---

## 🧪 Test Etme

### Test 1: Stripe Dashboard'dan Test Webhook Gönderme

1. **Stripe Dashboard → Webhooks → Endpoint'inize Tıklayın**
2. **"Send test webhook"** butonuna tıklayın
3. **Event seçin:** `payment_intent.succeeded`
4. **"Send test webhook"**

**Beklenen Sonuç:**

- ✅ Webhook başarıyla gönderildi
- ✅ Supabase function log'larında görünür
- ✅ `credit_transactions` tablosuna kayıt yapıldı
- ✅ `transactions` tablosuna kayıt yapıldı
- ✅ Notification oluşturuldu

---

### Test 2: Gerçek Test Ödeme

1. **Test Kartı ile Ödeme Yap:**

   ```
   Kart No: 4242 4242 4242 4242
   CVV: Herhangi bir 3 haneli sayı
   Tarih: Gelecek bir tarih
   ```

2. **Kontrol Et:**
   - ✅ Ödeme başarılı oldu mu?
   - ✅ Krediler eklendi mi?
   - ✅ Transaction kaydı oluştu mu?
   - ✅ Notification geldi mi?
   - ✅ Stripe Dashboard'da invoice görünüyor mu?

---

### Test 3: Function Logs Kontrol

1. **Supabase Dashboard → Edge Functions → stripe-webhook**
2. **Logs** sekmesine git
3. **Son çalıştırmalara bak**

**Görmeniz Gerekenler:**

```json
{
  "event": "payment_success",
  "user_id": "...",
  "payment_intent_id": "pi_...",
  "amount": 10.0,
  "customer_id": "cus_...",
  "invoice_id": "in_...",
  "timestamp": "2024-..."
}
```

---

### Test 4: Database Kontrol

**Supabase Dashboard → Table Editor:**

1. **credit_transactions** tablosu:

   ```sql
   SELECT * FROM credit_transactions
   WHERE stripe_payment_intent_id = 'pi_...'
   ORDER BY created_at DESC;
   ```

2. **transactions** tablosu:

   ```sql
   SELECT * FROM transactions
   WHERE user_id = '...'
   AND type = 'credit_purchase'
   ORDER BY created_at DESC;
   ```

3. **notifications** tablosu:

   ```sql
   SELECT * FROM notifications
   WHERE user_id = '...'
   AND type = 'payment'
   ORDER BY created_at DESC;
   ```

4. **users** tablosu:
   ```sql
   SELECT id, stripe_customer_id FROM users
   WHERE id = '...';
   ```
   - `stripe_customer_id` dolu olmalı

---

## 🔍 Troubleshooting

### Problem: "Webhook signature verification failed"

**Çözüm:**

1. Supabase Secrets'te `STRIPE_WEBHOOK_SECRET` doğru mu kontrol et
2. Stripe Dashboard'da webhook endpoint URL'i doğru mu kontrol et
3. Secret'ı yeniden kopyalayıp Supabase'e ekle

---

### Problem: "User not found"

**Çözüm:**

1. Payment intent metadata'da `user_id` var mı kontrol et
2. User ID doğru mu kontrol et
3. User tablosunda user var mı kontrol et

---

### Problem: "Customer creation failed"

**Çözüm:**

1. User'ın `primary_email` var mı kontrol et
2. Stripe API key doğru mu kontrol et
3. Function log'larına bak

---

### Problem: "Invoice creation failed"

**Çözüm:**

- Bu opsiyonel, hata olsa bile payment işlemi devam eder
- Customer ID var mı kontrol et
- Stripe API key doğru mu kontrol et

---

### Problem: "Transaction already exists" (Idempotency)

**Bu Normal!**

- Aynı payment intent için duplicate işlem önleniyor
- Log'da "already processed" mesajı görünür
- Bu bir hata değil, özellik!

---

## ✅ Checklist

### Deploy Öncesi:

- [ ] Kod güncellendi
- [ ] `STRIPE_SECRET_KEY` Supabase Secrets'te var
- [ ] `STRIPE_WEBHOOK_SECRET` Supabase Secrets'te var
- [ ] Webhook endpoint Stripe Dashboard'da oluşturuldu

### Deploy:

- [ ] Function deploy edildi
- [ ] Deploy başarılı oldu

### Test:

- [ ] Test webhook gönderildi
- [ ] Function log'larında görünüyor
- [ ] Database'de kayıtlar oluştu
- [ ] Gerçek test ödeme yapıldı
- [ ] Tüm kayıtlar doğru

---

## 🎯 Hızlı Test Komutları

### Supabase CLI ile Logs Görme:

```bash
# Function logs
supabase functions logs stripe-webhook

# Real-time logs
supabase functions logs stripe-webhook --follow
```

### Database Query'leri:

```sql
-- Son ödemeleri kontrol et
SELECT
  ct.*,
  t.amount as transaction_amount,
  t.status as transaction_status
FROM credit_transactions ct
LEFT JOIN transactions t ON t.user_id = ct.user_id
  AND t.description LIKE '%' || ct.stripe_payment_intent_id || '%'
ORDER BY ct.created_at DESC
LIMIT 10;

-- Invoice kontrolü (Stripe Dashboard'dan)
-- Stripe Dashboard → Invoices → Son invoice'ları kontrol et
```

---

## 📝 Sonraki Adımlar

1. ✅ Function'ı deploy et
2. ✅ Test webhook gönder
3. ✅ Gerçek test ödeme yap
4. ✅ Logs kontrol et
5. ✅ Database kayıtlarını kontrol et
6. ✅ Production'a geç

---

## 🆘 Yardım

Sorun yaşarsanız:

1. Function log'larına bakın
2. Stripe Dashboard → Webhooks → Endpoint logs'a bakın
3. Database'deki kayıtları kontrol edin
4. `docs/PAYMENT_WEBHOOK_IMPROVEMENTS.md` dosyasına bakın
