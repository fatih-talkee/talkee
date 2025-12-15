-- 🚀 Hızlı Ödeme Kontrol SQL Sorguları
-- 10 dolar ödeme yaptıktan sonra bu sorguları Supabase SQL Editor'de çalıştırın

-- ============================================
-- 1. USER ID'NİZİ BULUN (Email ile)
-- ============================================
-- Önce kendi user ID'nizi bulun:
SELECT id, primary_email, name, credits_balance, updated_at
FROM users
WHERE primary_email = 'YOUR_EMAIL@example.com'; -- Email'inizi yazın
-- VEYA
SELECT id, primary_email, name, credits_balance, updated_at
FROM users
ORDER BY updated_at DESC
LIMIT 5; -- En son güncellenen kullanıcılar

-- ============================================
-- 2. TÜM ÖDEME BİLGİLERİNİ TEK SORGUDA GÖRÜN
-- ============================================
-- YOUR_USER_ID'yi yukarıdaki sorgudan aldığınız ID ile değiştirin
WITH latest_payment AS (
  SELECT 
    ct.id as credit_transaction_id,
    ct.user_id,
    ct.amount as credit_amount,
    ct.type as credit_type,
    ct.stripe_payment_intent_id,
    ct.stripe_invoice_id,
    ct.created_at as credit_created_at,
    u.credits_balance,
    u.primary_email,
    u.updated_at as user_updated_at
  FROM credit_transactions ct
  JOIN users u ON u.id = ct.user_id
  WHERE ct.user_id = 'YOUR_USER_ID' -- ⚠️ BURAYA USER ID'NİZİ YAZIN
  ORDER BY ct.created_at DESC
  LIMIT 1
)
SELECT 
  lp.*,
  t.id as transaction_id,
  t.amount as transaction_amount,
  t.type as transaction_type,
  t.status as transaction_status,
  t.description as transaction_description,
  t.created_at as transaction_created_at,
  n.id as notification_id,
  n.type as notification_type,
  n.title as notification_title,
  n.message as notification_message,
  n.data as notification_data,
  n.read as notification_read,
  n.created_at as notification_created_at
FROM latest_payment lp
LEFT JOIN transactions t ON t.user_id = lp.user_id 
  AND t.type = 'credit_purchase'
  AND ABS(EXTRACT(EPOCH FROM (t.created_at - lp.credit_created_at))) < 10 -- 10 saniye içinde
LEFT JOIN notifications n ON n.user_id = lp.user_id 
  AND n.type = 'payment'
  AND ABS(EXTRACT(EPOCH FROM (n.created_at - lp.credit_created_at))) < 10 -- 10 saniye içinde
ORDER BY lp.credit_created_at DESC;

-- ============================================
-- 3. CREDIT TRANSACTIONS (Detaylı)
-- ============================================
SELECT 
  id,
  user_id,
  amount,
  type,
  stripe_payment_intent_id,
  stripe_invoice_id,
  description,
  created_at,
  updated_at
FROM credit_transactions
WHERE user_id = 'YOUR_USER_ID' -- ⚠️ BURAYA USER ID'NİZİ YAZIN
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 4. TRANSACTIONS (Wallet History)
-- ============================================
SELECT 
  id,
  user_id,
  amount,
  type,
  description,
  status,
  created_at,
  updated_at
FROM transactions
WHERE user_id = 'YOUR_USER_ID' -- ⚠️ BURAYA USER ID'NİZİ YAZIN
  AND type = 'credit_purchase'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 5. NOTIFICATIONS (Bildirimler)
-- ============================================
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  data,
  read,
  created_at,
  updated_at
FROM notifications
WHERE user_id = 'YOUR_USER_ID' -- ⚠️ BURAYA USER ID'NİZİ YAZIN
  AND type = 'payment'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 6. USER CREDIT BALANCE (Kullanıcı Bakiyesi)
-- ============================================
SELECT 
  id,
  primary_email,
  name,
  credits_balance,
  stripe_customer_id,
  created_at,
  updated_at
FROM users
WHERE id = 'YOUR_USER_ID'; -- ⚠️ BURAYA USER ID'NİZİ YAZIN

-- ============================================
-- 7. SON 24 SAATTEKİ TÜM ÖDEMELER (Özet)
-- ============================================
SELECT 
  u.primary_email,
  u.name,
  ct.amount,
  ct.stripe_payment_intent_id,
  ct.stripe_invoice_id,
  ct.created_at,
  u.credits_balance as current_balance
FROM credit_transactions ct
JOIN users u ON u.id = ct.user_id
WHERE ct.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY ct.created_at DESC;

-- ============================================
-- 8. ÖDEME İSTATİSTİKLERİ (Toplam)
-- ============================================
SELECT 
  COUNT(*) as total_purchases,
  SUM(amount) as total_amount,
  AVG(amount) as average_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount,
  MIN(created_at) as first_purchase,
  MAX(created_at) as last_purchase
FROM credit_transactions
WHERE user_id = 'YOUR_USER_ID' -- ⚠️ BURAYA USER ID'NİZİ YAZIN
  AND type = 'purchase';

-- ============================================
-- 9. WEBHOOK İŞLEM KONTROLÜ (Idempotency Check)
-- ============================================
-- Aynı payment intent iki kez işlenmiş mi?
SELECT 
  stripe_payment_intent_id,
  COUNT(*) as count,
  ARRAY_AGG(id) as transaction_ids,
  ARRAY_AGG(created_at) as created_times
FROM credit_transactions
WHERE stripe_payment_intent_id IS NOT NULL
GROUP BY stripe_payment_intent_id
HAVING COUNT(*) > 1; -- Eğer sonuç varsa, duplicate var demektir!

-- ============================================
-- 10. EKSİK KAYIT KONTROLÜ
-- ============================================
-- Credit transaction var ama transaction yok mu?
SELECT 
  ct.id as credit_transaction_id,
  ct.user_id,
  ct.amount,
  ct.stripe_payment_intent_id,
  ct.created_at,
  'Missing transaction record' as issue
FROM credit_transactions ct
LEFT JOIN transactions t ON t.user_id = ct.user_id 
  AND t.type = 'credit_purchase'
  AND ABS(EXTRACT(EPOCH FROM (t.created_at - ct.created_at))) < 10
WHERE ct.user_id = 'YOUR_USER_ID' -- ⚠️ BURAYA USER ID'NİZİ YAZIN
  AND t.id IS NULL
ORDER BY ct.created_at DESC;

-- Credit transaction var ama notification yok mu?
SELECT 
  ct.id as credit_transaction_id,
  ct.user_id,
  ct.amount,
  ct.stripe_payment_intent_id,
  ct.created_at,
  'Missing notification record' as issue
FROM credit_transactions ct
LEFT JOIN notifications n ON n.user_id = ct.user_id 
  AND n.type = 'payment'
  AND ABS(EXTRACT(EPOCH FROM (n.created_at - ct.created_at))) < 10
WHERE ct.user_id = 'YOUR_USER_ID' -- ⚠️ BURAYA USER ID'NİZİ YAZIN
  AND n.id IS NULL
ORDER BY ct.created_at DESC;
