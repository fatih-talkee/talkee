-- ============================================================================
-- CALLBACK QUERY PERFORMANCE CHECK
-- ============================================================================
-- Bu sorgular callback.tsx'teki profile query'nin neden yavaş olduğunu anlamak için

-- 1. auth_id için index var mı ve doğru mu?
SELECT 
    pi.indexname,
    pi.indexdef,
    COALESCE(psi.idx_scan, 0) as index_scans,
    COALESCE(psi.idx_tup_read, 0) as tuples_read,
    COALESCE(psi.idx_tup_fetch, 0) as tuples_fetched
FROM pg_indexes pi
LEFT JOIN pg_stat_user_indexes psi ON pi.indexname = psi.indexrelname::text
WHERE pi.tablename = 'users' 
  AND (pi.indexdef LIKE '%auth_id%' OR pi.indexname LIKE '%auth_id%')
ORDER BY COALESCE(psi.idx_scan, 0) DESC;

-- 2. deleted_at için index var mı? (çünkü .is('deleted_at', null) kullanıyoruz)
SELECT 
    pi.indexname,
    pi.indexdef,
    COALESCE(psi.idx_scan, 0) as index_scans
FROM pg_indexes pi
LEFT JOIN pg_stat_user_indexes psi ON pi.indexname = psi.indexrelname::text
WHERE pi.tablename = 'users' 
  AND (pi.indexdef LIKE '%deleted_at%' OR pi.indexname LIKE '%deleted_at%')
ORDER BY COALESCE(psi.idx_scan, 0) DESC;

-- 3. Composite index önerisi: auth_id + deleted_at birlikte index
-- Bu callback query için ideal olur: WHERE auth_id = ? AND deleted_at IS NULL
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'users' 
  AND indexdef LIKE '%auth_id%'
  AND indexdef LIKE '%deleted_at%';

-- 4. users tablosunda toplam kayıt sayısı
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_users,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_users
FROM users;

-- 5. Query'nin execution plan'ını görmek için (EXPLAIN ANALYZE)
-- Bu sorguyu çalıştırıp sonucu paylaş:
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
  AND deleted_at IS NULL
LIMIT 1;

-- 6. auth_id ile ilgili tüm indexler (genel bakış)
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- 7. users tablosu istatistikleri (table size, row count, etc.)
SELECT 
    schemaname,
    relname as tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) AS indexes_size,
    n_live_tup as estimated_row_count,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'users';

-- 8. Callback query'sini bulmak için (pg_stat_statements extension aktifse)
-- NOT: Bu extension aktif değilse sonuç boş döner
SELECT 
    LEFT(query, 200) as query_preview,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
WHERE query LIKE '%users%auth_id%'
   OR query LIKE '%users%deleted_at%'
   OR (query LIKE '%SELECT%id, name%' AND query LIKE '%users%' AND query LIKE '%auth_id%')
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 9. Callback query'sinin exact execution plan'ı
-- Bu sorguyu callback.tsx'teki exact query ile çalıştır:
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
  AND deleted_at IS NULL
LIMIT 1;

-- ============================================================================
-- ÖNERİ: Eğer composite index yoksa, şunu oluşturun:
-- ============================================================================
-- CREATE INDEX IF NOT EXISTS idx_users_auth_id_deleted_at 
-- ON users(auth_id) 
-- WHERE deleted_at IS NULL;
--
-- Bu partial index, callback query için çok daha hızlı olacaktır çünkü:
-- 1. Sadece deleted_at IS NULL olan kayıtları index'ler
-- 2. auth_id lookup'ı çok daha hızlı yapar
-- 3. Index boyutu daha küçük olur (sadece aktif kullanıcılar)
