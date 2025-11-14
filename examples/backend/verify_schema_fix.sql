-- Verification Script for Schema Fix (Oct 27, 2025)
-- Run this against your database to verify all required columns exist

\echo '========================================='
\echo 'Database Schema Fix Verification'
\echo '========================================='
\echo ''

-- Check Users Table Columns
\echo '1. Checking USERS table columns...'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'is_admin_agent'
    ) THEN '✓ is_admin_agent column exists'
    ELSE '✗ ERROR: is_admin_agent column missing!'
  END as check_1;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'agent_status'
    ) THEN '✓ agent_status column exists'
    ELSE '✗ ERROR: agent_status column missing!'
  END as check_2;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'deleted_at'
    ) THEN '✓ deleted_at column exists'
    ELSE '✗ ERROR: deleted_at column missing!'
  END as check_3;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'suspension_reason'
    ) THEN '✓ suspension_reason column exists'
    ELSE '✗ ERROR: suspension_reason column missing!'
  END as check_4;

\echo ''
\echo '2. Checking BANDS table columns...'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bands' 
      AND column_name = 'admin_email'
    ) THEN '✓ admin_email column exists'
    ELSE '✗ ERROR: admin_email column missing!'
  END as check_5;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bands' 
      AND column_name = 'band_email'
    ) THEN '✓ band_email column exists'
    ELSE '✗ ERROR: band_email column missing!'
  END as check_6;

\echo ''
\echo '3. Checking TOUR_DATES table columns...'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tour_dates' 
      AND column_name = 'booking_agent_id'
    ) THEN '✓ booking_agent_id column exists'
    ELSE '✗ ERROR: booking_agent_id column missing!'
  END as check_7;

\echo ''
\echo '4. Checking BAND_MEMBERS table columns...'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'band_members' 
      AND column_name = 'permissions'
    ) THEN '✓ permissions column exists'
    ELSE '✗ ERROR: permissions column missing!'
  END as check_8;

\echo ''
\echo '5. Checking Indexes...'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_users_is_admin_agent'
    ) THEN '✓ idx_users_is_admin_agent index exists'
    ELSE '⚠ WARNING: idx_users_is_admin_agent index missing (not critical)'
  END as check_9;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_users_agent_status'
    ) THEN '✓ idx_users_agent_status index exists'
    ELSE '⚠ WARNING: idx_users_agent_status index missing (not critical)'
  END as check_10;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_tour_dates_booking_agent_id'
    ) THEN '✓ idx_tour_dates_booking_agent_id index exists'
    ELSE '⚠ WARNING: idx_tour_dates_booking_agent_id index missing (not critical)'
  END as check_11;

\echo ''
\echo '========================================='
\echo 'Verification Complete!'
\echo '========================================='
\echo ''
\echo 'If all checks show ✓, the schema fix is properly applied.'
\echo 'If any show ✗ ERROR, run: cd backend && npm run db:init'
\echo ''

