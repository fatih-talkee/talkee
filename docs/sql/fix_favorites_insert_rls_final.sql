-- ============================================================================
-- FIX FAVORITES INSERT RLS POLICY - FINAL SOLUTION
-- ============================================================================
-- The issue: RLS policy uses a subquery that accesses users table during
-- policy evaluation. While foreign key constraints bypass RLS, Supabase REST API
-- evaluates RLS policies first, and if the subquery fails or returns no rows
-- during policy evaluation, the INSERT might be blocked before foreign key check.

-- Solution: Simplify RLS policy to avoid subquery that accesses users table.
-- Instead, validate that user_id matches the authenticated user's ID directly.
-- The foreign key constraint will handle checking if the user exists in users table.

-- Step 1: Drop existing policy
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;

-- Step 2: Create simplified RLS policy
-- This policy validates that user_id matches authenticated user without subquery
CREATE POLICY "Users can insert own favorites"
    ON favorites FOR INSERT
    WITH CHECK (
        -- Check that user is authenticated
        auth.uid() IS NOT NULL
        AND
        -- Validate that the user_id belongs to the authenticated user
        -- We get the user_id from the application code which already verified
        -- that it matches auth.uid() via users table lookup
        -- Here we just need to ensure the user is authenticated
        -- The foreign key constraint will verify the user exists in users table
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = favorites.user_id 
            AND auth_id = auth.uid()
        )
    );

-- Wait, this still has a subquery. Let me think of a better approach...

-- Actually, the real solution is to ensure that during RLS policy evaluation,
-- the users table is accessible. The "Public user info readable" policy should
-- handle this, but maybe there's an order issue or the policy isn't being applied.

-- Let's try a different approach: Use a security definer function that bypasses RLS
-- for the users table lookup, or ensure the users table policy allows this lookup.

-- Actually, the simplest solution: Just check that auth.uid() is not null and
-- trust that the application code has already validated the user_id.
-- The foreign key constraint will handle the rest.

-- But that's not secure. We need to validate that user_id matches auth.uid().

-- Final solution: Keep the subquery but ensure users table is accessible.
-- The issue might be that during policy evaluation, the session context is different.
-- Let's ensure the policy works by checking if we can access users table.

-- Actually, I think the real issue is that Supabase might be evaluating the RLS
-- policy in a way that doesn't properly see the users table even with the
-- "Public user info readable" policy.

-- Let's try removing the RLS policy check temporarily to see if foreign key works:
-- No, that's not secure.

-- Better solution: Use a security definer function to check user_id:
CREATE OR REPLACE FUNCTION check_user_belongs_to_auth(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id_param 
        AND auth_id = auth.uid()
    );
END;
$$;

-- Now update the policy to use this function:
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;

CREATE POLICY "Users can insert own favorites"
    ON favorites FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND
        check_user_belongs_to_auth(favorites.user_id)
    );

-- Grant execute permission:
GRANT EXECUTE ON FUNCTION check_user_belongs_to_auth(UUID) TO authenticated;

-- This function runs with SECURITY DEFINER, which means it runs with the privileges
-- of the function owner (usually the postgres superuser), bypassing RLS on users table.
-- This ensures the function can always check if the user_id matches auth.uid().

-- Verify the policy:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'favorites' AND policyname = 'Users can insert own favorites';

