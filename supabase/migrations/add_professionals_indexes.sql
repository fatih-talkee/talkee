-- Add missing indexes for professionals table to improve query performance
-- These indexes are critical for featured professionals and public profile queries
-- ⚠️ IMPORTANT: Run this migration to fix slow query performance

-- ✅ Index for is_featured (used in getFeaturedProfessionals)
-- Partial index for better performance (only indexes true values)
CREATE INDEX IF NOT EXISTS idx_professionals_is_featured 
ON professionals(is_featured) 
WHERE is_featured = true;

-- ✅ Index for is_public (used in filtering public profiles)
-- Partial index for better performance (only indexes true values)
CREATE INDEX IF NOT EXISTS idx_professionals_is_public 
ON professionals(is_public) 
WHERE is_public = true;

-- ✅ Index for is_active (used in many queries)
-- Partial index for better performance (only indexes true values)
CREATE INDEX IF NOT EXISTS idx_professionals_is_active 
ON professionals(is_active) 
WHERE is_active = true;

-- ✅ Composite index for getFeaturedProfessionals query
-- Covers: is_active, is_public, is_featured filters + total_calls ordering
-- This is the most critical index for featured professionals queries
CREATE INDEX IF NOT EXISTS idx_professionals_featured_query 
ON professionals(is_active, is_public, is_featured, total_calls DESC) 
WHERE is_active = true AND is_public = true AND is_featured = true;

-- ✅ Composite index for category + featured query
-- Used when filtering by category AND featured
CREATE INDEX IF NOT EXISTS idx_professionals_category_featured 
ON professionals(category_id, is_active, is_public, is_featured, total_calls DESC) 
WHERE is_active = true AND is_public = true AND is_featured = true;

-- ✅ Composite index for getProfessionals query (without category filter)
-- Covers: is_active, is_public filters + is_featured, total_calls ordering
CREATE INDEX IF NOT EXISTS idx_professionals_list_query 
ON professionals(is_active, is_public, is_featured DESC, total_calls DESC) 
WHERE is_active = true AND is_public = true;

-- ✅ Composite index for getProfessionals query (with category filter)
-- Covers: category_id + is_active, is_public filters + is_featured, total_calls ordering
CREATE INDEX IF NOT EXISTS idx_professionals_category_list 
ON professionals(category_id, is_active, is_public, is_featured DESC, total_calls DESC) 
WHERE is_active = true AND is_public = true;

-- ✅ Composite index for getAvailableProfessionals query
-- Covers: is_active, is_available, is_public filters + is_featured, total_calls ordering
CREATE INDEX IF NOT EXISTS idx_professionals_available_query 
ON professionals(is_active, is_available, is_public, is_featured DESC, total_calls DESC) 
WHERE is_active = true AND is_available = true AND is_public = true;

