-- =====================================================
-- Optimize Categories Queries - Index Recommendations
-- =====================================================
-- This script checks and recommends indexes for the optimized
-- getCategoriesWithCounts query that fetches all data in 3 queries
-- instead of 68*3 queries.

-- =====================================================
-- 1. Check existing indexes
-- =====================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('professionals', 'professional_categories', 'categories')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 2. Recommended indexes for professionals table
-- =====================================================
-- Index for: SELECT id, category_id FROM professionals WHERE is_active=true AND is_public=true
-- This query is used to get all active/public professionals with their category_id

-- Check if index exists
SELECT EXISTS (
  SELECT 1
  FROM pg_indexes
  WHERE indexname = 'idx_professionals_active_public_category'
) AS index_exists;

-- Create index if it doesn't exist (composite index for the query)
-- This index covers: is_active, is_public, category_id
CREATE INDEX IF NOT EXISTS idx_professionals_active_public_category
ON professionals (is_active, is_public, category_id)
WHERE is_active = true AND is_public = true;

-- =====================================================
-- 3. Recommended indexes for professional_categories table
-- =====================================================
-- Index for: SELECT professional_id, category_id FROM professional_categories
-- This query fetches all junction table entries

-- Check if index exists
SELECT EXISTS (
  SELECT 1
  FROM pg_indexes
  WHERE indexname = 'idx_professional_categories_category_professional'
) AS index_exists;

-- Create composite index for category_id lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_professional_categories_category_professional
ON professional_categories (category_id, professional_id);

-- Create index for professional_id lookups (used in verification queries)
-- This prevents sequential scans when filtering by professional_id
CREATE INDEX IF NOT EXISTS idx_professional_categories_professional_id
ON professional_categories (professional_id);

-- =====================================================
-- 4. Recommended indexes for professionals verification query
-- =====================================================
-- Index for: SELECT id FROM professionals WHERE id IN (...) AND is_active=true AND is_public=true
-- This query verifies junction professionals are still active/public

-- The existing index idx_professionals_active_public_category should cover this
-- But we can also create a partial index for faster lookups

-- Check if index exists
SELECT EXISTS (
  SELECT 1
  FROM pg_indexes
  WHERE indexname = 'idx_professionals_id_active_public'
) AS index_exists;

-- Create index if it doesn't exist (partial index for verification)
CREATE INDEX IF NOT EXISTS idx_professionals_id_active_public
ON professionals (id)
WHERE is_active = true AND is_public = true;

-- =====================================================
-- 5. Analyze table statistics (run after creating indexes)
-- =====================================================
ANALYZE professionals;
ANALYZE professional_categories;
ANALYZE categories;

-- =====================================================
-- 6. Check index usage (run after some queries)
-- =====================================================
-- This query shows which indexes are being used
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE relname IN ('professionals', 'professional_categories', 'categories')
ORDER BY idx_scan DESC;

-- =====================================================
-- 7. Performance test query
-- =====================================================
-- Test the optimized query pattern:
-- 
-- Query 1: Get all active/public professionals with category_id
EXPLAIN ANALYZE
SELECT id, category_id
FROM professionals
WHERE is_active = true AND is_public = true;

-- Query 2: Get all junction table entries
EXPLAIN ANALYZE
SELECT professional_id, category_id
FROM professional_categories;

-- Query 3: Verify professionals (example with 10 IDs)
EXPLAIN ANALYZE
SELECT id
FROM professionals
WHERE id IN (
  SELECT professional_id
  FROM professional_categories
  LIMIT 10
)
AND is_active = true AND is_public = true;
