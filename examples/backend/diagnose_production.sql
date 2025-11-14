-- Production Database Diagnostic Script
-- Run this to see exactly what's wrong without making changes

\echo ''
\echo '🔍 PRODUCTION DATABASE DIAGNOSTIC'
\echo '================================='
\echo ''

-- Check 1: Booking Agent Tables
\echo '1️⃣  Checking Booking Agent Tables...'
\echo '------------------------------------'

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_billing_adjustments')
        THEN '✅ user_billing_adjustments exists'
        ELSE '❌ user_billing_adjustments MISSING'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_features')
        THEN '✅ user_features exists'
        ELSE '❌ user_features MISSING'
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_states')
        THEN '✅ user_states exists'
        ELSE '❌ user_states MISSING'
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_manager_assignments')
        THEN '✅ booking_manager_assignments exists'
        ELSE '❌ booking_manager_assignments MISSING'
    END;

\echo ''
\echo '2️⃣  Checking Table Name (bars vs venues)...'
\echo '-------------------------------------------'

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'venues')
        THEN '✅ venues table exists (CORRECT)'
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bars')
        THEN '❌ Only bars table exists - needs rename to venues'
        ELSE '⚠️  Neither bars nor venues exists'
    END as status;

\echo ''
\echo '3️⃣  Checking Foreign Key Columns...'
\echo '------------------------------------'

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'tour_dates' AND column_name = 'venue_id'
        )
        THEN '✅ tour_dates.venue_id exists (CORRECT)'
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'tour_dates' AND column_name = 'bar_id'
        )
        THEN '❌ tour_dates.bar_id exists - needs rename to venue_id'
        ELSE '⚠️  tour_dates table may not exist'
    END as status;

\echo ''
\echo '4️⃣  Checking Booking Agent User...'
\echo '-----------------------------------'

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ jackd99x@gmail.com found'
        ELSE '❌ jackd99x@gmail.com NOT FOUND'
    END as status,
    MAX(user_type) as user_type,
    MAX(is_admin_agent::text) as is_admin_agent,
    MAX(agent_status) as agent_status,
    MAX(status) as status
FROM users 
WHERE email = 'jackd99x@gmail.com';

\echo ''
\echo '5️⃣  Counting All Users by Type...'
\echo '----------------------------------'

SELECT 
    user_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted
FROM users
GROUP BY user_type
ORDER BY total DESC;

\echo ''
\echo '6️⃣  Checking All Booking Agents...'
\echo '-----------------------------------'

SELECT 
    email,
    name,
    user_type,
    is_admin_agent,
    agent_status,
    status,
    created_at::date
FROM users
WHERE user_type IN ('booking_agent', 'booking_manager')
ORDER BY is_admin_agent DESC NULLS LAST, email;

\echo ''
\echo '📊 DIAGNOSTIC SUMMARY'
\echo '===================='
\echo ''
\echo 'Based on the results above:'
\echo ''
\echo 'If you see ❌ symbols, run the fix:'
\echo '  cd backend && ./apply_production_fix.sh'
\echo ''
\echo 'If everything shows ✅, your database is good!'
\echo ''

