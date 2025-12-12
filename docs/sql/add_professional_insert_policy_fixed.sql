-- ============================================================================
-- RLS POLICY: Allow users to insert their own professional profile
-- ============================================================================
-- This policy allows authenticated users to create their own professional profile
-- by checking that the user_id matches the authenticated user's ID

-- First, drop the policy if it already exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own professional profile" ON professionals;

-- Create the INSERT policy
-- Note: In WITH CHECK clause, we can reference the new row's columns directly
CREATE POLICY "Users can insert own professional profile"
    ON professionals FOR INSERT
    WITH CHECK (
        -- Check that user is authenticated
        auth.uid() IS NOT NULL
        AND
        -- Check that the user_id in the new row matches the authenticated user
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- ============================================================================
-- Alternative approach (if the above doesn't work):
-- ============================================================================
-- If the above policy still doesn't work, try this simpler version:
-- 
-- CREATE POLICY "Users can insert own professional profile"
--     ON professionals FOR INSERT
--     WITH CHECK (
--         EXISTS (
--             SELECT 1 FROM users 
--             WHERE users.id = professionals.user_id 
--             AND users.auth_id = auth.uid()
--         )
--     );
-- ============================================================================

