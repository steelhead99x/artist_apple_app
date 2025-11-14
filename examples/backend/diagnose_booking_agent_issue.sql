-- Diagnostic Script for Booking Agent User Visibility Issue
-- Run this to check what's missing in your production database

-- Check if required tables exist
SELECT 
    'user_billing_adjustments' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_billing_adjustments'
    ) as exists;

SELECT 
    'user_features' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_features'
    ) as exists;

SELECT 
    'user_states' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_states'
    ) as exists;

SELECT 
    'booking_manager_assignments' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'booking_manager_assignments'
    ) as exists;

-- Check if jackd99x@gmail.com exists and what their role is
SELECT 
    id, 
    email, 
    user_type, 
    is_admin_agent, 
    agent_status,
    status,
    deleted_at
FROM users 
WHERE email = 'jackd99x@gmail.com';

-- Check all booking agents
SELECT 
    id,
    email,
    name,
    user_type,
    is_admin_agent,
    agent_status,
    status,
    deleted_at
FROM users
WHERE user_type IN ('booking_agent', 'booking_manager')
ORDER BY is_admin_agent DESC, email;

-- Count all users by type (excluding deleted)
SELECT 
    user_type,
    COUNT(*) as count,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_count
FROM users
GROUP BY user_type
ORDER BY count DESC;

