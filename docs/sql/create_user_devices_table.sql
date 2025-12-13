-- ============================================================================
-- CREATE USER_DEVICES TABLE
-- ============================================================================
-- Stores push notification tokens for users' devices
-- Used for sending push notifications via Expo Push Notifications

-- Create table
CREATE TABLE IF NOT EXISTS talkee.user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES talkee.users(id) ON DELETE CASCADE,
  push_token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id VARCHAR(255), -- Optional: device identifier
  app_version VARCHAR(50), -- Optional: app version
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one token per user per device
  UNIQUE(user_id, push_token)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON talkee.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_push_token ON talkee.user_devices(push_token);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION talkee.update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_devices_updated_at
  BEFORE UPDATE ON talkee.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION talkee.update_user_devices_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE talkee.user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own devices
CREATE POLICY "Users can view their own devices"
  ON talkee.user_devices
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own devices
CREATE POLICY "Users can insert their own devices"
  ON talkee.user_devices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own devices
CREATE POLICY "Users can update their own devices"
  ON talkee.user_devices
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own devices
CREATE POLICY "Users can delete their own devices"
  ON talkee.user_devices
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE talkee.user_devices IS 'Stores push notification tokens for user devices';
COMMENT ON COLUMN talkee.user_devices.push_token IS 'Expo Push Notification token';
COMMENT ON COLUMN talkee.user_devices.platform IS 'Device platform: ios, android, or web';
COMMENT ON COLUMN talkee.user_devices.device_id IS 'Optional device identifier for tracking';
COMMENT ON COLUMN talkee.user_devices.app_version IS 'Optional app version for debugging';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table creation
SELECT 
  'user_devices table created successfully' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'talkee' AND table_name = 'user_devices';

-- Verify RLS policies
SELECT 
  'RLS policies created' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'talkee' AND tablename = 'user_devices';

