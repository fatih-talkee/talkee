-- ============================================================================
-- TEST NETWORK LATENCY TO SUPABASE (V2 - Returns Results)
-- ============================================================================
-- Bu script Supabase'e olan network latency'yi test eder ve sonuçları döndürür
-- ============================================================================

-- 1. Basit query ile latency test (çok küçük bir query)
WITH latency_test AS (
    SELECT 
        generate_series(1, 10) as test_number,
        clock_timestamp() as start_time
),
query_results AS (
    SELECT 
        test_number,
        start_time,
        clock_timestamp() as end_time,
        clock_timestamp() - start_time as duration
    FROM latency_test,
    LATERAL (
        SELECT 1 FROM users LIMIT 1
    ) AS simple_query
)
SELECT 
    'Simple Query Test' as test_name,
    COUNT(*) as test_count,
    AVG(EXTRACT(EPOCH FROM duration) * 1000) as avg_duration_ms,
    MIN(EXTRACT(EPOCH FROM duration) * 1000) as min_duration_ms,
    MAX(EXTRACT(EPOCH FROM duration) * 1000) as max_duration_ms,
    STDDEV(EXTRACT(EPOCH FROM duration) * 1000) as stddev_duration_ms
FROM query_results;

-- 2. Callback query'sini test et
WITH latency_test AS (
    SELECT 
        generate_series(1, 10) as test_number,
        clock_timestamp() as start_time
),
query_results AS (
    SELECT 
        test_number,
        start_time,
        clock_timestamp() as end_time,
        clock_timestamp() - start_time as duration
    FROM latency_test,
    LATERAL (
        SELECT COUNT(*) 
        FROM users
        WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
          AND deleted_at IS NULL
    ) AS callback_query
)
SELECT 
    'Callback Query Test' as test_name,
    COUNT(*) as test_count,
    AVG(EXTRACT(EPOCH FROM duration) * 1000) as avg_duration_ms,
    MIN(EXTRACT(EPOCH FROM duration) * 1000) as min_duration_ms,
    MAX(EXTRACT(EPOCH FROM duration) * 1000) as max_duration_ms,
    STDDEV(EXTRACT(EPOCH FROM duration) * 1000) as stddev_duration_ms
FROM query_results;

-- 3. Her iki testi birleştir (karşılaştırma için)
WITH simple_test AS (
    SELECT 
        generate_series(1, 10) as test_number,
        clock_timestamp() as start_time
),
simple_results AS (
    SELECT 
        test_number,
        clock_timestamp() - start_time as duration
    FROM simple_test,
    LATERAL (SELECT 1 FROM users LIMIT 1) AS q
),
callback_test AS (
    SELECT 
        generate_series(1, 10) as test_number,
        clock_timestamp() as start_time
),
callback_results AS (
    SELECT 
        test_number,
        clock_timestamp() - start_time as duration
    FROM callback_test,
    LATERAL (
        SELECT COUNT(*) 
        FROM users
        WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
          AND deleted_at IS NULL
    ) AS q
)
SELECT 
    'Simple Query' as test_type,
    AVG(EXTRACT(EPOCH FROM duration) * 1000) as avg_ms,
    MIN(EXTRACT(EPOCH FROM duration) * 1000) as min_ms,
    MAX(EXTRACT(EPOCH FROM duration) * 1000) as max_ms
FROM simple_results
UNION ALL
SELECT 
    'Callback Query' as test_type,
    AVG(EXTRACT(EPOCH FROM duration) * 1000) as avg_ms,
    MIN(EXTRACT(EPOCH FROM duration) * 1000) as min_ms,
    MAX(EXTRACT(EPOCH FROM duration) * 1000) as max_ms
FROM callback_results;

-- ============================================================================
-- YORUMLAMA:
-- ============================================================================
-- 1. avg_duration_ms < 10ms:
--    ✅ Network latency normal
--    ⚠️ Sorun client tarafında (React Native, Supabase client)
--
-- 2. avg_duration_ms 10-100ms:
--    ⚠️ Network latency kabul edilebilir ama yüksek
--    💡 Supabase region'ını kontrol edin
--
-- 3. avg_duration_ms > 100ms:
--    ❌ Network latency çok yüksek
--    💡 Supabase region'ını değiştirmeyi düşünün
--
-- 4. max_duration_ms çok yüksekse (> 1 saniye):
--    ⚠️ İlk bağlantı kurulumu yavaş olabilir
--    💡 Connection pooling'i kontrol edin
-- ============================================================================
