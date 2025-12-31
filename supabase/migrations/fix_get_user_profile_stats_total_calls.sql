-- ============================================================================
-- FIX get_user_profile_stats FUNCTION - Count calls where user is caller OR professional
-- ============================================================================
-- Previous version only counted calls where user is the caller
-- Now it counts calls where user is either caller OR professional (callee)
-- This matches the call history behavior where both parties see the same call

CREATE OR REPLACE FUNCTION get_user_profile_stats(p_user_id UUID)
RETURNS TABLE (
  total_calls BIGINT,
  favorites_count BIGINT,
  blocked_users_count BIGINT,
  invoices_count BIGINT,
  total_spent NUMERIC,
  member_since TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_professional_id UUID;
BEGIN
  -- Get professional_id for this user (if they are a professional)
  SELECT id INTO v_professional_id
  FROM professionals
  WHERE user_id = p_user_id
  LIMIT 1;

  RETURN QUERY
  SELECT
    -- ✅ FIX: Total calls (ALL calls where user is caller OR professional)
    -- This matches the call history behavior - counts all calls, not just completed
    COALESCE((
      SELECT COUNT(*)
      FROM calls
      WHERE (
        caller_id = p_user_id
        OR (v_professional_id IS NOT NULL AND professional_id = v_professional_id)
      )
      -- ✅ Removed status filter to count ALL calls (completed, missed, cancelled, etc.)
      -- This matches the call history "all" filter behavior
    ), 0)::BIGINT AS total_calls,
    
    -- Favorites count
    COALESCE((
      SELECT COUNT(*)
      FROM favorites
      WHERE user_id = p_user_id
    ), 0)::BIGINT AS favorites_count,
    
    -- Blocked users count (for professionals)
    COALESCE((
      SELECT COUNT(*)
      FROM blocked_users
      WHERE blocker_id = p_user_id
    ), 0)::BIGINT AS blocked_users_count,
    
    -- Invoices count (all invoices where user is the caller)
    -- This includes both call invoices and credit purchase invoices
    COALESCE((
      SELECT COUNT(*)
      FROM invoices
      WHERE caller_id = p_user_id
    ), 0)::BIGINT AS invoices_count,
    
    -- Total spent (sum of all invoice amounts where user is the caller)
    COALESCE((
      SELECT SUM(total_amount)
      FROM invoices
      WHERE caller_id = p_user_id
    ), 0)::NUMERIC AS total_spent,
    
    -- Member since (user creation date)
    (
      SELECT created_at
      FROM users
      WHERE id = p_user_id
    ) AS member_since;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile_stats(UUID) TO authenticated;

-- Update comment
COMMENT ON FUNCTION get_user_profile_stats(UUID) IS 
  'Returns user profile statistics including total calls, favorites, blocked users, invoices count, total spent, and member since date. Total calls counts ALL calls (completed, missed, cancelled, etc.) where user is either the caller OR the professional (callee), matching call history "all" filter behavior.';

