-- ============================================================================
-- CHECK CALLS TABLE COLUMNS
-- ============================================================================
-- Bu sorgu calls tablosundaki tüm kolonları ve veri tiplerini gösterir
-- ============================================================================

-- Yöntem 1: information_schema kullanarak (PostgreSQL standard)
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'calls'
ORDER BY ordinal_position;

-- ============================================================================
-- Yöntem 2: pg_catalog kullanarak (daha detaylı bilgi)
-- ============================================================================
SELECT 
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    a.attnotnull AS not_null,
    a.atthasdef AS has_default,
    pg_get_expr(adbin, adrelid) AS default_value
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
WHERE a.attrelid = 'public.calls'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;

-- ============================================================================
-- Yöntem 3: Basit tablo yapısı (hızlı kontrol için)
-- ============================================================================
SELECT * FROM calls LIMIT 0;

-- ============================================================================
-- Yöntem 4: Belirli kolonların varlığını kontrol et
-- ============================================================================
SELECT 
    column_name,
    CASE 
        WHEN column_name IN ('urgent', 'one_time_availability_id', 'call_sid') 
        THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'calls'
  AND column_name IN ('urgent', 'one_time_availability_id', 'call_sid', 'call_type', 'professional_id', 'caller_id', 'rate_per_minute')
ORDER BY column_name;

-- ============================================================================
-- Yöntem 5: Tüm kolonları tek satırda göster
-- ============================================================================
SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) AS all_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'calls';

