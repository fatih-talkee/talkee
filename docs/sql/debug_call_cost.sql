-- ============================================
-- CALL COST DEBUG QUERIES
-- ============================================
-- Bu sorguları Supabase SQL Editor'de çalıştırın
-- ve sonuçları paylaşın

-- 1. Son 10 completed call'ı kontrol et
-- total_cost, duration_minutes, rate_per_minute değerlerini göster
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
  created_at,
  updated_at
FROM calls
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- 2. total_cost'u 0 olan completed call'ları bul
SELECT 
  id,
  caller_id,
  professional_id,
  status,
  duration_minutes,
  rate_per_minute,
  total_cost,
  start_time,
  end_time,
  created_at,
  updated_at
FROM calls
WHERE status = 'completed' 
  AND (total_cost = 0 OR total_cost IS NULL)
ORDER BY created_at DESC
LIMIT 20;

-- 3. rate_per_minute'u 0 veya null olan call'ları bul
SELECT 
  id,
  caller_id,
  professional_id,
  status,
  duration_minutes,
  rate_per_minute,
  total_cost,
  created_at,
  updated_at
FROM calls
WHERE (rate_per_minute = 0 OR rate_per_minute IS NULL)
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 20;

-- 4. duration_minutes'u 0 veya null olan completed call'ları bul
SELECT 
  id,
  caller_id,
  professional_id,
  status,
  duration_minutes,
  rate_per_minute,
  total_cost,
  start_time,
  end_time,
  created_at,
  updated_at
FROM calls
WHERE status = 'completed'
  AND (duration_minutes = 0 OR duration_minutes IS NULL)
ORDER BY created_at DESC
LIMIT 20;

-- 5. Call başlatılırken rate_per_minute'un doğru kaydedilip kaydedilmediğini kontrol et
-- (initiateCall sırasında kaydedilen rate_per_minute)
SELECT 
  c.id,
  c.caller_id,
  c.professional_id,
  c.status,
  c.rate_per_minute as call_rate_per_minute,
  p.rate_per_minute as professional_rate_per_minute,
  c.total_cost,
  c.duration_minutes,
  c.created_at,
  c.updated_at
FROM calls c
LEFT JOIN professionals p ON c.professional_id = p.id
WHERE c.status = 'completed'
ORDER BY c.created_at DESC
LIMIT 20;

-- 6. En son completed call'ın detayları (en detaylı)
SELECT 
  c.id,
  c.caller_id,
  c.professional_id,
  c.status,
  c.call_type,
  c.start_time,
  c.end_time,
  c.duration_minutes,
  c.rate_per_minute,
  c.total_cost,
  c.created_at,
  c.updated_at,
  -- Hesaplanmış değerler
  CASE 
    WHEN c.duration_minutes > 0 AND c.rate_per_minute > 0 
    THEN ROUND(c.duration_minutes * c.rate_per_minute, 2)
    ELSE 0
  END as calculated_cost,
  -- Fark
  CASE 
    WHEN c.duration_minutes > 0 AND c.rate_per_minute > 0 
    THEN ROUND(c.total_cost - (c.duration_minutes * c.rate_per_minute), 2)
    ELSE c.total_cost
  END as cost_difference
FROM calls c
WHERE c.status = 'completed'
ORDER BY c.created_at DESC
LIMIT 10;

