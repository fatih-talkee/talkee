-- Optimize get_top_categories_by_professional_count function
-- The previous version was too slow due to complex UNION queries
-- This version is much simpler and faster

CREATE OR REPLACE FUNCTION get_top_categories_by_professional_count(limit_count INTEGER DEFAULT 8)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  icon_name TEXT,
  sort_order INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH category_counts AS (
    -- ✅ SIMPLIFIED: Count unique professionals per category
    -- Use UNION ALL to combine direct category_id and junction table
    -- Then COUNT DISTINCT to avoid double counting
    SELECT 
      category_id,
      COUNT(DISTINCT professional_id) as professional_count
    FROM (
      -- Direct category_id from professionals table
      SELECT 
        p.category_id,
        p.id as professional_id
      FROM professionals p
      WHERE p.is_active = true 
        AND p.is_public = true
        AND p.category_id IS NOT NULL
      
      UNION ALL
      
      -- Junction table (professional_categories)
      SELECT 
        pc.category_id,
        pc.professional_id
      FROM professional_categories pc
      INNER JOIN professionals p ON p.id = pc.professional_id
      WHERE p.is_active = true 
        AND p.is_public = true
    ) all_professionals
    GROUP BY category_id
  )
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.icon_name,
    c.sort_order,
    c.is_active,
    c.created_at,
    c.updated_at
  FROM categories c
  LEFT JOIN category_counts cc ON c.id = cc.category_id
  WHERE c.is_active = true
  ORDER BY 
    COALESCE(cc.professional_count, 0) DESC,
    c.sort_order ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ✅ Add comment explaining the optimization
COMMENT ON FUNCTION get_top_categories_by_professional_count IS 
'Optimized function to get top categories by professional count. 
Uses UNION ALL + COUNT DISTINCT for better performance than nested UNION queries.';

