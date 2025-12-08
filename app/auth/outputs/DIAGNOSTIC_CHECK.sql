-- 🔍 DIAGNOSTIC QUERY - CHECK CURRENT USERS TABLE STRUCTURE
-- Run this first to see what columns you have

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Also check for any triggers or functions that reference 'email'
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%email%'
  AND routine_schema = 'public';

-- Check for triggers
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';
