# 💳 Ödeme Kontrol Rehberi

10 dolar ödeme yaptıktan sonra, ödemenin başarılı olup olmadığını ve kayıtların doğru oluşturulup oluşturulmadığını kontrol etmek için bu rehberi kullanın.

---

## 📱 1. Uygulamadan Kontrol

### A. Wallet Sayfası (Ana Kontrol)

1. **Uygulamayı açın** ve **Wallet** sekmesine gidin (`/wallet`)
2. **Current Balance** kartında:
   - ✅ Balance'ınızın güncellendiğini kontrol edin
   - ✅ 10 dolar eklendi mi? (veya satın aldığınız credit miktarı)
3. **Recent Activity** bölümünde:
   - ✅ En son transaction'ınızı görüyor musunuz?
   - ✅ Transaction type: `credit_purchase`
   - ✅ Amount: `+$10.00` (veya satın aldığınız miktar)
   - ✅ Description: "Credit Purchase" veya benzeri

### B. Notifications Sayfası

1. **Notifications** sekmesine gidin (`/notifications`)
2. **Bildirim var mı?**
   - ✅ "Credit Purchase Successful" veya benzeri bir bildirim
   - ✅ Bildirimde `invoice_id` ve `invoice_url` var mı?

### C. Wallet History Sayfası

1. **Wallet** sayfasında **"History"** butonuna tıklayın (`/wallet-history`)
2. **Tüm transaction'ları** görüyor musunuz?
   - ✅ En son transaction listenin en üstünde
   - ✅ Type: `credit_purchase`
   - ✅ Status: `completed` veya `success`

---

## 💳 2. Stripe Dashboard'dan Kontrol

### A. Payment Intents

1. **Stripe Dashboard**'a gidin: https://dashboard.stripe.com/test/payments
2. **En son payment intent'i** bulun:
   - ✅ **Status:** `Succeeded` (yeşil)
   - ✅ **Amount:** $10.00
   - ✅ **Customer:** Email'iniz veya customer ID
   - ✅ **Metadata:**
     - `user_id`: Supabase user ID'niz
     - `type`: `credit_purchase` veya benzeri

### B. Invoices

1. **Stripe Dashboard** → **Invoices**: https://dashboard.stripe.com/test/invoices
2. **Invoice oluştu mu?**
   - ✅ En son invoice'u bulun
   - ✅ **Status:** `Paid`
   - ✅ **Amount:** $10.00
   - ✅ **Invoice PDF** indirilebilir mi?

### C. Events (Webhook Logs)

1. **Stripe Dashboard** → **Developers** → **Events**: https://dashboard.stripe.com/test/events
2. **Webhook event'leri:**
   - ✅ `payment_intent.succeeded` event'i var mı?
   - ✅ Event'in **status:** `Succeeded`
   - ✅ **Request details** → **Response:** `200 OK`

---

## 🗄️ 3. Supabase'den Kontrol

### A. Database Tables

#### 1. `credit_transactions` Tablosu

```sql
SELECT
  id,
  user_id,
  amount,
  type,
  payment_intent_id,
  stripe_invoice_id,
  created_at
FROM credit_transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**Kontrol edilecekler:**

- ✅ En son kayıt 10 dolar mı?
- ✅ `payment_intent_id` dolu mu? (Stripe Payment Intent ID)
- ✅ `stripe_invoice_id` dolu mu? (Stripe Invoice ID)
- ✅ `type`: `credit_purchase`
- ✅ `created_at`: Ödeme zamanıyla eşleşiyor mu?

#### 2. `transactions` Tablosu

```sql
SELECT
  id,
  user_id,
  amount,
  type,
  description,
  status,
  created_at
FROM transactions
WHERE user_id = 'YOUR_USER_ID'
  AND type = 'credit_purchase'
ORDER BY created_at DESC
LIMIT 5;
```

**Kontrol edilecekler:**

- ✅ En son transaction 10 dolar mı?
- ✅ `type`: `credit_purchase`
- ✅ `status`: `completed` veya `success`
- ✅ `description`: "Credit Purchase" veya benzeri

#### 3. `notifications` Tablosu

```sql
SELECT
  id,
  user_id,
  type,
  title,
  message,
  data,
  read,
  created_at
