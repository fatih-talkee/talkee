-- ============================================================================
-- DELETE USER ACCOUNT FUNCTION
-- ============================================================================
-- This function performs a HARD DELETE of a user account and all related data
-- It bypasses RLS policies and should be called with service role key
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function creator (bypasses RLS)
AS $$
DECLARE
  professional_id_to_delete UUID;
  deleted_count INTEGER;
  result JSONB;
BEGIN
  -- Get professional ID if user is a professional
  SELECT id INTO professional_id_to_delete
  FROM professionals
  WHERE user_id = user_id_to_delete
  LIMIT 1;

  -- ========================================================================
  -- STEP 1: Delete calls FIRST (they have RESTRICT constraint on professional_id)
  -- ========================================================================
  
  -- Delete calls where user is the caller
  DELETE FROM calls WHERE caller_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete calls where user is the professional (if professional exists)
  IF professional_id_to_delete IS NOT NULL THEN
    DELETE FROM calls WHERE professional_id = professional_id_to_delete;
  END IF;

  -- ========================================================================
  -- STEP 2: Delete all professional-related data (if professional exists)
  -- ========================================================================
  IF professional_id_to_delete IS NOT NULL THEN
    -- Delete professional educations
    DELETE FROM professional_educations WHERE professional_id = professional_id_to_delete;
    
    -- Delete professional experiences
    DELETE FROM professional_experiences WHERE professional_id = professional_id_to_delete;
    
    -- Delete professional categories
    DELETE FROM professional_categories WHERE professional_id = professional_id_to_delete;
    
    -- Delete availabilities
    DELETE FROM availabilities WHERE professional_id = professional_id_to_delete;
    
    -- Delete professional feeds
    DELETE FROM professional_feeds WHERE professional_id = professional_id_to_delete;
    
    -- Delete reviews (where user is the professional being reviewed)
    DELETE FROM reviews WHERE professional_id = professional_id_to_delete;
    
    -- Delete professional record
    DELETE FROM professionals WHERE id = professional_id_to_delete;
  END IF;

  -- ========================================================================
  -- STEP 3: Delete all user-related data
  -- ========================================================================
  
  -- Delete reviews (where user wrote the review as reviewer)
  DELETE FROM reviews WHERE reviewer_id = user_id_to_delete;
  
  -- Delete transactions
  DELETE FROM transactions WHERE user_id = user_id_to_delete;
  
  -- Delete invoices (where user is caller or professional)
  DELETE FROM invoices 
  WHERE caller_id = user_id_to_delete 
     OR (professional_id_to_delete IS NOT NULL AND professional_id = professional_id_to_delete);
  
  -- Delete donations
  DELETE FROM donations WHERE user_id = user_id_to_delete;
  
  -- Delete user charity settings
  DELETE FROM user_charity_settings WHERE user_id = user_id_to_delete;
  
  -- Delete user charity allocations
  DELETE FROM user_charity_allocations WHERE user_id = user_id_to_delete;
  
  -- Delete favorites
  DELETE FROM favorites WHERE user_id = user_id_to_delete;
  
  -- Delete blocked users (both directions - where user is blocker or blocked)
  DELETE FROM blocked_users 
  WHERE blocker_id = user_id_to_delete OR blocked_id = user_id_to_delete;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = user_id_to_delete;

  -- ========================================================================
  -- STEP 4: Delete user record
  -- ========================================================================
  DELETE FROM users WHERE id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found or already deleted'
    );
  END IF;

  -- ========================================================================
  -- Return success
  -- ========================================================================
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User account and all related data deleted successfully',
    'user_id', user_id_to_delete,
    'professional_id', professional_id_to_delete
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
-- Allow authenticated users to call this function
-- (They can only delete their own account via application logic)
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- ============================================================================
-- USAGE EXAMPLE
-- ============================================================================
-- SELECT delete_user_account('user-uuid-here');
-- 
-- Returns:
-- {
--   "success": true,
--   "message": "User account and all related data deleted successfully",
--   "user_id": "user-uuid-here",
--   "professional_id": "professional-uuid-here" (or null)
-- }

