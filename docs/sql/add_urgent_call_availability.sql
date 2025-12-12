-- ============================================================================
-- MIGRATION: Add Urgent Call Support to Availabilities
-- ============================================================================
-- Version: 1.1.0
-- Created: 2025-01-XX
-- Description: Adds 'urgent' as a new availability type
-- 
-- This migration allows professionals to set an urgent call availability
-- that is always available when they are online, regardless of scheduled hours.
-- ============================================================================

-- Step 1: Update the CHECK constraint on availabilities.available_at
-- to include 'urgent' as a valid option
-- Drop all possible constraint names
ALTER TABLE availabilities 
DROP CONSTRAINT IF EXISTS availabilities_available_at_check;

ALTER TABLE availabilities 
DROP CONSTRAINT IF EXISTS valid_available_at;

-- Add new constraint with 'urgent' option
ALTER TABLE availabilities
ADD CONSTRAINT availabilities_available_at_check 
CHECK (available_at IN ('every', 'specific', 'urgent'));

-- Step 2: Make start_hour and end_hour nullable for urgent calls
-- (They are not needed for urgent calls since it's always available)
ALTER TABLE availabilities
ALTER COLUMN start_hour DROP NOT NULL;

ALTER TABLE availabilities
ALTER COLUMN end_hour DROP NOT NULL;

-- Step 3: Add a comment explaining the urgent call type
COMMENT ON COLUMN availabilities.available_at IS 
'Type of availability: "every" (recurring weekly), "specific" (one-time date), or "urgent" (always available when online)';

COMMENT ON COLUMN availabilities.start_hour IS 
'Start time in HH:MM format. NULL for urgent calls (always available).';

COMMENT ON COLUMN availabilities.end_hour IS 
'End time in HH:MM format. NULL for urgent calls (always available).';

-- Step 4: Create an index for urgent call queries
CREATE INDEX IF NOT EXISTS idx_availabilities_urgent 
ON availabilities(professional_id, available_at) 
WHERE available_at = 'urgent';

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Check existing urgent call records (should be empty initially)
-- SELECT * FROM availabilities WHERE available_at = 'urgent';

-- Verify constraint is working
-- INSERT INTO availabilities (professional_id, available_at, price_per_minute, currency)
-- VALUES ('test-id', 'urgent', 25.00, 'USD');
-- Should succeed

-- Try invalid value (should fail)
-- INSERT INTO availabilities (professional_id, available_at, price_per_minute, currency)
-- VALUES ('test-id', 'invalid', 25.00, 'USD');
-- Should fail with constraint violation

