-- ============================================================================
-- SOFT DELETE USER ACCOUNT (RECOMMENDED APPROACH)
-- ============================================================================
-- This approach:
-- 1. Anonymizes user's personal data (GDPR compliant)
-- 2. Keeps transactional data (calls, reviews, invoices) for audit trail
-- 3. Prevents user from logging in again
-- 4. Maintains data integrity for professionals and call history
-- ============================================================================

-- Step 1: Add soft delete columns to users table (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Step 2: Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- ============================================================================
-- SOFT DELETE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION soft_delete_user_account(user_id_to_delete UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  professional_id_to_delete UUID;
  result JSONB;
BEGIN
  -- Get professional ID if user is a professional
  SELECT id INTO professional_id_to_delete
  FROM professionals
  WHERE user_id = user_id_to_delete
  LIMIT 1;

  -- ========================================================================
  -- STEP 1: Soft delete professional (if exists)
  -- ========================================================================
  IF professional_id_to_delete IS NOT NULL THEN
    -- Mark professional as deleted/unavailable
    UPDATE professionals
    SET 
      is_available = false,
      is_active = false,
      updated_at = NOW()
    WHERE id = professional_id_to_delete;
  END IF;

  -- ========================================================================
  -- STEP 2: Anonymize user's personal data
  -- ========================================================================
  UPDATE users
  SET 
    -- Anonymize personal identifiers
    name = 'Deleted User',
    email = NULL,
    primary_email = NULL,
    phone = NULL,
    avatar_url = NULL,
    bio = NULL,
    
    -- Clear OAuth data
    oauth_emails = '{}'::jsonb,
    oauth_providers = '[]'::jsonb,
    
    -- Clear account linking
    linked_accounts = ARRAY[]::UUID[],
    
    -- Mark as deleted
    is_deleted = true,
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = user_id_to_delete;

  -- ========================================================================
  -- STEP 3: Delete auth user (so they can't login again)
  -- ========================================================================
  -- Note: This requires service role key, will be done in application code

  -- ========================================================================
  -- Return success
  -- ========================================================================
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User account anonymized and soft deleted successfully',
    'user_id', user_id_to_delete,
    'professional_id', professional_id_to_delete,
    'note', 'Auth user deletion must be done separately with service role key'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION soft_delete_user_account(UUID) TO authenticated;

-- ============================================================================
-- UPDATE RLS POLICIES TO EXCLUDE DELETED USERS
-- ============================================================================

-- Update existing policies to exclude deleted users
-- (Users can only see non-deleted users in queries)

-- Example: Update favorites policy
DROP POLICY IF EXISTS "Users can read own favorites" ON favorites;
CREATE POLICY "Users can read own favorites"
    ON favorites FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users 
            WHERE auth_id = auth.uid() 
            AND is_deleted = false
        )
    );

-- ============================================================================
-- HELPER FUNCTION: Get anonymized user display name
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_display_name(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_name TEXT;
  user_deleted BOOLEAN;
BEGIN
  SELECT name, is_deleted INTO user_name, user_deleted
  FROM users
  WHERE id = user_id_param;
  
  IF user_deleted THEN
    RETURN 'Deleted User';
  END IF;
  
  RETURN COALESCE(user_name, 'Unknown User');
END;
$$;

-- ============================================================================
-- USAGE EXAMPLE
-- ============================================================================
-- SELECT soft_delete_user_account('user-uuid-here');
-- 
-- Returns:
-- {
--   "success": true,
--   "message": "User account anonymized and soft deleted successfully",
--   "user_id": "user-uuid-here",
--   "professional_id": "professional-uuid-here" (or null)
-- }

