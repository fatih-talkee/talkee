-- ============================================================================
-- UPDATE FINANCE CATEGORY ICON
-- ============================================================================
-- Updates the Finance category icon_name to 'dollar-sign'
-- ============================================================================

UPDATE categories
SET icon_name = 'dollar-sign',
    updated_at = NOW()
WHERE slug = 'finance';

-- Verify the update
SELECT id, name, slug, icon_name, updated_at
FROM categories
WHERE slug = 'finance';

