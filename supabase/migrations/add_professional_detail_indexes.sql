-- ============================================================================
-- MIGRATION: Add Indexes for Professional Detail Queries
-- ============================================================================
-- Version: 1.3.0
-- Created: 2025-12-29
-- Description: Adds indexes for professional_educations, professional_experiences,
--              professional_categories, and availabilities tables to optimize
--              getProfessional() queries
-- ============================================================================

-- Index for professional_educations (used in getProfessional)
CREATE INDEX IF NOT EXISTS idx_professional_educations_professional_id
ON professional_educations(professional_id);

-- Composite index for professional_educations ordering
CREATE INDEX IF NOT EXISTS idx_professional_educations_ordering
ON professional_educations(professional_id, sort_order ASC, end_year DESC NULLS LAST, start_year DESC);

-- Index for professional_experiences (used in getProfessional)
CREATE INDEX IF NOT EXISTS idx_professional_experiences_professional_id
ON professional_experiences(professional_id);

-- Composite index for professional_experiences ordering
CREATE INDEX IF NOT EXISTS idx_professional_experiences_ordering
ON professional_experiences(professional_id, sort_order ASC, end_date DESC NULLS LAST, start_date DESC);

-- Index for professional_categories (used in getProfessional)
CREATE INDEX IF NOT EXISTS idx_professional_categories_professional_id
ON professional_categories(professional_id);

-- Index for availabilities (used in getProfessional)
CREATE INDEX IF NOT EXISTS idx_availabilities_professional_id
ON availabilities(professional_id);

-- Composite index for availabilities ordering
CREATE INDEX IF NOT EXISTS idx_availabilities_professional_created
ON availabilities(professional_id, created_at ASC);

