-- ============================================================================
-- CLEANUP DUPLICATE AVATAR POLICIES
-- ============================================================================
-- This script removes duplicate avatar policies and keeps only the correct ones
-- Run this in Supabase SQL Editor

-- Drop duplicate policies (keep the ones with "avatars" plural)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;

-- Keep these policies (they are correct):
-- - "Users can upload their own avatars" (INSERT)
-- - "Users can update their own avatars" (UPDATE)
-- - "Users can delete their own avatars" (DELETE)
-- - "Public can view avatars" (SELECT)

-- ============================================================================
-- VERIFICATION:
-- ============================================================================

-- After running, verify only 4 policies remain:
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY cmd, policyname;

-- Expected result: 4 policies
-- 1. "Public can view avatars" (SELECT)
-- 2. "Users can delete their own avatars" (DELETE)
-- 3. "Users can update their own avatars" (UPDATE)
-- 4. "Users can upload their own avatars" (INSERT)

