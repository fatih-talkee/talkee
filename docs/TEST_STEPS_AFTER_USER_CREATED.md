# ✅ User Eklendikten Sonra Test Adımları

## 🎯 Durum

- ✅ User `users` tablosuna eklendi
- ✅ Function redeploy edildi (webhook 401 sorunu için)
- ⏳ Şimdi test zamanı!

---

## 📋 Test Adımları (Öncelik Sırasına Göre)

### 1. ✅ add_user_credits Function'ını Test Edin

Supabase SQL Editor'de:

```sql
-- Function'ı test et
SELECT add_user_credits(
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  10.00,
  'purchase',
  'Test credit',
  NULL
);
```

**Beklenen Sonuç:**

```json
{
  "success": true,
  "new_balance": 10.0,
  "transaction_id": "...",
  "amount_added": 10.0
}
```

**Sonra kontrol edin:**

```sql
-- Wallet balance güncellendi mi?
SELECT
  id,
  name,
  wallet_balance,
  updated_at
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;

-- Transaction kaydı oluştu mu?
SELECT * FROM credit_transactions
WHERE user_id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid
ORDER BY created_at DESC
LIMIT 1;
```

**✅ Başarılı ise:** Function çalışıyor, devam edin.
**❌ Hata alırsanız:** Hata mesajını paylaşın.

---

### 2. ✅ Webhook'u Test Edin

#### A. Stripe Dashboard'dan Test Webhook Gönderin

1. **Stripe Dashboard'a gidin:**

   ```
   https://dashboard.stripe.com/test/webhooks
   ```

2. **Webhook endpoint'inize tıklayın:**

   - URL: `https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook`

3. **"Send test webhook" butonuna tıklayın**

4. **Event seçin:**

   - `payment_intent.succeeded` seçin

5. **Metadata'ya user_id ekleyin:**

   - Test webhook'ta metadata'ya şunu ekleyin:
     ```json
     {
       "user_id": "9a366b55-a9ff-4e43-ada6-35b08a59ecaa",
       "type": "credit_purchase"
     }
     ```

6. **"Send test webhook" butonuna tıklayın**

#### B. Supabase Logs Kontrolü

1. **Supabase Dashboard → Edge Functions → stripe-webhook → Logs**

2. **Göreceğiniz:**
   - ✅ Status: `200 OK` (401 değil!)
   - ✅ "Webhook event received: payment_intent.succeeded"
   - ✅ "Payment succeeded: ..."
   - ✅ "Wallet balance updated successfully: ..."

**✅ Başarılı ise:** Webhook çalışıyor, devam edin.
**❌ Hala 401 alıyorsanız:** Function'ı tekrar redeploy edin veya Supabase Dashboard'dan function'ın public olduğundan emin olun.

---

### 3. ✅ Gerçek Payment Flow Test Edin

#### A. Uygulamada Credit Purchase Yapın

1. **Uygulamayı açın**
2. **Wallet sayfasına gidin**
3. **Credit package seçin** (örn: 50 credits)
4. **Payment yapın** (Stripe test kartı kullanın)
5. **Payment başarılı mesajını görün**

#### B. Kontrol Edin

**1. Wallet Balance:**

```sql
SELECT wallet_balance
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;
```

- ✅ Balance güncellenmiş olmalı

**2. Transaction History:**

```sql
SELECT * FROM transactions
WHERE user_id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid
ORDER BY created_at DESC
LIMIT 5;
```

- ✅ Yeni transaction kaydı olmalı

**3. Credit Transactions:**

```sql
SELECT * FROM credit_transactions
WHERE user_id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid
ORDER BY created_at DESC
LIMIT 5;
```

- ✅ Yeni credit_transaction kaydı olmalı
- ✅ `stripe_payment_intent_id` dolu olmalı

**4. Notifications:**

```sql
SELECT * FROM notifications
WHERE user_id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid
ORDER BY created_at DESC
LIMIT 5;
```

- ✅ "Credits Added 💰" notification'ı olmalı

**5. Push Notification:**

