# 🧪 Webhook Test Yöntemleri

## ❌ YANLIŞ: Supabase Dashboard'dan Manuel Test

**Neden çalışmaz:**

- Webhook function'ı `stripe-signature` header'ını bekliyor
- Bu header sadece Stripe'dan gelen gerçek webhook'larda var
- Manuel test'te bu header'ı gönderemezsiniz
- Bu normal bir güvenlik özelliği!

**Hata mesajı:**

```
400 Bad Request: Missing stripe-signature header
```

Bu hata, function'ın güvenlik kontrolünün çalıştığını gösterir ✅

---

## ✅ DOĞRU: Stripe Dashboard'dan Test Webhook Gönderme

### Adım 1: Stripe Dashboard'a Gidin

1. **Stripe Dashboard:**

   ```
   https://dashboard.stripe.com/test/webhooks
   ```

2. **Webhook endpoint'inize tıklayın:**
   - URL: `https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook`

### Adım 2: Test Webhook Gönderin

1. **"Send test webhook" butonuna tıklayın**

2. **Event seçin:**

   - `payment_intent.succeeded` seçin

3. **Test data'yı düzenleyin (opsiyonel):**

   - Stripe otomatik test data gönderir
   - Eğer özel metadata istiyorsanız, webhook endpoint'inizde "Edit" yapabilirsiniz

4. **"Send test webhook" butonuna tıklayın**

### Adım 3: Sonuçları Kontrol Edin

**Stripe Dashboard'da:**

- ✅ Event status: `Succeeded`
- ✅ Response: `200 OK`

**Supabase Dashboard'da:**

- Edge Functions → stripe-webhook → Logs
- ✅ "Webhook event received: payment_intent.succeeded"
- ✅ "Payment succeeded: ..."
- ✅ Status: `200 OK`

---

## ✅ ALTERNATİF: Gerçek Payment ile Test

### Adım 1: Uygulamada Payment Yapın

1. **Uygulamayı açın**
2. **Wallet sayfasına gidin**
3. **Credit package seçin** (örn: 50 credits = $50)
4. **Payment yapın** (Stripe test kartı kullanın):
   - Test kart: `4242 4242 4242 4242`
   - Expiry: Herhangi bir gelecek tarih
   - CVC: Herhangi bir 3 haneli sayı

### Adım 2: Payment Başarılı Olunca

Stripe otomatik olarak webhook gönderir:

- ✅ `payment_intent.succeeded` event'i gönderilir
- ✅ Webhook function'ı çalışır
- ✅ Wallet balance güncellenir
- ✅ Transaction history oluşur
- ✅ Notification oluşturulur

### Adım 3: Kontrol Edin

```sql
-- Wallet balance
SELECT wallet_balance
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;

-- Transaction history
SELECT * FROM transactions
WHERE user_id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid
ORDER BY created_at DESC
LIMIT 5;

-- Credit transactions
SELECT * FROM credit_transactions
WHERE user_id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔍 Webhook Logs Kontrolü

### Supabase Dashboard

1. **Edge Functions → stripe-webhook → Logs**

2. **Göreceğiniz log'lar:**

   ```
   ✅ Webhook event received: payment_intent.succeeded
   ✅ Payment succeeded: { user_id: "...", amount: 50, ... }
   ✅ Wallet balance updated successfully: { new_balance: 50 }
   ✅ Push notification sent successfully: { ... }
   ```

3. **Hata varsa:**
   ```
   ❌ Error processing payment: { error: "...", ... }
   ```

### Stripe Dashboard

1. **Webhooks → Endpoint'iniz → Events**

2. **Göreceğiniz:**
   - ✅ Event type: `payment_intent.succeeded`
   - ✅ Status: `Succeeded` (yeşil)
   - ✅ Response: `200 OK`
   - ✅ Timestamp: Ne zaman gönderildi

---

## 🆘 Sorun Giderme

### Sorun: "Missing stripe-signature header"

**Neden:** Supabase Dashboard'dan manuel test yapıyorsunuz
**Çözüm:** Stripe Dashboard'dan test webhook gönderin (yukarıdaki yöntem)

### Sorun: "Webhook signature verification failed"

**Neden:** `STRIPE_WEBHOOK_SECRET` yanlış veya eksik
**Çözüm:**

1. Stripe Dashboard → Webhooks → Endpoint'iniz → Signing secret'ı kopyalayın
2. Supabase Dashboard → Edge Functions → Secrets → `STRIPE_WEBHOOK_SECRET` güncelleyin
3. Function'ı redeploy edin

### Sorun: "401 Unauthorized"

**Neden:** Function authentication gerektiriyor
**Çözüm:**

1. Function'ı redeploy edin
2. Supabase Dashboard'dan function'ın public olduğundan emin olun
3. `docs/WEBHOOK_401_FIX.md` dosyasına bakın

### Sorun: Webhook çalışıyor ama balance güncellenmedi

**Neden:** `add_user_credits` function'ı çalışmadı veya user bulunamadı
**Çözüm:**

1. Supabase logs'da "Error adding credits" var mı kontrol edin
2. User `users` tablosunda var mı kontrol edin
3. `add_user_credits` function'ını manuel test edin:
   ```sql
   SELECT add_user_credits(
     'YOUR_USER_ID'::uuid,
     10.00,
     'purchase',
     'Test',
     NULL
   );
   ```

---

## 📋 Test Checklist

### Stripe Dashboard Test

- [ ] Stripe Dashboard → Webhooks → Endpoint'inize gittim
- [ ] "Send test webhook" butonuna tıkladım
- [ ] `payment_intent.succeeded` event'i seçtim
- [ ] "Send test webhook" butonuna tıkladım
- [ ] Event status: `Succeeded` görünüyor
- [ ] Response: `200 OK` görünüyor

### Supabase Logs Kontrolü

- [ ] Edge Functions → stripe-webhook → Logs'a gittim
- [ ] "Webhook event received" log'u görünüyor
- [ ] "Payment succeeded" log'u görünüyor
- [ ] "Wallet balance updated successfully" log'u görünüyor
- [ ] Status: `200 OK` görünüyor

### Database Kontrolü

- [ ] Wallet balance güncellendi
- [ ] Transaction kaydı oluştu
- [ ] Credit transaction kaydı oluştu
- [ ] Notification oluşturuldu

---

## 📚 İlgili Dokümanlar

- `docs/WEBHOOK_401_FIX.md` - Webhook 401 hatası çözümü
- `docs/TEST_STEPS_AFTER_USER_CREATED.md` - Test adımları
- `docs/COMPLETE_FIX_ACTION_PLAN.md` - Tüm sorunlar için eylem planı
