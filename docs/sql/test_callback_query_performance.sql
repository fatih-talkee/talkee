-- ============================================================================
-- TEST CALLBACK QUERY PERFORMANCE
-- ============================================================================
-- Bu script callback query'nin gerçek performansını test eder
-- ============================================================================

-- 1. Önce tablo istatistiklerini güncelle (query planner için önemli)
ANALYZE users;

-- 2. Callback query'sini EXPLAIN ANALYZE ile test et
-- Bu, query'nin hangi index'i kullandığını ve ne kadar sürdüğünü gösterir
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
  AND deleted_at IS NULL
LIMIT 1;

-- 3. Aynı query'yi 10 kez çalıştır ve ortalama süreyi ölç
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    total_duration INTERVAL := '0 seconds';
    i INTEGER;
    result_count INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();
        
        SELECT COUNT(*) INTO result_count
        FROM users
        WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
          AND deleted_at IS NULL;
        
        end_time := clock_timestamp();
        total_duration := total_duration + (end_time - start_time);
    END LOOP;
    
    RAISE NOTICE '10 query average: %', total_duration / 10;
    RAISE NOTICE 'Total time: %', total_duration;
END $$;

-- 4. Index kullanımını zorla (hint ile değil, query'yi optimize ederek)
-- Partial index'in kullanılması için query'yi şöyle yazabiliriz:
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
  AND deleted_at IS NULL
LIMIT 1;

-- 5. Composite index ile karşılaştır (eğer partial index kullanılmıyorsa)
-- Bu query composite index kullanacak:
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
LIMIT 1;

-- 6. Tablo boyutunu ve row count'u kontrol et
SELECT 
    pg_size_pretty(pg_total_relation_size('users')) as total_size,
    pg_size_pretty(pg_relation_size('users')) as table_size,
    pg_size_pretty(pg_indexes_size('users')) as indexes_size,
    (SELECT COUNT(*) FROM users) as total_rows,
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as active_rows,
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL) as deleted_rows;

-- 7. Index boyutlarını karşılaştır
SELECT 
    indexrelname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexrelname IN (
    'idx_users_auth_id_deleted_at',
    'idx_users_auth_id_deleted',
    'idx_users_auth_id'
)
ORDER BY idx_scan DESC;

-- ============================================================================
-- SONUÇ YORUMLAMA:
-- ============================================================================
-- 1. Eğer EXPLAIN ANALYZE'de "Index Scan using idx_users_auth_id_deleted_at" görüyorsanız:
--    ✅ Partial index kullanılıyor (optimal)
--    ⚠️ Ama hala yavaşsa, network latency veya connection pool sorunu olabilir
--
-- 2. Eğer "Index Scan using idx_users_auth_id_deleted" görüyorsanız:
--    ⚠️ Composite index kullanılıyor (partial index tercih edilmiyor)
--    💡 Bu durumda partial index'i kaldırıp composite index'i kullanabilirsiniz
--
-- 3. Eğer "Seq Scan" görüyorsanız:
--    ❌ Index kullanılmıyor! Tablo çok küçük olabilir veya istatistikler güncel değil
--
-- 4. Execution Time'a bakın:
--    ✅ < 1ms = Çok hızlı (normal)
--    ⚠️ 1-10ms = Kabul edilebilir
--    ❌ > 10ms = Yavaş (network veya başka sorun var)
-- ============================================================================
