-- ============================================================================
-- CREATE USER FROM AUTH.USERS
-- ============================================================================
-- Bu script auth.users tablosundaki user'ı users tablosuna ekler
-- OAuth login sonrası user sync sorunu için kullanılır

-- User'ı users tablosuna ekle
INSERT INTO users (
  id,
  auth_id,
  name,
  primary_email,
  avatar_url,
  wallet_balance,
  role,
  oauth_providers,
  oauth_emails,
  created_at,
  updated_at
)
VALUES (
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  'Fatih Talkee',
  'fatih@talkee.net',
  'https://lh3.googleusercontent.com/a/ACg8ocLgsj8CeTx3rP1lpff1LB2DMOMzl8TS-SJBEzMSiKZWGLoLuw=s96-c',
  0.00,
  'user',
  '["google"]'::jsonb,
  jsonb_build_object('google', 'fatih@talkee.net'),
  '2025-12-09 11:32:08.781043+00'::timestamptz,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  primary_email = EXCLUDED.primary_email,
  avatar_url = EXCLUDED.avatar_url,
  oauth_providers = EXCLUDED.oauth_providers,
  oauth_emails = EXCLUDED.oauth_emails,
  updated_at = NOW();

-- Kontrol et
SELECT 
  id,
  auth_id,
  name,
  primary_email,
  wallet_balance,
  role,
  oauth_providers,
  created_at
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;
