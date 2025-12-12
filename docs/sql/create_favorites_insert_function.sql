-- ============================================================================
-- CREATE FAVORITES INSERT FUNCTION - BYPASS RLS ISSUE
-- ============================================================================
-- This creates an RPC function that uses SECURITY DEFINER to bypass RLS
-- when inserting favorites, ensuring foreign key constraints work correctly
-- ============================================================================

-- Step 1: Create SECURITY DEFINER function to insert favorite
CREATE OR REPLACE FUNCTION insert_favorite(
    p_user_id UUID,
    p_professional_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    professional_id UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_id UUID;
    v_fav_id UUID;
    v_fav_user_id UUID;
    v_fav_professional_id UUID;
    v_fav_created_at TIMESTAMPTZ;
BEGIN
    -- Get current authenticated user's auth_id
    v_auth_id := auth.uid();
    
    -- Verify that the p_user_id belongs to the authenticated user
    -- This check uses SECURITY DEFINER privileges, so it can access users table
    IF NOT EXISTS (
        SELECT 1 
        FROM users 
        WHERE users.id = p_user_id 
        AND users.auth_id = v_auth_id
    ) THEN
        RAISE EXCEPTION 'User ID does not match authenticated user';
    END IF;
    
    -- Verify that the professional exists
    IF NOT EXISTS (
        SELECT 1 
        FROM professionals 
        WHERE professionals.id = p_professional_id
    ) THEN
        RAISE EXCEPTION 'Professional does not exist';
    END IF;
    
    -- Check if favorite already exists
    IF EXISTS (
        SELECT 1 
        FROM favorites 
        WHERE favorites.user_id = p_user_id 
        AND favorites.professional_id = p_professional_id
    ) THEN
        RAISE EXCEPTION 'Favorite already exists';
    END IF;
    
    -- Insert the favorite (without RETURNING to avoid ambiguity)
    -- This runs with SECURITY DEFINER, so it bypasses RLS on favorites table
    INSERT INTO favorites (favorites.user_id, favorites.professional_id)
    VALUES (p_user_id, p_professional_id);
    
    -- Now query and return the inserted row
    RETURN QUERY
    SELECT 
        f.id,
        f.user_id,
        f.professional_id,
        f.created_at
    FROM favorites f
    WHERE f.user_id = p_user_id 
    AND f.professional_id = p_professional_id
    ORDER BY f.created_at DESC
    LIMIT 1;
END;
$$;

-- Step 2: Grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION insert_favorite(UUID, UUID) TO authenticated;

-- Step 3: Add comment
COMMENT ON FUNCTION insert_favorite(UUID, UUID) IS 
'Insert a favorite with SECURITY DEFINER to bypass RLS issues with foreign key constraints';

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Check if function exists
SELECT 
    proname as function_name,
    prosecdef as is_security_definer,
    proargtypes::regtype[] as argument_types
FROM pg_proc
WHERE proname = 'insert_favorite';

