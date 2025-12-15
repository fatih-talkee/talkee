-- ============================================================================
-- CHECK USER EXISTS
-- ============================================================================
-- Bu script user'ın gerçekten var olup olmadığını kontrol eder

-- 1. User'ı kontrol et (YOUR_USER_ID'yi değiştirin)
SELECT 
  id,
  auth_id,
  name,
  primary_email,
  wallet_balance,
  created_at
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;

-- 2. Eğer user yoksa, auth.users tablosunda var mı kontrol et
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;

-- 3. Tüm users tablosundaki user'ları listele (ilk 10)
SELECT 
  id,
  auth_id,
  name,
  primary_email,
  wallet_balance
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 4. Function'ı manuel test et
SELECT add_user_credits(
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  10.00,
  'purchase',
  'Test credit',
  NULL
);
