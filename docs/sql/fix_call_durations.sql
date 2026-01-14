-- ============================================
-- FIX CALL DURATIONS AND COSTS
-- ============================================
-- Bu script geçmiş call'ların duration ve cost'larını düzeltir
-- Supabase SQL Editor'de çalıştırın

-- 1. Önce kontrol: Kaç call'ın duration'ı düzeltilebilir?
SELECT 
  COUNT(*) as fixable_calls,
  SUM(CASE WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN 1 ELSE 0 END) as has_timestamps
FROM calls
WHERE status = 'completed' 
  AND (duration_minutes = 0 OR duration_minutes IS NULL)
  AND total_cost = 0;

-- 2. Duration'ı start_time ve end_time'dan hesaplayarak güncelle
-- Use same logic as per-minute billing: FLOOR(duration / 60) + 1
-- This ensures consistency with upfront per-minute billing (industry standard)
-- Example: 60 seconds = 2 minutes (1st + 2nd minute entered)
UPDATE calls
SET 
  duration_minutes = GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) + 1),
  total_cost = GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) + 1) * rate_per_minute,
  updated_at = NOW()
WHERE status = 'completed'
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL
  AND end_time > start_time
  AND (duration_minutes = 0 OR duration_minutes IS NULL)
  AND rate_per_minute > 0;

-- 3. Sonuçları kontrol et
SELECT 
  id,
  caller_id,
  professional_id,
  status,
  start_time,
  end_time,
  duration_minutes,
  rate_per_minute,
  total_cost,
  -- Hesaplanmış değerler (per-minute billing logic: FLOOR(...) + 1)
  FLOOR(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) + 1 as calculated_duration_minutes,
  (FLOOR(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) + 1) * rate_per_minute as calculated_total_cost
FROM calls
WHERE status = 'completed'
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

