-- Migration: Rename "bar" to "venue" throughout database
-- This updates tables, columns, and related structures to use "venue" terminology

-- IMPORTANT: Run this during a maintenance window
-- IMPORTANT: Backup your database first!

BEGIN;

-- Step 1: Rename the main table from 'bars' to 'venues'
ALTER TABLE IF EXISTS bars RENAME TO venues;

-- Step 2: Rename indexes
ALTER INDEX IF EXISTS bars_pkey RENAME TO venues_pkey;
ALTER INDEX IF EXISTS idx_bars_user_id RENAME TO idx_venues_user_id;
ALTER INDEX IF EXISTS idx_bars_city RENAME TO idx_venues_city;
ALTER INDEX IF EXISTS idx_bars_state RENAME TO idx_venues_state;

-- Step 3: Rename foreign key columns in other tables
ALTER TABLE tour_dates RENAME COLUMN bar_id TO venue_id;

-- Step 4: Rename constraints
ALTER TABLE tour_dates DROP CONSTRAINT IF EXISTS tour_dates_bar_id_fkey;
ALTER TABLE tour_dates 
  ADD CONSTRAINT tour_dates_venue_id_fkey 
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;

-- Step 5: Update indexes on foreign keys
DROP INDEX IF EXISTS idx_tour_dates_bar_id;
CREATE INDEX idx_tour_dates_venue_id ON tour_dates(venue_id);

-- Step 6: Rename any view that references bars
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

-- Step 7: Update any stored procedures or functions that reference bars
-- (Add any custom procedures here)

-- Step 8: Update comments
COMMENT ON TABLE venues IS 'Venues (bars, clubs, concert halls) that host performances';
COMMENT ON COLUMN venues.venue_name IS 'Name of the venue';

COMMIT;

-- Verification queries (run these after migration)
-- SELECT * FROM venues LIMIT 5;
-- SELECT * FROM tour_dates LIMIT 5;
-- SELECT * FROM tour_payment_details LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Table "bars" renamed to "venues"';
  RAISE NOTICE 'Column "bar_id" renamed to "venue_id" in tour_dates';
  RAISE NOTICE 'All indexes and constraints updated';
  RAISE NOTICE 'Views recreated with new table names';
END $$;

