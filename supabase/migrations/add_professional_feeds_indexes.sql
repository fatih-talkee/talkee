-- Add missing indexes for professional_feeds table to improve query performance
-- These indexes are critical for feed queries

-- ✅ Index for professional_id (foreign key, used in filtering)
CREATE INDEX IF NOT EXISTS idx_professional_feeds_professional_id 
ON professional_feeds(professional_id);

-- ✅ Composite index for getFeeds() query (most common query)
-- Covers: is_active, deleted_at filters + is_pinned, created_at ordering
CREATE INDEX IF NOT EXISTS idx_professional_feeds_active_ordering 
ON professional_feeds(is_active, deleted_at, is_pinned DESC, created_at DESC)
WHERE is_active = true AND deleted_at IS NULL;

-- ✅ Composite index for getFeeds() with professional_id filter
-- Covers: professional_id + is_active, deleted_at filters + is_pinned, created_at ordering
CREATE INDEX IF NOT EXISTS idx_professional_feeds_professional_active 
ON professional_feeds(professional_id, is_active, deleted_at, is_pinned DESC, created_at DESC)
WHERE is_active = true AND deleted_at IS NULL;

-- ✅ Composite index for getTrendingFeeds() query
-- Covers: is_active, deleted_at filters + created_at range + views_count, created_at ordering
CREATE INDEX IF NOT EXISTS idx_professional_feeds_trending 
ON professional_feeds(is_active, deleted_at, created_at DESC, views_count DESC)
WHERE is_active = true AND deleted_at IS NULL;

-- ✅ Index for deleted_at (used in soft delete queries)
CREATE INDEX IF NOT EXISTS idx_professional_feeds_deleted_at 
ON professional_feeds(deleted_at)
WHERE deleted_at IS NULL;

-- ✅ Index for created_at (used in date range queries)
CREATE INDEX IF NOT EXISTS idx_professional_feeds_created_at 
ON professional_feeds(created_at DESC);

-- ✅ Index for views_count (used in trending queries)
CREATE INDEX IF NOT EXISTS idx_professional_feeds_views_count 
ON professional_feeds(views_count DESC);

