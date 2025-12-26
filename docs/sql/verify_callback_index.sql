-- ============================================================================
-- VERIFY CALLBACK INDEX USAGE
-- ============================================================================
-- Bu sorgular partial index'in doğru oluşturulduğunu ve kullanıldığını kontrol eder

-- 1. Index'in varlığını ve tanımını kontrol et
SELECT 
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'users' 
  AND indexname = 'idx_users_auth_id_deleted_at';

-- 2. Index'in kullanıldığını görmek için query'yi tekrar çalıştır
-- (PostgreSQL query planner'ı en uygun index'i seçecek)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
  AND deleted_at IS NULL
LIMIT 1;

-- 3. Index kullanım istatistiklerini kontrol et (query çalıştırdıktan sonra)
SELECT 
    indexrelname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_users_auth_id_deleted_at';

-- 4. Her iki index'i karşılaştır
SELECT 
    indexrelname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexrelname IN ('idx_users_auth_id', 'idx_users_auth_id_deleted_at')
ORDER BY idx_scan DESC;
