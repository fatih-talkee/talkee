-- Add missing composite indexes for calls table to improve query performance
-- These indexes are critical for call history, cleanup, and stats queries

-- ============================================================================
-- CALLS TABLE COMPOSITE INDEXES
-- ============================================================================

-- ✅ Composite index for getCallHistory() query
-- Covers: caller_id + created_at ordering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_calls_caller_created 
ON calls(caller_id, created_at DESC);

-- ✅ Composite index for getCallHistory() with status filter
-- Covers: caller_id + status + created_at ordering
CREATE INDEX IF NOT EXISTS idx_calls_caller_status_created 
ON calls(caller_id, status, created_at DESC);

-- ✅ Composite index for getCallHistory() with call_type filter
-- Covers: caller_id + call_type + created_at ordering
CREATE INDEX IF NOT EXISTS idx_calls_caller_type_created 
ON calls(caller_id, call_type, created_at DESC);

-- ✅ Composite index for cleanupStalePendingCalls() query
-- Covers: caller_id + status + created_at + end_time filter
CREATE INDEX IF NOT EXISTS idx_calls_caller_status_created_end 
ON calls(caller_id, status, created_at, end_time)
WHERE status = 'pending' AND end_time IS NULL;

-- ✅ Composite index for getCallStats() query
-- Covers: caller_id + status (for status-based counts)
-- Note: idx_calls_caller_status already exists in add_profile_indexes.sql
-- This ensures it exists for all status values, not just 'completed'
CREATE INDEX IF NOT EXISTS idx_calls_caller_status_all 
ON calls(caller_id, status);

-- ✅ Index for professional_id + created_at (for professional call history)
CREATE INDEX IF NOT EXISTS idx_calls_professional_created 
ON calls(professional_id, created_at DESC);

-- Note: The following indexes may already exist from schema migration:
-- - idx_calls_caller_id
-- - idx_calls_professional_id
-- - idx_calls_status
-- - idx_calls_created_at
-- - idx_calls_start_time
-- But these composite indexes optimize the specific query patterns used in CallsService

