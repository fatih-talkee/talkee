-- ✅ SUPER SIMPLE MIGRATION - ONLY ADD NEW COLUMNS
-- This version does NOT touch any existing columns

-- Step 1: Add primary_email column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS primary_email TEXT;

-- Step 2: Add OAuth tracking columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_providers JSONB DEFAULT '[]'::jsonb;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_emails JSONB DEFAULT '{}'::jsonb;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS linked_accounts UUID[] DEFAULT ARRAY[]::UUID[];

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_primary_account BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS merged_from UUID[];

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS merged_into UUID;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_primary_email ON users(primary_email);
CREATE INDEX IF NOT EXISTS idx_users_oauth_emails ON users USING GIN (oauth_emails);
CREATE INDEX IF NOT EXISTS idx_users_oauth_providers ON users USING GIN (oauth_providers);

-- Step 4: Update existing users to have default values
UPDATE users
SET 
  oauth_providers = COALESCE(oauth_providers, '[]'::jsonb),
  oauth_emails = COALESCE(oauth_emails, '{}'::jsonb),
  is_primary_account = COALESCE(is_primary_account, true)
WHERE oauth_providers IS NULL 
   OR oauth_emails IS NULL 
   OR is_primary_account IS NULL;

-- Step 5: Create audit table
CREATE TABLE IF NOT EXISTS account_linking_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('link', 'unlink', 'merge')),
  provider TEXT,
  secondary_user_id UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON account_linking_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON account_linking_audit(created_at);

-- Step 6: Enable RLS on audit table
ALTER TABLE account_linking_audit ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policy for audit table
DROP POLICY IF EXISTS "Users can view their own audit logs" ON account_linking_audit;

CREATE POLICY "Users can view their own audit logs"
  ON account_linking_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = account_linking_audit.user_id 
        AND users.auth_id = auth.uid()
    )
  );

-- ✅ DONE! 
-- This migration only ADDS columns, never modifies or renames existing ones
