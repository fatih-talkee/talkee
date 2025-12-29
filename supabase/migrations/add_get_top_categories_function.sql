-- Create optimized function to get top categories by professional count
-- This is MUCH faster than fetching all categories and sorting in JavaScript

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
    -- Combine both counts (use UNION to avoid double counting same professional)
    SELECT 
      category_id,
      COUNT(DISTINCT professional_id) as professional_count
    FROM (
      SELECT 
        p.category_id,
        p.id as professional_id
      FROM professionals p
      WHERE p.is_active = true 
        AND p.is_public = true
        AND p.category_id IS NOT NULL
      
      UNION
      
      SELECT 
        pc.category_id,
        pc.professional_id
      FROM professional_categories pc
      INNER JOIN professionals p ON p.id = pc.professional_id
      WHERE p.is_active = true 
        AND p.is_public = true
    ) combined
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
    -- ✅ Only fields needed for list display - no description, emoji, group_id, etc.
  FROM categories c
  LEFT JOIN combined_counts cc ON c.id = cc.category_id
  WHERE c.is_active = true
  ORDER BY 
    COALESCE(cc.professional_count, 0) DESC,
    c.sort_order ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