- ✅ Cihazınızda push notification almalısınız (eğer device token varsa)

---

### 4. ✅ (Opsiyonel) Auth Trigger Oluşturun

Gelecekte yeni OAuth user'lar için otomatik sync sağlamak için:

```sql
-- docs/sql/create_auth_trigger.sql dosyasını çalıştırın
```

Bu trigger, `auth.users` tablosuna yeni user eklendiğinde otomatik olarak `users` tablosuna da ekler.

**Test için:**

1. Yeni bir Google account ile login yapın
2. User otomatik olarak `users` tablosuna eklenmeli
3. Kontrol edin:
   ```sql
   SELECT * FROM users
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

## ✅ Checklist

### Function Test

- [ ] `add_user_credits` function test edildi
- [ ] Function başarılı sonuç döndü
- [ ] Wallet balance güncellendi
- [ ] Credit transaction kaydı oluştu

### Webhook Test

- [ ] Stripe Dashboard'dan test webhook gönderildi
- [ ] Supabase logs'da `200 OK` görünüyor
- [ ] "Webhook event received" log'u görünüyor
- [ ] 401 hatası yok

### Payment Flow Test

- [ ] Uygulamada credit purchase yapıldı
- [ ] Payment başarılı oldu
- [ ] Wallet balance güncellendi
- [ ] Transaction history'de görünüyor
- [ ] Credit transaction kaydı oluştu
- [ ] Notification oluşturuldu
- [ ] Push notification alındı (eğer device token varsa)

### Auth Trigger (Opsiyonel)

- [ ] Auth trigger oluşturuldu
- [ ] Yeni OAuth user test edildi
- [ ] User otomatik olarak `users` tablosuna eklendi

---

## 🆘 Sorun Giderme

### Function Test Başarısız

**Hata:** "User not found"

- **Çözüm:** User'ın `users` tablosunda olduğundan emin olun

**Hata:** "relation does not exist"

- **Çözüm:** `user_credits` veya `credit_transactions` tabloları var mı kontrol edin

### Webhook Test Başarısız

**Hata:** Hala 401 alıyorsunuz

- **Çözüm 1:** Function'ı tekrar redeploy edin
- **Çözüm 2:** Supabase Dashboard'dan function'ın public olduğundan emin olun
- **Çözüm 3:** `STRIPE_WEBHOOK_SECRET` Supabase Secrets'te var mı kontrol edin

**Hata:** "Webhook signature verification failed"

- **Çözüm:** `STRIPE_WEBHOOK_SECRET` doğru mu kontrol edin

### Payment Flow Başarısız

**Sorun:** Payment başarılı ama balance güncellenmedi

- **Çözüm 1:** Webhook çalıştı mı kontrol edin (Supabase logs)
- **Çözüm 2:** `add_user_credits` function'ı çalıştı mı kontrol edin
- **Çözüm 3:** User'ın `users` tablosunda olduğundan emin olun

**Sorun:** Push notification gelmedi

- **Çözüm 1:** Device token var mı kontrol edin:
  ```sql
  SELECT * FROM user_devices
  WHERE user_id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid
    AND is_active = true;
  ```
- **Çözüm 2:** Notification permissions verildi mi kontrol edin
- **Çözüm 3:** `send-push` function'ı çalıştı mı kontrol edin (Supabase logs)

---

## 📚 İlgili Dokümanlar

- `docs/WEBHOOK_401_FIX.md` - Webhook 401 hatası çözümü
- `docs/ADD_USER_CREDITS_FIX.md` - add_user_credits "User not found" çözümü
- `docs/COMPLETE_FIX_ACTION_PLAN.md` - Tüm sorunlar için eylem planı
- `docs/sql/create_auth_trigger.sql` - Auth trigger oluşturma

---

## 🎉 Başarı!

Tüm testler başarılı ise:

- ✅ Wallet balance çalışıyor
- ✅ Transaction history çalışıyor
- ✅ Push notifications çalışıyor
- ✅ Webhook çalışıyor
- ✅ Payment flow tamamlandı

Artık production'a hazırsınız! 🚀
