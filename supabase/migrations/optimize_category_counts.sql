-- Optimize category professional counts query
-- This creates a more efficient way to count professionals per category

-- Create a function to get all category counts in one query
CREATE OR REPLACE FUNCTION get_all_category_professional_counts()
RETURNS TABLE(category_id UUID, professional_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH direct_counts AS (
    -- Count professionals from direct category_id field
    SELECT 
      p.category_id,
      COUNT(DISTINCT p.id) as count
    FROM professionals p
    WHERE p.is_active = true 
      AND p.is_public = true
      AND p.category_id IS NOT NULL
    GROUP BY p.category_id
  ),
  junction_counts AS (
    -- Count professionals from junction table
    SELECT 
      pc.category_id,
      COUNT(DISTINCT pc.professional_id) as count
    FROM professional_categories pc
    INNER JOIN professionals p ON p.id = pc.professional_id
    WHERE p.is_active = true 
      AND p.is_public = true
    GROUP BY pc.category_id
  ),
  combined_counts AS (
    -- Combine both counts (use MAX to avoid double counting)
    SELECT 
      COALESCE(dc.category_id, jc.category_id) as category_id,
      GREATEST(COALESCE(dc.count, 0), COALESCE(jc.count, 0)) as professional_count
    FROM direct_counts dc
    FULL OUTER JOIN junction_counts jc ON dc.category_id = jc.category_id
  )
  SELECT * FROM combined_counts;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add index for faster junction table queries if not exists
CREATE INDEX IF NOT EXISTS idx_professional_categories_category_active
ON professional_categories(category_id)
INCLUDE (professional_id);

-- Add index for faster direct category_id queries if not exists  
CREATE INDEX IF NOT EXISTS idx_professionals_category_active_public
ON professionals(category_id, is_active, is_public)
WHERE is_active = true AND is_public = true AND category_id IS NOT NULL;

