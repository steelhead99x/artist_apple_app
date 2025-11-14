-- Comprehensive fix for venues table
-- Handles three scenarios:
-- 1. If venues exists: do nothing (script will exit early)
-- 2. If bars exists but venues doesn't: rename bars to venues
-- 3. If neither exists: create venues table fresh

BEGIN;

-- Step 1: If bars table exists, rename it to venues
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bars') THEN
        -- Rename the main table from 'bars' to 'venues'
        EXECUTE 'ALTER TABLE bars RENAME TO venues';
        
        -- Rename indexes (use IF EXISTS to avoid errors)
        PERFORM 1 FROM pg_indexes WHERE indexname = 'bars_pkey';
        IF FOUND THEN
            EXECUTE 'ALTER INDEX bars_pkey RENAME TO venues_pkey';
        END IF;
        
        PERFORM 1 FROM pg_indexes WHERE indexname = 'idx_bars_user_id';
        IF FOUND THEN
            EXECUTE 'ALTER INDEX idx_bars_user_id RENAME TO idx_venues_user_id';
        END IF;
        
        PERFORM 1 FROM pg_indexes WHERE indexname = 'idx_bars_city';
        IF FOUND THEN
            EXECUTE 'ALTER INDEX idx_bars_city RENAME TO idx_venues_city';
        END IF;
        
        PERFORM 1 FROM pg_indexes WHERE indexname = 'idx_bars_state';
        IF FOUND THEN
            EXECUTE 'ALTER INDEX idx_bars_state RENAME TO idx_venues_state';
        END IF;
    END IF;
END $$;

-- Step 2: Rename foreign key columns in other tables (if bar_id exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tour_dates' AND column_name = 'bar_id') THEN
        EXECUTE 'ALTER TABLE tour_dates RENAME COLUMN bar_id TO venue_id';
    END IF;
END $$;

-- Step 3: Update constraints
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'tour_dates_bar_id_fkey') THEN
        EXECUTE 'ALTER TABLE tour_dates DROP CONSTRAINT tour_dates_bar_id_fkey';
    END IF;
END $$;

-- Ensure foreign key constraint exists (only if venues table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'venues') THEN
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'tour_dates_venue_id_fkey'
        ) THEN
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tour_dates' AND column_name = 'venue_id') THEN
                EXECUTE 'ALTER TABLE tour_dates ADD CONSTRAINT tour_dates_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE';
            END IF;
        END IF;
    END IF;
END $$;

-- Step 4: Update indexes on foreign keys
DROP INDEX IF EXISTS idx_tour_dates_bar_id;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_tour_dates_venue_id') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tour_dates' AND column_name = 'venue_id') THEN
            EXECUTE 'CREATE INDEX idx_tour_dates_venue_id ON tour_dates(venue_id)';
        END IF;
    END IF;
END $$;

-- Step 5: If venues table doesn't exist yet, create it
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    capacity INTEGER,
    eth_wallet VARCHAR(255),
    description TEXT,
    amenities JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_venues_user_id ON venues(user_id);
CREATE INDEX IF NOT EXISTS idx_venues_city_state ON venues(city, state);

-- Step 6: Recreate view that references venues (only if dependencies exist)
DO $$
BEGIN
    -- Only create the view if all required tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tour_payments')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tour_dates')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bands')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'venues') THEN
        
        EXECUTE 'DROP VIEW IF EXISTS tour_payment_details';
        
        EXECUTE '
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
                        ''id'', tmp.id,
                        ''user_id'', tmp.user_id,
                        ''member_name'', tmp.band_member_name,
                        ''payout_amount'', tmp.payout_amount,
                        ''payout_status'', tmp.payout_status,
                        ''payment_method'', tmp.payment_method,
                        ''transaction_hash'', tmp.transaction_hash
                    ) ORDER BY tmp.band_member_name
                ) FILTER (WHERE tmp.id IS NOT NULL),
                ''[]''::json
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
        GROUP BY tp.id, td.date, td.band_id, td.payment_currency, b.band_name, td.venue_id, v.venue_name, ou.name, ou.email';
    END IF;
END $$;

COMMIT;

-- Verification
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'venues') THEN
        RAISE NOTICE '✅ Migration completed successfully! venues table now exists.';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: venues table still does not exist';
    END IF;
END $$;

