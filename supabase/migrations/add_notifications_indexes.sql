-- Add missing composite indexes for notifications and user_devices tables to improve query performance
-- These indexes are critical for notification queries and device token lookups

-- ============================================================================
-- NOTIFICATIONS TABLE COMPOSITE INDEXES
-- ============================================================================

-- ✅ Composite index for getNotifications() query
-- Covers: user_id + created_at ordering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- ✅ Composite index for getUnreadCount() query
-- Covers: user_id + is_read filter (for unread count)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read)
WHERE is_read = false;

-- ✅ Composite index for markAllAsRead() query
-- Covers: user_id + is_read filter (for bulk update)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_update 
ON notifications(user_id, is_read)
WHERE is_read = false;

-- ✅ Composite index for getNotificationsByType() query (if exists)
-- Covers: user_id + type + created_at ordering
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created 
ON notifications(user_id, type, created_at DESC);

-- ============================================================================
-- USER_DEVICES TABLE COMPOSITE INDEXES
-- ============================================================================

-- ✅ Composite index for getUserDeviceTokens() query
-- Covers: user_id + is_active filter (for active token lookups)
CREATE INDEX IF NOT EXISTS idx_user_devices_user_active 
ON user_devices(user_id, is_active)
WHERE is_active = true;

-- ✅ Composite index for getUserDevices() query
-- Covers: user_id + updated_at ordering
CREATE INDEX IF NOT EXISTS idx_user_devices_user_updated 
ON user_devices(user_id, updated_at DESC);

-- ✅ Composite index for cleanupInactiveTokens() query
-- Covers: is_active + updated_at filter (for cleanup operations)
CREATE INDEX IF NOT EXISTS idx_user_devices_active_updated 
ON user_devices(is_active, updated_at)
WHERE is_active = false;

-- Note: The following indexes may already exist from schema migration:
-- - idx_notifications_user_id
-- - idx_notifications_is_read
-- - idx_notifications_created_at
-- - idx_user_devices_user_id
-- - idx_user_devices_push_token
-- - idx_user_devices_is_active
-- But these composite indexes optimize the specific query patterns used in NotificationsService

