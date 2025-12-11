-- ============================================================================
-- UPDATE PROMOTION GRADIENT COLORS
-- ============================================================================
-- Updates promotion gradient colors based on display_order
-- Order: 1st = Blue, 2nd = Yellow, 3rd = Green, 4th = Purple
-- ============================================================================

-- 1st promotion (display_order = 1) → Blue gradient
UPDATE promotions
SET 
  gradient_start = '#3B82F6',
  gradient_end = '#2563EB',
  updated_at = NOW()
WHERE display_order = 1 AND is_active = true;

-- 2nd promotion (display_order = 2) → Yellow gradient
UPDATE promotions
SET 
  gradient_start = '#FBBF24',
  gradient_end = '#F59E0B',
  updated_at = NOW()
WHERE display_order = 2 AND is_active = true;

-- 3rd promotion (display_order = 3) → Green gradient
UPDATE promotions
SET 
  gradient_start = '#10B981',
  gradient_end = '#059669',
  updated_at = NOW()
WHERE display_order = 3 AND is_active = true;

-- 4th promotion (display_order = 4) → Purple gradient
UPDATE promotions
SET 
  gradient_start = '#8B5CF6',
  gradient_end = '#7C3AED',
  updated_at = NOW()
WHERE display_order = 4 AND is_active = true;

-- 5th promotion (display_order = 5) → Blue gradient (cycle back)
UPDATE promotions
SET 
  gradient_start = '#3B82F6',
  gradient_end = '#2563EB',
  updated_at = NOW()
WHERE display_order = 5 AND is_active = true;

-- 6th promotion (display_order = 6) → Yellow gradient
UPDATE promotions
SET 
  gradient_start = '#FBBF24',
  gradient_end = '#F59E0B',
  updated_at = NOW()
WHERE display_order = 6 AND is_active = true;

-- 7th promotion (display_order = 7) → Green gradient
UPDATE promotions
SET 
  gradient_start = '#10B981',
  gradient_end = '#059669',
  updated_at = NOW()
WHERE display_order = 7 AND is_active = true;

-- 8th promotion (display_order = 8) → Purple gradient
UPDATE promotions
SET 
  gradient_start = '#8B5CF6',
  gradient_end = '#7C3AED',
  updated_at = NOW()
WHERE display_order = 8 AND is_active = true;

-- Verify the updates
SELECT 
  id,
  title,
  display_order,
  gradient_start,
  gradient_end,
  is_active
FROM promotions
WHERE is_active = true
ORDER BY display_order ASC;

