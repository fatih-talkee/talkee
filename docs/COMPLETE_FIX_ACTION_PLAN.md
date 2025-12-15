# 🎯 Tüm Sorunlar İçin Eylem Planı

## 📊 Sorun Özeti

1. ❌ **401 Unauthorized** - Webhook çalışmıyor (EN KRİTİK)
2. ❌ **add_user_credits "User not found"** - Function user'ı bulamıyor
3. ❌ **payment_intents tablosu yok** - Database schema eksik (opsiyonel)

---

## 🔥 ÖNCELİK 1: 401 Unauthorized Hatası (EN KRİTİK)

### Sorun

Stripe webhook'ları `401 Unauthorized` hatası alıyor. Webhook hiç çalışmıyor, bu yüzden:

- ❌ Wallet balance güncellenmiyor
- ❌ Transaction history oluşmuyor
- ❌ Push notification gönderilmiyor
- ❌ Notification kaydı oluşmuyor

### Çözüm Adımları

#### 1. Function Kodu Güncellendi ✅

- `supabase/functions/stripe-webhook/index.ts` güncellendi
- Daha iyi error handling eklendi

#### 2. Function'ı Redeploy Edin (GEREKLİ)

**Supabase CLI ile:**

```bash
cd /Users/fatihb./Projects/talkee
supabase functions deploy stripe-webhook
```

**Veya Supabase Dashboard'dan:**

1. Supabase Dashboard → Edge Functions → stripe-webhook
2. "Deploy" veya "Redeploy" butonuna tıklayın

#### 3. Function'ın Public Olduğundan Emin Olun

Supabase Dashboard'da:

1. Edge Functions → stripe-webhook → Settings
2. Authentication ayarını kontrol edin
3. **Public** olmalı (authentication gerektirmemeli)

#### 4. Webhook Secret Kontrolü

1. Supabase Dashboard → Edge Functions → Secrets
2. `STRIPE_WEBHOOK_SECRET` var mı kontrol edin
3. Değer `whsec_...` ile başlamalı

#### 5. Test Edin

Stripe Dashboard'dan test webhook gönderin:

1. Stripe Dashboard → Webhooks → Endpoint'inize tıklayın
2. "Send test webhook" → `payment_intent.succeeded` seçin
3. "Send test webhook" butonuna tıklayın
4. Supabase logs'da `200 OK` görünmeli

**Detaylı rehber:** `docs/WEBHOOK_401_FIX.md`

---

## 🔥 ÖNCELİK 2: add_user_credits "User not found" Hatası

### Sorun

Function çalıştırıldığında:

```
ERROR: P0001: User not found: 9a366b55-a9ff-4e43-ada6-35b08a59ecaa
```

### Çözüm Adımları

#### 1. User'ın Var Olup Olmadığını Kontrol Edin

Supabase SQL Editor'de:

```sql
-- User'ı kontrol et
SELECT
  id,
  auth_id,
  name,
  primary_email,
  wallet_balance
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;
```

**Eğer sonuç boşsa:**

#### 2. Auth.users Tablosunda Var mı Kontrol Edin

```sql
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;
```

#### 3. User Sync Sorununu Çözün

Eğer user `auth.users`'da var ama `users` tablosunda yoksa:

**Seçenek A: Manuel Ekleyin**

```sql
-- Auth.users'dan bilgileri al
SELECT id, email, raw_user_meta_data->>'name' as name
FROM auth.users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;

-- Sonra users tablosuna ekleyin
INSERT INTO users (
  id,
  auth_id,
  name,
  primary_email,
  wallet_balance,
  role,
  created_at
)
VALUES (
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  'User Name', -- auth.users'dan alın
  'user@example.com', -- auth.users'dan alın
  0.00,
  'user',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
```

**Seçenek B: Auth Trigger Kontrolü**

- `auth.users` tablosuna insert olduğunda `users` tablosuna da ekleyen bir trigger olmalı
- Eğer yoksa, trigger oluşturun

#### 4. Function'ı Test Edin

```sql
SELECT add_user_credits(
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  10.00,
  'purchase',
  'Test credit',
  NULL
);

-- Balance kontrol
SELECT wallet_balance
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;
```

**Detaylı rehber:** `docs/ADD_USER_CREDITS_FIX.md`  
**SQL sorguları:** `docs/sql/check_user_exists.sql`

---

## 🔥 ÖNCELİK 3: payment_intents Tablosu (OPSİYONEL)

### Sorun

```sql
ERROR: 42P01: relation "payment_intents" does not exist
```

### Not

**Bu tablo webhook kodunda kullanılmıyor!** Webhook sadece şu tabloları kullanıyor:

- `credit_transactions` (stripe_payment_intent_id kolonunda saklanıyor)
- `transactions`
- `notifications`
- `users`

### Çözüm

**Seçenek A: Tabloyu Oluşturun (Eğer İsterseniz)**

```sql
CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
```

**Seçenek B: Sorguyu Güncelleyin**

Eğer `payment_intents` tablosunu sorgulamak istiyorsanız, bunun yerine:

```sql
-- payment_intents yerine credit_transactions kullanın
SELECT
  id,
  user_id,
  amount,
  stripe_payment_intent_id,
  created_at
FROM credit_transactions
WHERE stripe_payment_intent_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Test Checklist

### Webhook Test

- [ ] Function redeploy edildi
- [ ] Function public olarak ayarlandı
- [ ] `STRIPE_WEBHOOK_SECRET` Supabase Secrets'te var
- [ ] Stripe Dashboard'dan test webhook gönderildi
- [ ] Supabase logs'da `200 OK` görünüyor
- [ ] "Webhook event received" log'u görünüyor

### User Test

- [ ] User `users` tablosunda var
- [ ] Eğer yoksa, `auth.users`'da var mı kontrol edildi
- [ ] User sync sorunu çözüldü
- [ ] `add_user_credits` function test edildi ve çalışıyor
- [ ] Wallet balance güncellendi

### Payment Flow Test

- [ ] Credit purchase yapıldı
- [ ] Payment başarılı oldu
- [ ] Webhook çalıştı (200 OK)
- [ ] Wallet balance güncellendi
- [ ] Transaction history'de görünüyor
- [ ] Notification oluşturuldu
- [ ] Push notification gönderildi (eğer device token varsa)

---

## 📚 İlgili Dokümanlar

- `docs/WEBHOOK_401_FIX.md` - Webhook 401 hatası çözümü
- `docs/ADD_USER_CREDITS_FIX.md` - add_user_credits "User not found" çözümü
- `docs/sql/check_user_exists.sql` - User kontrol sorguları
- `docs/sql/update_add_user_credits_function.sql` - Function definition

---

## 🆘 Hala Sorun Varsa

### Debug İçin SQL Sorguları

```sql
-- 1. Son payment intent'leri kontrol et (credit_transactions'dan)
SELECT
  id,
  user_id,
  amount,
  stripe_payment_intent_id,
  created_at
FROM credit_transactions
WHERE stripe_payment_intent_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 2. User'ın wallet balance'ı
SELECT id, email, wallet_balance, updated_at
FROM users
WHERE id = 'YOUR_USER_ID';

-- 3. Transaction history
SELECT * FROM transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Notifications
SELECT * FROM notifications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

### Supabase Logs Kontrolü

1. **Edge Functions → stripe-webhook → Logs**

   - Son webhook çağrılarını görün
   - Hata mesajlarını kontrol edin

2. **Database → Logs**
   - SQL query hatalarını görün
   - Function execution hatalarını kontrol edin
