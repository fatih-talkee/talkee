-- ============================================================================
-- GET CURRENT USER ID
-- ============================================================================
-- This script helps you find your user ID (from users table) and auth_id
-- Run this in Supabase SQL Editor while logged in

-- Option 1: Get your user info using auth.uid()
SELECT 
    id as user_id,
    auth_id,
    name,
    primary_email,
    created_at
FROM users
WHERE auth_id = auth.uid();

-- Option 2: If you know your email, search by email
-- Replace 'your-email@example.com' with your actual email
SELECT 
    id as user_id,
    auth_id,
    name,
    primary_email,
    created_at
FROM users
WHERE primary_email = 'your-email@example.com';

-- Option 3: List all users (if you have admin access)
SELECT 
    id as user_id,
    auth_id,
    name,
    primary_email,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;





