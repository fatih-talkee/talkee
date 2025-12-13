-- ============================================================================
-- VERIFICATION QUERIES - user_devices Table
-- ============================================================================
-- Bu query'leri Supabase SQL Editor'da çalıştırarak migration'ın başarılı
-- olduğunu doğrulayabilirsiniz.

-- ============================================================================
-- 1. TABLO YAPISINI KONTROL ET
-- ============================================================================
-- Beklenen: 10 kolon görmelisiniz
SELECT 
  'user_devices table structure' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_devices'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. RLS DURUMUNU KONTROL ET
-- ============================================================================
-- Beklenen: rls_enabled = true
SELECT 
  'RLS status' as status,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_devices';

-- ============================================================================
-- 3. RLS POLICY'LERİNİ KONTROL ET
-- ============================================================================
-- Beklenen: 4 policy görmelisiniz
SELECT 
  'RLS policies' as status,
  policyname,
  cmd as command_type
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_devices'
ORDER BY policyname;

-- Policy sayısını görmek için:
SELECT 
  'RLS policies count' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_devices';

-- ============================================================================
-- 4. INDEX'LERİ KONTROL ET (Zaten yaptınız ✅)
-- ============================================================================
-- Beklenen: 5 index görmelisiniz
SELECT 
  'Indexes' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'user_devices'
ORDER BY indexname;

-- ============================================================================
-- 5. CONSTRAINT'LERİ KONTROL ET
-- ============================================================================
-- Beklenen: 
-- - Primary key constraint
-- - Unique constraint (user_id, push_token)
-- - Check constraint (platform)
-- - Foreign key constraint (user_id -> users)
SELECT 
  'Constraints' as status,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_devices'::regclass
ORDER BY contype, conname;

-- ============================================================================
-- 6. TRIGGER'LARI KONTROL ET
-- ============================================================================
-- Beklenen: updated_at trigger'ı olmalı
SELECT 
  'Triggers' as status,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'user_devices'
ORDER BY trigger_name;

-- ============================================================================
-- 7. KOLONLARIN DETAYLI BİLGİLERİ
-- ============================================================================
-- Tüm kolonların detaylı bilgilerini görmek için:
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_devices'
ORDER BY ordinal_position;

-- ============================================================================
-- 8. ÖRNEK VERİ KONTROLÜ (Eğer veri varsa)
-- ============================================================================
-- Eğer tabloda veri varsa, örnek kayıtları görmek için:
-- (Sadece kendi cihazınızı görebilirsiniz - RLS nedeniyle)
SELECT 
  id,
  user_id,
  platform,
  device_name,
  device_id,
  is_active,
  created_at,
  updated_at
FROM public.user_devices
ORDER BY created_at DESC
LIMIT 5;
