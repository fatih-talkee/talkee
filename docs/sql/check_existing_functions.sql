-- ============================================================================
-- CHECK EXISTING add_user_credits FUNCTIONS
-- ============================================================================
-- Run this first to see what functions exist

SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'add_user_credits'
ORDER BY routine_name;

-- Also check pg_proc for more details
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_user_credits';
