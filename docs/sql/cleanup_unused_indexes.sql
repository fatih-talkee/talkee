-- ============================================================================
-- CLEANUP UNUSED INDEXES
-- ============================================================================
-- Eğer partial index kullanılmıyorsa, onu kaldırıp composite index'i kullanabiliriz
-- ============================================================================

-- 1. Önce index kullanım istatistiklerini kontrol et
SELECT 
    indexrelname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname IN (
    'idx_users_auth_id_deleted_at',
    'idx_users_auth_id_deleted',
    'idx_users_auth_id'
)
ORDER BY idx_scan DESC;

-- 2. Eğer partial index kullanılmıyorsa (idx_scan < 100), kaldır
-- NOT: Bu komutu sadece partial index gerçekten kullanılmıyorsa çalıştırın!
-- DROP INDEX IF EXISTS idx_users_auth_id_deleted_at;

-- 3. Composite index'in var olduğundan emin ol
CREATE INDEX IF NOT EXISTS idx_users_auth_id_deleted 
ON users(auth_id, deleted_at);

-- 4. Tablo istatistiklerini güncelle
ANALYZE users;

-- ============================================================================
-- NOT: Index kaldırmadan önce:
-- 1. EXPLAIN ANALYZE sonucunu kontrol edin
-- 2. Query'nin gerçekten composite index kullandığından emin olun
-- 3. Production'da index kaldırmadan önce test edin
-- ============================================================================
