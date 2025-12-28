-- Add missing indexes for favorites table to improve query performance
-- These indexes are critical for favorites queries

-- ✅ Composite index for isFavorite() query
-- This covers: user_id + professional_id lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_favorites_user_professional 
ON favorites(user_id, professional_id);

-- ✅ Index for created_at ordering (used in getFavorites())
-- This covers: user_id filter + created_at ordering
CREATE INDEX IF NOT EXISTS idx_favorites_user_created 
ON favorites(user_id, created_at DESC);

-- Note: The following indexes already exist (from schema migration):
-- - idx_favorites_user_id ON favorites(user_id)
-- - idx_favorites_professional_id ON favorites(professional_id)
-- But the composite indexes above are more efficient for specific query patterns

