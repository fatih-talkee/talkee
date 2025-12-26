-- ============================================================================
-- TEST NETWORK LATENCY TO SUPABASE
-- ============================================================================
-- Bu script Supabase'e olan network latency'yi test eder
-- ============================================================================

-- 1. Basit query ile latency test (çok küçük bir query)
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    durations INTERVAL[] := ARRAY[]::INTERVAL[];
    i INTEGER;
    avg_duration INTERVAL;
BEGIN
    -- 10 kez test et
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();
        
        -- En basit query (sadece 1 satır döndürür)
        PERFORM 1 FROM users LIMIT 1;
        
        end_time := clock_timestamp();
        durations := array_append(durations, end_time - start_time);
    END LOOP;
    
    -- Ortalama hesapla
    SELECT AVG(duration) INTO avg_duration
    FROM unnest(durations) AS duration;
    
    RAISE NOTICE 'Network latency test (10 queries):';
    RAISE NOTICE 'Average duration: %', avg_duration;
    RAISE NOTICE 'Min duration: %', (SELECT MIN(duration) FROM unnest(durations) AS duration);
    RAISE NOTICE 'Max duration: %', (SELECT MAX(duration) FROM unnest(durations) AS duration);
END $$;

-- 2. Callback query'sini 10 kez test et
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    durations INTERVAL[] := ARRAY[]::INTERVAL[];
    i INTEGER;
    avg_duration INTERVAL;
    result_count INTEGER;
BEGIN
    -- 10 kez test et
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();
        
        -- Callback query'si
        SELECT COUNT(*) INTO result_count
        FROM users
        WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
          AND deleted_at IS NULL;
        
        end_time := clock_timestamp();
        durations := array_append(durations, end_time - start_time);
    END LOOP;
    
    -- Ortalama hesapla
    SELECT AVG(duration) INTO avg_duration
    FROM unnest(durations) AS duration;
    
    RAISE NOTICE 'Callback query test (10 queries):';
    RAISE NOTICE 'Average duration: %', avg_duration;
    RAISE NOTICE 'Min duration: %', (SELECT MIN(duration) FROM unnest(durations) AS duration);
    RAISE NOTICE 'Max duration: %', (SELECT MAX(duration) FROM unnest(durations) AS duration);
END $$;

-- 3. İlk bağlantı kurulum süresini test et (bu Supabase client'ta yavaş olabilir)
-- NOT: Bu test SQL'de yapılamaz, client tarafında yapılmalı

-- ============================================================================
-- YORUMLAMA:
-- ============================================================================
-- 1. Eğer average duration < 10ms ise:
--    ✅ Network latency normal
--    ⚠️ Sorun client tarafında (React Native, Supabase client)
--
-- 2. Eğer average duration > 100ms ise:
--    ⚠️ Network latency yüksek
--    💡 Supabase region'ını kontrol edin
--
-- 3. Eğer max duration çok yüksekse (> 1 saniye):
--    ⚠️ İlk bağlantı kurulumu yavaş olabilir
--    💡 Connection pooling'i kontrol edin
-- ============================================================================
