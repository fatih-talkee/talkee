-- ============================================================================
-- ADD deleted_at COLUMN TO users TABLE FOR ACCOUNT RESTORATION
-- ============================================================================
-- This enables soft delete with the ability to restore accounts when users
-- sign in again with the same auth provider

-- Step 1: Add deleted_at column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Step 2: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Step 3: Create index for auth_id lookups (for restoration checks)
CREATE INDEX IF NOT EXISTS idx_users_auth_id_deleted ON users(auth_id, deleted_at);

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'deleted_at';

