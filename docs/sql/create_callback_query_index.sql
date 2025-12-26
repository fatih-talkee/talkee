-- ============================================================================
-- OPTIMIZE CALLBACK QUERY WITH PARTIAL INDEX
-- ============================================================================
-- Bu partial index, callback query'sini optimize eder:
-- WHERE auth_id = ? AND deleted_at IS NULL
--
-- Avantajları:
-- 1. Sadece aktif kullanıcıları indexler (daha küçük index)
-- 2. deleted_at IS NULL kontrolü index seviyesinde yapılır (daha hızlı)
-- 3. Index scan'den sonra filter gerekmez
-- ============================================================================

-- Partial index oluştur (sadece deleted_at IS NULL olan kayıtlar için)
CREATE INDEX IF NOT EXISTS idx_users_auth_id_deleted_at 
ON users(auth_id) 
WHERE deleted_at IS NULL;

-- Index'in oluşturulduğunu kontrol et
SELECT 
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'users' 
  AND indexname = 'idx_users_auth_id_deleted_at';

-- Index kullanımını kontrol et (birkaç query çalıştırdıktan sonra)
SELECT 
    indexrelname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_users_auth_id_deleted_at';
