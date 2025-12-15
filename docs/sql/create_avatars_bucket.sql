-- ============================================================================
-- CREATE AVATARS STORAGE BUCKET
-- ============================================================================
-- This script creates the avatars bucket in Supabase Storage
-- Run this in Supabase SQL Editor

-- Note: Storage buckets are created via Supabase Dashboard or Storage API
-- This SQL is for reference only - actual bucket creation should be done via:
-- 1. Supabase Dashboard → Storage → New Bucket
-- 2. Or via Supabase Storage API

-- ============================================================================
-- MANUAL STEPS (Supabase Dashboard):
-- ============================================================================

-- 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets
-- 2. Click "New bucket"
-- 3. Bucket name: "avatars"
-- 4. Public bucket: ✅ YES (avatars need to be publicly accessible)
-- 5. File size limit: 5 MB (or as needed)
-- 6. Allowed MIME types: image/jpeg, image/png, image/webp
-- 7. Click "Create bucket"

-- ============================================================================
-- STORAGE POLICIES (RLS):
-- ============================================================================

-- After creating the bucket, set up RLS policies:
-- NOTE: If policies already exist, you'll get an error. That's OK - policies are already set up.
-- To recreate policies, first drop them or use: DROP POLICY IF EXISTS ...

-- Policy 1: Users can upload their own avatars
-- Drop if exists to avoid duplicate error
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Everyone can view avatars (public read)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================================================
-- VERIFICATION:
-- ============================================================================

-- Check if bucket exists:
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Check policies:
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%';
