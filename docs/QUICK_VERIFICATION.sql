-- ============================================================================
-- HIZLI KONTROL QUERY'Sİ - user_devices Tablosu
-- ============================================================================
-- Bu query'yi çalıştırarak migration'ın başarılı olduğunu hızlıca kontrol edin.

SELECT
  'Table exists' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_devices'
    ) THEN 'true'
    ELSE 'false'
  END as result
UNION ALL
SELECT
  'RLS enabled',
  CASE 
    WHEN rowsecurity THEN 'true'
    ELSE 'false'
  END
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_devices'
UNION ALL
SELECT
  'Column count',
  COUNT(*)::text
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_devices'
UNION ALL
SELECT
  'Policy count',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_devices'
UNION ALL
SELECT
  'Index count',
  COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'user_devices'
UNION ALL
SELECT
  'Trigger count',
  COUNT(*)::text
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'user_devices';

-- ============================================================================
-- BEKLENEN SONUÇLAR:
-- ============================================================================
-- ✅ Table exists: true
-- ✅ RLS enabled: true
-- ✅ Column count: 10
-- ✅ Policy count: 4
-- ✅ Index count: 5
-- ✅ Trigger count: 1
