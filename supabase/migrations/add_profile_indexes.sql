-- Add missing indexes for profile and user service queries to improve performance
-- These indexes are critical for profile, invoice, and transaction queries

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- ✅ Composite index for getProfileData() and getCurrentUser() queries
-- Covers: auth_id + deleted_at filter (most common query pattern)
-- Note: idx_users_auth_id_deleted may already exist, but this ensures it
CREATE INDEX IF NOT EXISTS idx_users_auth_id_deleted_at 
ON users(auth_id, deleted_at)
WHERE deleted_at IS NULL;

-- ============================================================================
-- INVOICES TABLE INDEXES
-- ============================================================================

-- ✅ Index for caller_id (used in getInvoices() with role='caller')
CREATE INDEX IF NOT EXISTS idx_invoices_caller_id 
ON invoices(caller_id);

-- ✅ Index for professional_id (used in getInvoices() with role='professional')
CREATE INDEX IF NOT EXISTS idx_invoices_professional_id 
ON invoices(professional_id);

-- ✅ Composite index for getInvoices() query with ordering
-- Covers: caller_id/professional_id + invoice_date ordering
CREATE INDEX IF NOT EXISTS idx_invoices_caller_date 
ON invoices(caller_id, invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_professional_date 
ON invoices(professional_id, invoice_date DESC);

-- ✅ Index for invoice_date (used in ordering)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date 
ON invoices(invoice_date DESC);

-- ============================================================================
-- TRANSACTIONS TABLE INDEXES
-- ============================================================================

-- ✅ Composite index for getTransactions() query
-- Covers: user_id + created_at ordering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_transactions_user_created 
ON transactions(user_id, created_at DESC);

-- ✅ Composite index for getMonthlyTransactions() query
-- Covers: user_id + created_at ordering
-- Note: Date range filter is applied in query, not in index predicate
-- (date_trunc is not IMMUTABLE, so can't be used in index predicate)
CREATE INDEX IF NOT EXISTS idx_transactions_user_created 
ON transactions(user_id, created_at DESC);

-- ============================================================================
-- CALLS TABLE INDEXES (for getUserStats)
-- ============================================================================

-- ✅ Composite index for getUserStats() query
-- Covers: caller_id + status filter (for completed calls aggregation)
CREATE INDEX IF NOT EXISTS idx_calls_caller_status 
ON calls(caller_id, status)
WHERE status = 'completed';

-- Note: The following indexes may already exist from schema migration:
-- - Foreign key indexes are usually auto-created
-- But these composite indexes optimize the specific query patterns used in UserService and ProfileService

