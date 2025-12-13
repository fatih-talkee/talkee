-- ============================================================================
-- UPDATE USER_DEVICES TABLE (if needed)
-- ============================================================================
-- This migration adds missing columns and ensures RLS policies are set up
-- The table already exists in public schema with 8 columns

-- Check if we're working with public.user_devices (not talkee.user_devices)
-- Based on the schema, we'll work with public.user_devices

-- ============================================================================
-- ADD MISSING COLUMNS (if they don't exist)
-- ============================================================================

-- Add device_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'user_devices' 
    AND column_name = 'device_id'
  ) THEN
    ALTER TABLE public.user_devices 
    ADD COLUMN device_id VARCHAR(255);
  END IF;
END $$;

-- Add app_version column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'user_devices' 
    AND column_name = 'app_version'
  ) THEN
    ALTER TABLE public.user_devices 
    ADD COLUMN app_version VARCHAR(50);
  END IF;
END $$;

-- ============================================================================
-- ADD CONSTRAINTS (if they don't exist)
-- ============================================================================

-- Add unique constraint on (user_id, push_token) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_devices_user_id_push_token_key'
  ) THEN
    ALTER TABLE public.user_devices
    ADD CONSTRAINT user_devices_user_id_push_token_key 
    UNIQUE (user_id, push_token);
  END IF;
END $$;

-- Add platform check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_devices_platform_check'
  ) THEN
    ALTER TABLE public.user_devices
    ADD CONSTRAINT user_devices_platform_check 
    CHECK (platform IN ('ios', 'android', 'web'));
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES (if they don't exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id 
ON public.user_devices(user_id);

CREATE INDEX IF NOT EXISTS idx_user_devices_push_token 
ON public.user_devices(push_token);

CREATE INDEX IF NOT EXISTS idx_user_devices_is_active 
ON public.user_devices(is_active) 
WHERE is_active = true;

-- ============================================================================
-- ADD UPDATED_AT TRIGGER (if it doesn't exist)
-- ============================================================================

-- Create function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_user_devices_updated_at ON public.user_devices;

CREATE TRIGGER update_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_devices_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can insert their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can update their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can delete their own devices" ON public.user_devices;

-- Policy: Users can view their own devices
CREATE POLICY "Users can view their own devices"
  ON public.user_devices
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own devices
CREATE POLICY "Users can insert their own devices"
  ON public.user_devices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own devices
CREATE POLICY "Users can update their own devices"
  ON public.user_devices
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own devices
CREATE POLICY "Users can delete their own devices"
  ON public.user_devices
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ADD FOREIGN KEY (if it doesn't exist)
-- ============================================================================

-- Check if foreign key exists and add if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_devices_user_id_fkey'
  ) THEN
    -- Try to reference talkee.users first, fallback to public.users
    BEGIN
      ALTER TABLE public.user_devices
      ADD CONSTRAINT user_devices_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES talkee.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      -- If talkee.users doesn't exist, try public.users
      BEGIN
        ALTER TABLE public.user_devices
        ADD CONSTRAINT user_devices_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
      END;
    END;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.user_devices IS 'Stores push notification tokens for user devices';
COMMENT ON COLUMN public.user_devices.push_token IS 'Expo Push Notification token';
COMMENT ON COLUMN public.user_devices.platform IS 'Device platform: ios, android, or web';
COMMENT ON COLUMN public.user_devices.device_name IS 'Optional device name for identification';
COMMENT ON COLUMN public.user_devices.device_id IS 'Optional device identifier for tracking';
COMMENT ON COLUMN public.user_devices.app_version IS 'Optional app version for debugging';
COMMENT ON COLUMN public.user_devices.is_active IS 'Whether this device token is currently active';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table structure
SELECT 
  'user_devices table structure' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_devices'
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT 
  'RLS status' as status,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_devices';

-- Verify RLS policies
SELECT 
  'RLS policies' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_devices';

-- Verify indexes
SELECT 
  'Indexes' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'user_devices';
