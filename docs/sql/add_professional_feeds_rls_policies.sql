-- ============================================================================
-- RLS POLICIES: PROFESSIONAL_FEEDS
-- ============================================================================
-- These policies allow professionals to manage their own feed posts

-- Enable RLS on professional_feeds table (if not already enabled)
ALTER TABLE professional_feeds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can read active professional feeds" ON professional_feeds;
DROP POLICY IF EXISTS "Professionals can insert own feeds" ON professional_feeds;
DROP POLICY IF EXISTS "Professionals can update own feeds" ON professional_feeds;
DROP POLICY IF EXISTS "Professionals can delete own feeds" ON professional_feeds;

-- ============================================================================
-- SELECT POLICY: Anyone can read active feeds
-- ============================================================================
CREATE POLICY "Anyone can read active professional feeds"
    ON professional_feeds FOR SELECT
    USING (
        is_active = true
        AND deleted_at IS NULL
    );

-- ============================================================================
-- INSERT POLICY: Professionals can create their own feed posts
-- ============================================================================
CREATE POLICY "Professionals can insert own feeds"
    ON professional_feeds FOR INSERT
    WITH CHECK (
        -- Check that user is authenticated
        auth.uid() IS NOT NULL
        AND
        -- Check that the professional_id belongs to the authenticated user
        professional_id IN (
            SELECT p.id 
            FROM professionals p
            INNER JOIN users u ON p.user_id = u.id
            WHERE u.auth_id = auth.uid()
        )
    );

-- ============================================================================
-- UPDATE POLICY: Professionals can update their own feed posts
-- ============================================================================
CREATE POLICY "Professionals can update own feeds"
    ON professional_feeds FOR UPDATE
    USING (
        -- Check that the professional_id belongs to the authenticated user
        professional_id IN (
            SELECT p.id 
            FROM professionals p
            INNER JOIN users u ON p.user_id = u.id
            WHERE u.auth_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Same check for the updated row
        professional_id IN (
            SELECT p.id 
            FROM professionals p
            INNER JOIN users u ON p.user_id = u.id
            WHERE u.auth_id = auth.uid()
        )
    );

-- ============================================================================
-- DELETE POLICY: Professionals can delete their own feed posts
-- ============================================================================
CREATE POLICY "Professionals can delete own feeds"
    ON professional_feeds FOR DELETE
    USING (
        -- Check that the professional_id belongs to the authenticated user
        professional_id IN (
            SELECT p.id 
            FROM professionals p
            INNER JOIN users u ON p.user_id = u.id
            WHERE u.auth_id = auth.uid()
        )
    );

-- ============================================================================
-- Note: These policies ensure that:
-- 1. Anyone can read active, non-deleted feed posts
-- 2. Only professionals can create feed posts for their own profile
-- 3. Only professionals can update/delete their own feed posts
-- 4. The professional_id must belong to the authenticated user
-- ============================================================================

