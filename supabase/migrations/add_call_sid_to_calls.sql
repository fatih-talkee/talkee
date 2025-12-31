-- Add call_sid column to calls table
-- This column stores the Twilio Call SID for voice calls, enabling direct lookup
-- of call records by Twilio's call identifier

-- ============================================================================
-- ADD call_sid COLUMN TO calls TABLE
-- ============================================================================

-- ✅ Add call_sid column (nullable, as existing records won't have it)
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS call_sid TEXT;

-- ✅ Add index for fast lookups by call_sid
-- This is critical for:
-- 1. ActiveCallOverlay to find call records by Twilio call SID
-- 2. Twilio webhook handlers to update call status
-- 3. Call history queries that need to correlate with Twilio data
CREATE INDEX IF NOT EXISTS idx_calls_call_sid 
ON calls(call_sid)
WHERE call_sid IS NOT NULL;

-- ✅ Add comment for documentation
COMMENT ON COLUMN calls.call_sid IS 'Twilio Call SID for voice calls. Used to correlate database records with Twilio call objects.';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. call_sid is nullable because:
--    - Existing call records won't have it
--    - Video calls may use room_sid instead (future enhancement)
--    - Some call records may be created before Twilio call is established
--
-- 2. Index is partial (WHERE call_sid IS NOT NULL) because:
--    - Most queries will filter by call_sid when it exists
--    - Reduces index size by excluding NULL values
--    - Improves query performance for call_sid lookups
--
-- 3. This migration is safe to run multiple times (uses IF NOT EXISTS)

