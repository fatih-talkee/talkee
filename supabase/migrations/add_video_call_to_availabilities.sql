-- ============================================================================
-- MIGRATION: Add Video Call Support to Availabilities
-- ============================================================================
-- Version: 1.2.0
-- Created: 2025-01-XX
-- Description: Adds video call support with separate pricing to availabilities
-- 
-- This migration allows professionals to:
-- 1. Enable/disable video calls for each availability
-- 2. Set separate pricing for video calls (similar to urgent calls)
-- ============================================================================

-- Step 1: Add video_call_enabled column (boolean, default false)
ALTER TABLE availabilities
ADD COLUMN IF NOT EXISTS video_call_enabled BOOLEAN DEFAULT false NOT NULL;

-- Step 2: Add video_call_rate_per_minute column (decimal, nullable)
-- Only set if video_call_enabled is true
ALTER TABLE availabilities
ADD COLUMN IF NOT EXISTS video_call_rate_per_minute DECIMAL(10, 2) NULL;

-- Step 3: Add CHECK constraint to ensure video_call_rate_per_minute is set when video_call_enabled is true
ALTER TABLE availabilities
DROP CONSTRAINT IF EXISTS availabilities_video_call_rate_check;

ALTER TABLE availabilities
ADD CONSTRAINT availabilities_video_call_rate_check
CHECK (
  (video_call_enabled = false) OR 
  (video_call_enabled = true AND video_call_rate_per_minute IS NOT NULL AND video_call_rate_per_minute > 0)
);

-- Step 4: Add comments
COMMENT ON COLUMN availabilities.video_call_enabled IS 
'Whether video calls are enabled for this availability. If true, video_call_rate_per_minute must be set.';

COMMENT ON COLUMN availabilities.video_call_rate_per_minute IS 
'Price per minute for video calls. Required if video_call_enabled is true. Can be different from voice call price.';

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Check existing records (video_call_enabled should be false by default)
-- SELECT id, available_at, video_call_enabled, video_call_rate_per_minute, price_per_minute 
-- FROM availabilities 
-- LIMIT 10;

-- Test: Insert with video call enabled and rate
-- INSERT INTO availabilities (
--   professional_id, 
--   available_at, 
--   price_per_minute, 
--   currency,
--   video_call_enabled,
--   video_call_rate_per_minute
-- )
-- VALUES (
--   'test-id', 
--   'urgent', 
--   25.00, 
--   'USD',
--   true,
--   35.00
-- );
-- Should succeed

-- Test: Insert with video call enabled but no rate (should fail)
-- INSERT INTO availabilities (
--   professional_id, 
--   available_at, 
--   price_per_minute, 
--   currency,
--   video_call_enabled,
--   video_call_rate_per_minute
-- )
-- VALUES (
--   'test-id', 
--   'urgent', 
--   25.00, 
--   'USD',
--   true,
--   NULL
-- );
-- Should fail with constraint violation

