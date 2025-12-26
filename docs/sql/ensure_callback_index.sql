-- ============================================================================
-- ENSURE CALLBACK QUERY INDEX EXISTS
-- ============================================================================
-- Bu script, callback query için optimal partial index'in var olduğundan emin olur
-- Eğer yoksa oluşturur, varsa kontrol eder
-- ============================================================================

-- 1. Önce mevcut index'leri kontrol et
SELECT 
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'users' 
  AND (indexname LIKE '%auth_id%' OR indexname LIKE '%deleted%')
ORDER BY indexname;

-- 2. Optimal partial index'i oluştur (eğer yoksa)
-- Bu index callback query için en hızlı olanıdır:
-- WHERE auth_id = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_users_auth_id_deleted_at 
ON users(auth_id) 
WHERE deleted_at IS NULL;

-- 3. Index'in oluşturulduğunu doğrula
SELECT 
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
    CASE 
        WHEN indexdef LIKE '%WHERE deleted_at IS NULL%' THEN '✅ Partial index (optimal)'
        ELSE '⚠️ Full index (less optimal)'
    END as index_type
FROM pg_indexes
WHERE tablename = 'users' 
  AND indexname = 'idx_users_auth_id_deleted_at';

-- 4. Index kullanımını test et (EXPLAIN ANALYZE)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
  AND deleted_at IS NULL
LIMIT 1;

-- 5. Index istatistiklerini göster (birkaç query çalıştırdıktan sonra)
SELECT 
    indexrelname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_users_auth_id_deleted_at';

-- ============================================================================
-- NOT: Eğer index kullanılmıyorsa (idx_scan = 0), şunları kontrol et:
-- 1. PostgreSQL query planner index'i kullanıyor mu? (EXPLAIN ANALYZE sonucuna bak)
-- 2. Tablo istatistikleri güncel mi? (ANALYZE users; çalıştır)
-- 3. Index condition doğru mu? (deleted_at IS NULL kontrolü yapılıyor mu?)
-- ============================================================================

-- 6. Tablo istatistiklerini güncelle (index kullanımını optimize etmek için)
ANALYZE users;

-- 7. Tüm auth_id index'lerini karşılaştır
SELECT 
    indexrelname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
        WHEN indexrelname = 'idx_users_auth_id_deleted_at' THEN '✅ Recommended (partial)'
        WHEN indexrelname LIKE '%auth_id%' THEN '⚠️ Alternative'
        ELSE 'Other'
    END as recommendation
FROM pg_stat_user_indexes
WHERE indexrelname LIKE '%auth_id%'
ORDER BY idx_scan DESC;
