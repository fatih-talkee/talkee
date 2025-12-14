-- ============================================================================
-- INSERT TEST CALL HISTORY DATA
-- ============================================================================
-- This script helps you add test call history data for yourself
-- 
-- STEP 1: First, find your user_id by running:
-- SELECT id, name, primary_email FROM users WHERE auth_id = auth.uid();
--
-- STEP 2: Replace YOUR_USER_ID below with your actual user_id
-- STEP 3: Replace PROFESSIONAL_ID with a valid professional ID from your database
-- STEP 4: Run this script

-- ============================================================================
-- STEP 1: Get your user ID (run this first to find your ID)
-- ============================================================================
SELECT 
    id as user_id,
    name,
    primary_email,
    auth_id
FROM users
WHERE auth_id = auth.uid();

-- ============================================================================
-- STEP 2: Get available professionals (to use their IDs)
-- ============================================================================
SELECT 
    p.id as professional_id,
    p.title,
    p.rate_per_minute,
    u.name as professional_name
FROM professionals p
JOIN users u ON p.user_id = u.id
WHERE p.is_active = true
LIMIT 10;

-- ============================================================================
-- STEP 3: Insert test call history (replace YOUR_USER_ID and PROFESSIONAL_ID)
-- ============================================================================

-- Example: Insert a completed call from 2 days ago
INSERT INTO calls (
    caller_id,
    professional_id,
    status,
    call_type,
    start_time,
    end_time,
    duration_minutes,
    rate_per_minute,
    total_cost,
    rating,
    notes
) VALUES (
    'YOUR_USER_ID',  -- Replace with your user_id from STEP 1
    'PROFESSIONAL_ID',  -- Replace with a professional_id from STEP 2
    'completed',
    'voice',
    NOW() - INTERVAL '2 days' - INTERVAL '30 minutes',  -- Start time: 2 days ago, 30 min ago
    NOW() - INTERVAL '2 days',  -- End time: 2 days ago
    30,  -- Duration: 30 minutes
    5.00,  -- Rate: $5 per minute
    150.00,  -- Total cost: $150
    5,  -- Rating: 5 stars
    'Great consultation! Very helpful.'
);

-- Example: Insert another completed call from 1 week ago
INSERT INTO calls (
    caller_id,
    professional_id,
    status,
    call_type,
    start_time,
    end_time,
    duration_minutes,
    rate_per_minute,
    total_cost,
    rating,
    notes
) VALUES (
    'YOUR_USER_ID',  -- Replace with your user_id
    'PROFESSIONAL_ID',  -- Replace with a professional_id
    'completed',
    'video',
    NOW() - INTERVAL '7 days' - INTERVAL '45 minutes',
    NOW() - INTERVAL '7 days',
    45,  -- Duration: 45 minutes
    6.00,  -- Rate: $6 per minute
    270.00,  -- Total cost: $270
    4,  -- Rating: 4 stars
    'Good session, learned a lot.'
);

-- Example: Insert a cancelled call from 3 days ago
INSERT INTO calls (
    caller_id,
    professional_id,
    status,
    call_type,
    start_time,
    cancelled_by,
    rate_per_minute,
    notes
) VALUES (
    'YOUR_USER_ID',  -- Replace with your user_id
    'PROFESSIONAL_ID',  -- Replace with a professional_id
    'cancelled',
    'voice',
    NOW() - INTERVAL '3 days',
    'YOUR_USER_ID',  -- You cancelled it
    5.00,
    'Had to cancel due to emergency'
);

-- Example: Insert a missed call from 5 days ago
INSERT INTO calls (
    caller_id,
    professional_id,
    status,
    call_type,
    start_time,
    rate_per_minute,
    notes
) VALUES (
    'YOUR_USER_ID',  -- Replace with your user_id
    'PROFESSIONAL_ID',  -- Replace with a professional_id
    'missed',
    'voice',
    NOW() - INTERVAL '5 days',
    5.00,
    'Missed call - no answer'
);

-- ============================================================================
-- STEP 4: Verify your call history was inserted
-- ============================================================================
SELECT 
    c.id,
    c.status,
    c.call_type,
    c.start_time,
    c.duration_minutes,
    c.total_cost,
    c.rating,
    p.title as professional_title,
    u.name as professional_name
FROM calls c
JOIN professionals p ON c.professional_id = p.id
JOIN users u ON p.user_id = u.id
WHERE c.caller_id = 'YOUR_USER_ID'  -- Replace with your user_id
ORDER BY c.start_time DESC;










