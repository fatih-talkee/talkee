-- ============================================================================
-- DUMMY DATA: Insert Sample Availabilities with Video Call Support
-- ============================================================================
-- Description: Inserts dummy availabilities covering all scenarios:
--   1. Urgent call - video enabled
--   2. Urgent call - video disabled
--   3. Every (recurring weekly) - video enabled
--   4. Every (recurring weekly) - video disabled
--   5. Specific date - video enabled
--   6. Specific date - video disabled
-- ============================================================================

-- First, let's get some professional IDs to use
-- We'll use the first few professionals from the database
DO $$
DECLARE
  prof_id_1 UUID;
  prof_id_2 UUID;
  prof_id_3 UUID;
  prof_id_4 UUID;
  prof_id_5 UUID;
  prof_id_6 UUID;
BEGIN
  -- Get 6 different professionals (or create test ones if needed)
  SELECT id INTO prof_id_1 FROM professionals WHERE is_active = true LIMIT 1;
  SELECT id INTO prof_id_2 FROM professionals WHERE is_active = true OFFSET 1 LIMIT 1;
  SELECT id INTO prof_id_3 FROM professionals WHERE is_active = true OFFSET 2 LIMIT 1;
  SELECT id INTO prof_id_4 FROM professionals WHERE is_active = true OFFSET 3 LIMIT 1;
  SELECT id INTO prof_id_5 FROM professionals WHERE is_active = true OFFSET 4 LIMIT 1;
  SELECT id INTO prof_id_6 FROM professionals WHERE is_active = true OFFSET 5 LIMIT 1;

  -- If we don't have enough professionals, we'll use the first one for all
  IF prof_id_1 IS NULL THEN
    RAISE NOTICE 'No professionals found. Please create professionals first.';
    RETURN;
  END IF;

  -- Use first professional for all if others are null
  IF prof_id_2 IS NULL THEN prof_id_2 := prof_id_1; END IF;
  IF prof_id_3 IS NULL THEN prof_id_3 := prof_id_1; END IF;
  IF prof_id_4 IS NULL THEN prof_id_4 := prof_id_1; END IF;
  IF prof_id_5 IS NULL THEN prof_id_5 := prof_id_1; END IF;
  IF prof_id_6 IS NULL THEN prof_id_6 := prof_id_1; END IF;

  -- ============================================================================
  -- SCENARIO 1: Urgent Call - Video Enabled
  -- ============================================================================
  INSERT INTO availabilities (
    professional_id,
    available_at,
    days,
    date,
    start_hour,
    end_hour,
    currency,
    price_per_minute,
    video_call_enabled,
    video_call_rate_per_minute,
    created_at,
    updated_at
  ) VALUES (
    prof_id_1,
    'urgent',
    NULL, -- No days for urgent
    NULL, -- No date for urgent
    NULL, -- No start hour for urgent
    NULL, -- No end hour for urgent
    'USD',
    25.00, -- Voice call rate
    true,  -- Video enabled
    35.00, -- Video call rate (higher than voice)
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SCENARIO 2: Urgent Call - Video Disabled
  -- ============================================================================
  INSERT INTO availabilities (
    professional_id,
    available_at,
    days,
    date,
    start_hour,
    end_hour,
    currency,
    price_per_minute,
    video_call_enabled,
    video_call_rate_per_minute,
    created_at,
    updated_at
  ) VALUES (
    prof_id_2,
    'urgent',
    NULL,
    NULL,
    NULL,
    NULL,
    'USD',
    20.00, -- Voice call rate
    false, -- Video disabled
    NULL,  -- No video rate
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SCENARIO 3: Every (Recurring Weekly) - Video Enabled
  -- ============================================================================
  INSERT INTO availabilities (
    professional_id,
    available_at,
    days,
    date,
    start_hour,
    end_hour,
    currency,
    price_per_minute,
    video_call_enabled,
    video_call_rate_per_minute,
    created_at,
    updated_at
  ) VALUES (
    prof_id_3,
    'every',
    ARRAY['Monday', 'Wednesday', 'Friday'], -- Available on Mon, Wed, Fri
    NULL, -- No specific date
    '09:00', -- Start at 9 AM
    '17:00', -- End at 5 PM
    'USD',
    30.00, -- Voice call rate
    true,  -- Video enabled
    45.00, -- Video call rate (higher than voice)
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SCENARIO 4: Every (Recurring Weekly) - Video Disabled
  -- ============================================================================
  INSERT INTO availabilities (
    professional_id,
    available_at,
    days,
    date,
    start_hour,
    end_hour,
    currency,
    price_per_minute,
    video_call_enabled,
    video_call_rate_per_minute,
    created_at,
    updated_at
  ) VALUES (
    prof_id_4,
    'every',
    ARRAY['Tuesday', 'Thursday'], -- Available on Tue, Thu
    NULL,
    '10:00', -- Start at 10 AM
    '18:00', -- End at 6 PM
    'USD',
    28.00, -- Voice call rate
    false, -- Video disabled
    NULL,  -- No video rate
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SCENARIO 5: Specific Date - Video Enabled
  -- ============================================================================
  INSERT INTO availabilities (
    professional_id,
    available_at,
    days,
    date,
    start_hour,
    end_hour,
    currency,
    price_per_minute,
    video_call_enabled,
    video_call_rate_per_minute,
    created_at,
    updated_at
  ) VALUES (
    prof_id_5,
    'specific',
    NULL, -- No days for specific date
    (CURRENT_DATE + INTERVAL '7 days')::date, -- 7 days from now
    '14:00', -- Start at 2 PM
    '20:00', -- End at 8 PM
    'USD',
    35.00, -- Voice call rate
    true,  -- Video enabled
    50.00, -- Video call rate (higher than voice)
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SCENARIO 6: Specific Date - Video Disabled
  -- ============================================================================
  INSERT INTO availabilities (
    professional_id,
    available_at,
    days,
    date,
    start_hour,
    end_hour,
    currency,
    price_per_minute,
    video_call_enabled,
    video_call_rate_per_minute,
    created_at,
    updated_at
  ) VALUES (
    prof_id_6,
    'specific',
    NULL,
    (CURRENT_DATE + INTERVAL '14 days')::date, -- 14 days from now
    '11:00', -- Start at 11 AM
    '19:00', -- End at 7 PM
    'USD',
    32.00, -- Voice call rate
    false, -- Video disabled
    NULL,  -- No video rate
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Dummy availabilities inserted successfully!';
  RAISE NOTICE '   - Urgent call (video enabled): Professional %', prof_id_1;
  RAISE NOTICE '   - Urgent call (video disabled): Professional %', prof_id_2;
  RAISE NOTICE '   - Every recurring (video enabled): Professional %', prof_id_3;
  RAISE NOTICE '   - Every recurring (video disabled): Professional %', prof_id_4;
  RAISE NOTICE '   - Specific date (video enabled): Professional %', prof_id_5;
  RAISE NOTICE '   - Specific date (video disabled): Professional %', prof_id_6;

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View all inserted availabilities with video call info
SELECT 
  a.id,
  a.professional_id,
  u.name as professional_name,
  a.available_at,
  a.days,
  a.date,
  a.start_hour,
  a.end_hour,
  a.price_per_minute as voice_rate,
  a.video_call_enabled,
  a.video_call_rate_per_minute as video_rate,
  a.created_at
FROM availabilities a
LEFT JOIN professionals p ON p.id = a.professional_id
LEFT JOIN users u ON u.id = p.user_id
WHERE a.video_call_enabled IS NOT NULL
ORDER BY a.created_at DESC
LIMIT 10;

-- Count by type and video status
SELECT 
  available_at,
  video_call_enabled,
  COUNT(*) as count
FROM availabilities
WHERE video_call_enabled IS NOT NULL
GROUP BY available_at, video_call_enabled
ORDER BY available_at, video_call_enabled;