FROM notifications
WHERE user_id = 'YOUR_USER_ID'
  AND type = 'payment_success'
ORDER BY created_at DESC
LIMIT 5;
```

**Kontrol edilecekler:**

- ✅ En son bildirim var mı?
- ✅ `type`: `payment_success`
- ✅ `data` JSON'unda:
  - `invoice_id`: Stripe Invoice ID
  - `invoice_url`: Invoice URL
  - `amount`: 10.00

#### 4. `users` Tablosu (Credit Balance)

```sql
SELECT
  id,
  email,
  credits_balance,
  updated_at
FROM users
WHERE id = 'YOUR_USER_ID';
```

**Kontrol edilecekler:**

- ✅ `credits_balance`: Güncellendi mi? (10 dolar eklendi mi?)
- ✅ `updated_at`: Ödeme zamanından sonra mı?

### B. Edge Function Logs

1. **Supabase Dashboard** → **Edge Functions** → **stripe-webhook**
2. **Logs** sekmesine gidin
3. **En son log'ları** kontrol edin:
   - ✅ `payment_intent.succeeded` event'i işlendi mi?
   - ✅ `Payment succeeded:` log'u var mı?
   - ✅ `Credit added successfully` log'u var mı?
   - ✅ Hata var mı? (`Error handling webhook`)

---

## 🔍 Hızlı Kontrol SQL Sorguları

### Tüm Ödeme Bilgilerini Tek Sorguda Görmek

```sql
-- Ödeme bilgilerini tek sorguda göster
SELECT
  ct.id as credit_transaction_id,
  ct.amount as credit_amount,
  ct.payment_intent_id,
  ct.stripe_invoice_id,
  ct.created_at as credit_created_at,
  t.id as transaction_id,
  t.amount as transaction_amount,
  t.status as transaction_status,
  t.created_at as transaction_created_at,
  n.id as notification_id,
  n.title as notification_title,
  n.data as notification_data,
  n.created_at as notification_created_at,
  u.credits_balance,
  u.updated_at as user_updated_at
FROM credit_transactions ct
LEFT JOIN transactions t ON t.user_id = ct.user_id
  AND t.type = 'credit_purchase'
  AND ABS(EXTRACT(EPOCH FROM (t.created_at - ct.created_at))) < 5
LEFT JOIN notifications n ON n.user_id = ct.user_id
  AND n.type = 'payment_success'
  AND ABS(EXTRACT(EPOCH FROM (n.created_at - ct.created_at))) < 5
LEFT JOIN users u ON u.id = ct.user_id
WHERE ct.user_id = 'YOUR_USER_ID'
ORDER BY ct.created_at DESC
LIMIT 1;
```

---

## ❌ Sorun Giderme

### Problem: Balance güncellenmedi

**Kontrol edin:**

1. Webhook event'i Stripe'dan geldi mi? (Stripe Dashboard → Events)
2. Webhook Supabase'de işlendi mi? (Supabase → Edge Functions → Logs)
3. `add_user_credits` RPC fonksiyonu çalıştı mı?
4. `credit_transactions` tablosunda kayıt var mı?

### Problem: Transaction görünmüyor

**Kontrol edin:**

1. `transactions` tablosunda kayıt var mı?
2. `type` = `credit_purchase` mi?
3. Uygulama cache'i temizlendi mi? (Pull to refresh)

### Problem: Bildirim gelmedi

**Kontrol edin:**

1. `notifications` tablosunda kayıt var mı?
2. Uygulama bildirimleri çekiyor mu? (Notifications sayfasında refresh)
3. `read` = `false` mi? (Okunmamış)

### Problem: Invoice oluşmadı

**Kontrol edin:**

1. Stripe Dashboard → Invoices'da invoice var mı?
2. Webhook log'larında `Invoice created successfully` var mı?
3. `credit_transactions.stripe_invoice_id` dolu mu?

---

## 📞 Yardım

Eğer sorun devam ederse:

1. **Stripe Dashboard** → **Events** → En son `payment_intent.succeeded` event'inin detaylarını kontrol edin
2. **Supabase** → **Edge Functions** → **stripe-webhook** → **Logs** → Hata mesajlarını kontrol edin
3. **Supabase** → **Database** → **Table Editor** → İlgili tablolarda kayıtları manuel kontrol edin
