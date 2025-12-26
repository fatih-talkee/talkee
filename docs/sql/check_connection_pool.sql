-- ============================================================================
-- CHECK CONNECTION POOL STATUS
-- ============================================================================
-- Bu script Supabase connection pool durumunu kontrol eder
-- ============================================================================

-- 1. Aktif connection sayısını kontrol et
SELECT 
    count(*) as active_connections,
    count(*) FILTER (WHERE state = 'active') as active_queries,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting_connections
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid(); -- Exclude current connection

-- 2. Her state için detaylı bilgi
SELECT 
    state,
    count(*) as connection_count,
    max(now() - state_change) as max_state_duration
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid()
GROUP BY state
ORDER BY connection_count DESC;

-- 3. Uzun süren query'leri bul (connection pool'u bloke eden)
SELECT 
    pid,
    usename as username,
    application_name,
    client_addr,
    state,
    wait_event_type,
    wait_event,
    query_start,
    state_change,
    now() - query_start as query_duration,
    now() - state_change as state_duration,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid()
  AND state != 'idle'
ORDER BY query_start ASC
LIMIT 20;

-- 4. Connection limit'leri kontrol et
SELECT 
    setting as max_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as current_connections,
    setting::int - (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as available_connections
FROM pg_settings
WHERE name = 'max_connections';

-- 5. Supabase connection pool ayarları (eğer pg_stat_statements aktifse)
-- NOT: Bu Supabase'de varsayılan olarak aktif değildir
SELECT 
    name,
    setting,
    unit,
    short_desc
FROM pg_settings
WHERE name IN (
    'max_connections',
    'superuser_reserved_connections',
    'shared_buffers',
    'work_mem'
);

-- 6. Her application için connection sayısı
SELECT 
    application_name,
    count(*) as connection_count,
    count(*) FILTER (WHERE state = 'active') as active_count,
    count(*) FILTER (WHERE state = 'idle') as idle_count
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid()
GROUP BY application_name
ORDER BY connection_count DESC;

-- 7. Connection pool kullanım yüzdesi
SELECT 
    (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as current_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
    ROUND(
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database())::numeric / 
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')::numeric * 100,
        2
    ) as usage_percentage;

-- ============================================================================
-- YORUMLAMA:
-- ============================================================================
-- 1. Eğer active_connections max_connections'a yakınsa:
--    ⚠️ Connection pool dolmak üzere - connection limit artırılmalı
--
-- 2. Eğer idle_in_transaction çok fazlaysa:
--    ⚠️ Transaction'lar commit/rollback edilmiyor - connection leak olabilir
--
-- 3. Eğer waiting_connections varsa:
--    ⚠️ Query'ler bekliyor - database load yüksek olabilir
--
-- 4. Eğer query_duration çok uzunsa (> 5 saniye):
--    ⚠️ Yavaş query'ler connection pool'u bloke ediyor
-- ============================================================================
