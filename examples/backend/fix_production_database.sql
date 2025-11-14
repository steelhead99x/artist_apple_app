-- Comprehensive Production Database Fix
-- This script fixes both issues:
-- 1. Missing booking agent tables (user_billing_adjustments, user_features, user_states, booking_manager_assignments)
-- 2. Renames 'bars' table to 'venues' to match the updated code
--
-- SAFE TO RUN: Uses IF EXISTS/IF NOT EXISTS for idempotency
-- Can be run multiple times without issues

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ============================================================================
-- PART 1: Create Missing Booking Agent Tables
-- ============================================================================

-- Add custom billing adjustments for users
CREATE TABLE IF NOT EXISTS user_billing_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    adjusted_by UUID NOT NULL REFERENCES users(id),
    original_amount DECIMAL(10, 2) NOT NULL,
    adjusted_amount DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2),
    reason TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user features table
CREATE TABLE IF NOT EXISTS user_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_type VARCHAR(100) NOT NULL,
    feature_value JSONB,
    assigned_by UUID NOT NULL REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_features_user_id_feature_type_key'
    ) THEN
        ALTER TABLE user_features ADD CONSTRAINT user_features_user_id_feature_type_key UNIQUE(user_id, feature_type);
    END IF;
END $$;

-- Add user states table
CREATE TABLE IF NOT EXISTS user_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state_type VARCHAR(50) NOT NULL CHECK(state_type IN ('subscription', 'access_level', 'special_permission', 'custom')),
    state_value VARCHAR(255) NOT NULL,
    assigned_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add booking manager assignments table
CREATE TABLE IF NOT EXISTS booking_manager_assignments (
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Only add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'booking_manager_assignments_manager_id_user_id_key'
    ) THEN
        ALTER TABLE booking_manager_assignments ADD CONSTRAINT booking_manager_assignments_manager_id_user_id_key UNIQUE(manager_id, user_id);
    END IF;
END $$;

-- Create indexes for booking agent tables
CREATE INDEX IF NOT EXISTS idx_user_billing_adjustments_user_id ON user_billing_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_adjustments_active ON user_billing_adjustments(active);
CREATE INDEX IF NOT EXISTS idx_user_features_user_id ON user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_user_features_active ON user_features(active);
CREATE INDEX IF NOT EXISTS idx_user_states_user_id ON user_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_states_active ON user_states(active);
CREATE INDEX IF NOT EXISTS idx_booking_manager_assignments_manager_id ON booking_manager_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_booking_manager_assignments_user_id ON booking_manager_assignments(user_id);

-- ============================================================================
-- PART 2: Rename 'bars' to 'venues'
-- ============================================================================

-- Check if bars table exists and venues doesn't, then rename
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bars')
       AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'venues') THEN
        
        -- Rename the main table
        ALTER TABLE bars RENAME TO venues;
        
        -- Rename indexes
        ALTER INDEX IF EXISTS bars_pkey RENAME TO venues_pkey;
        ALTER INDEX IF EXISTS idx_bars_user_id RENAME TO idx_venues_user_id;
        ALTER INDEX IF EXISTS idx_bars_city RENAME TO idx_venues_city;
        ALTER INDEX IF EXISTS idx_bars_state RENAME TO idx_venues_state;
        ALTER INDEX IF EXISTS idx_bars_city_state RENAME TO idx_venues_city_state;
        
        RAISE NOTICE 'Table "bars" renamed to "venues"';
    ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'venues') THEN
        RAISE NOTICE 'Table "venues" already exists - skipping rename';
    ELSE
        RAISE NOTICE 'Neither "bars" nor "venues" table exists - will be created by schema';
    END IF;
END $$;

-- Rename foreign key columns in tour_dates if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tour_dates' AND column_name = 'bar_id'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tour_dates' AND column_name = 'venue_id'
    ) THEN
        -- Rename the column
        ALTER TABLE tour_dates RENAME COLUMN bar_id TO venue_id;
        
        -- Drop old constraint
        ALTER TABLE tour_dates DROP CONSTRAINT IF EXISTS tour_dates_bar_id_fkey;
        
        -- Add new constraint
        ALTER TABLE tour_dates 
          ADD CONSTRAINT tour_dates_venue_id_fkey 
          FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;
        
        -- Update indexes
        DROP INDEX IF EXISTS idx_tour_dates_bar_id;
        CREATE INDEX IF NOT EXISTS idx_tour_dates_venue_id ON tour_dates(venue_id);
        
        RAISE NOTICE 'Column "bar_id" renamed to "venue_id" in tour_dates';
    ELSIF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tour_dates' AND column_name = 'venue_id'
    ) THEN
        RAISE NOTICE 'Column "venue_id" already exists in tour_dates - skipping rename';
    END IF;
END $$;

-- Recreate views that reference venues (drop and recreate)
DROP VIEW IF EXISTS tour_payment_details;
CREATE OR REPLACE VIEW tour_payment_details AS
SELECT 
    tp.*,
    td.date as tour_date,
    td.band_id,
    td.payment_currency,
    b.band_name,
    td.venue_id,
    v.venue_name,
    COALESCE(
        json_agg(
            json_build_object(
                'id', tmp.id,
                'user_id', tmp.user_id,
                'member_name', tmp.band_member_name,
                'payout_amount', tmp.payout_amount,
                'payout_status', tmp.payout_status,
                'payment_method', tmp.payment_method,
                'transaction_hash', tmp.transaction_hash
            ) ORDER BY tmp.band_member_name
        ) FILTER (WHERE tmp.id IS NOT NULL),
        '[]'::json
    ) as member_payouts,
    COALESCE(SUM(tmp.payout_amount), 0) as allocated_amount,
    ou.name as override_by_name,
    ou.email as override_by_email
FROM tour_payments tp
JOIN tour_dates td ON tp.tour_date_id = td.id
JOIN bands b ON td.band_id = b.id
JOIN venues v ON td.venue_id = v.id
LEFT JOIN tour_member_payouts tmp ON tp.id = tmp.tour_payment_id
LEFT JOIN users ou ON tp.override_by = ou.id
GROUP BY tp.id, td.date, td.band_id, td.payment_currency, b.band_name, td.venue_id, v.venue_name, ou.name, ou.email;

-- Update table comments
COMMENT ON TABLE venues IS 'Venues (bars, clubs, concert halls) that host performances';

-- ============================================================================
-- PART 3: Verification
-- ============================================================================

-- Verify booking agent tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_billing_adjustments') THEN
        missing_tables := array_append(missing_tables, 'user_billing_adjustments');
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_features') THEN
        missing_tables := array_append(missing_tables, 'user_features');
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_states') THEN
        missing_tables := array_append(missing_tables, 'user_states');
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_manager_assignments') THEN
        missing_tables := array_append(missing_tables, 'booking_manager_assignments');
    END IF;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All booking agent tables verified';
    END IF;
END $$;

-- Verify venues table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'venues') THEN
        RAISE EXCEPTION 'venues table does not exist!';
    ELSE
        RAISE NOTICE '✅ venues table verified';
    END IF;
END $$;

COMMIT;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ Production Database Fix Completed Successfully! ✅✅✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '  1. Created missing booking agent tables';
  RAISE NOTICE '  2. Renamed "bars" to "venues" (if needed)';
  RAISE NOTICE '  3. Updated all foreign keys and indexes';
  RAISE NOTICE '  4. Recreated views with correct table names';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Restart your backend server';
  RAISE NOTICE '  2. Test booking agent login';
  RAISE NOTICE '  3. Verify users are visible';
  RAISE NOTICE '';
END $$;

