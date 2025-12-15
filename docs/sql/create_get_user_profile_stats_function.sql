-- ============================================================================
-- CREATE get_user_profile_stats FUNCTION
-- ============================================================================
-- This function calculates user profile statistics including invoice count
-- It should count all invoices where caller_id = user_id (for credit purchases and calls)

CREATE OR REPLACE FUNCTION get_user_profile_stats(p_user_id UUID)
RETURNS TABLE (
  total_calls BIGINT,
  favorites_count BIGINT,
  blocked_users_count BIGINT,
  invoices_count BIGINT,
  total_spent NUMERIC,
  member_since TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total calls (completed calls where user is the caller)
    COALESCE((
      SELECT COUNT(*)
      FROM calls
      WHERE caller_id = p_user_id
        AND status = 'completed'
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

-- Add comment
COMMENT ON FUNCTION get_user_profile_stats(UUID) IS 
  'Returns user profile statistics including total calls, favorites, blocked users, invoices count, total spent, and member since date. Counts all invoices where caller_id matches the user_id (includes both call invoices and credit purchase invoices).';

