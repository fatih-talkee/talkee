-- ============================================================================
-- REMOVE UNUSED PARTIAL INDEX
-- ============================================================================
-- Partial index (idx_users_auth_id_deleted_at) neredeyse hiç kullanılmıyor
-- Composite index (idx_users_auth_id_deleted) zaten işi görüyor
-- Bu script gereksiz partial index'i kaldırır
-- ============================================================================

-- 1. Önce index kullanımını son kez kontrol et
SELECT 
    indexrelname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_users_auth_id_deleted_at';

-- 2. Eğer index_scans < 100 ise, gereksizdir - kaldır
-- NOT: Bu komutu sadece index gerçekten kullanılmıyorsa çalıştırın!
DROP INDEX IF EXISTS idx_users_auth_id_deleted_at;

-- 3. Composite index'in var olduğundan emin ol
CREATE INDEX IF NOT EXISTS idx_users_auth_id_deleted 
ON users(auth_id, deleted_at);

-- 4. Tablo istatistiklerini güncelle
ANALYZE users;

-- 5. Index'lerin durumunu kontrol et
SELECT 
    indexrelname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE '%auth_id%'
ORDER BY idx_scan DESC;

-- ============================================================================
-- NOT: Index kaldırdıktan sonra query performansını test edin
-- ============================================================================
