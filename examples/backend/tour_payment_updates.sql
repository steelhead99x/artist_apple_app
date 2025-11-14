-- Tour Payment System Updates
-- Adds currency support and updates payment status flow

-- Add currency fields to tour_dates
ALTER TABLE tour_dates 
ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(10) DEFAULT 'USD' CHECK(payment_currency IN ('USD', 'USDC'));

-- Update payment status values to match new flow
-- pending = money due by venue (not yet paid to booking manager)
-- booked = held by booking manager (not released to band)
-- completed = released to band members
ALTER TABLE tour_payments 
DROP CONSTRAINT IF EXISTS tour_payments_payment_status_check;

ALTER TABLE tour_payments
ADD CONSTRAINT tour_payments_payment_status_check 
CHECK(payment_status IN ('pending', 'booked', 'completed'));

-- Add override tracking
ALTER TABLE tour_payments
ADD COLUMN IF NOT EXISTS early_release_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS override_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS override_at TIMESTAMP WITH TIME ZONE;

-- Add currency to tour_payments
ALTER TABLE tour_payments
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD' CHECK(currency IN ('USD', 'USDC'));

-- Create tour reviews table (separate from existing reviews which are user-to-user)
CREATE TABLE IF NOT EXISTS tour_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_date_id UUID NOT NULL REFERENCES tour_dates(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_type VARCHAR(20) NOT NULL CHECK(reviewer_type IN ('band', 'venue')),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    review_text TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    review_decision_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tour_date_id, reviewer_id, reviewer_type)
);

-- Create index for tour reviews
CREATE INDEX IF NOT EXISTS idx_tour_reviews_tour_date ON tour_reviews(tour_date_id);
CREATE INDEX IF NOT EXISTS idx_tour_reviews_status ON tour_reviews(status);
CREATE INDEX IF NOT EXISTS idx_tour_reviews_reviewer ON tour_reviews(reviewer_id);

-- Add comments for clarity
COMMENT ON COLUMN tour_payments.payment_status IS 'pending=venue owes money, booked=booking manager holds money, completed=released to band';
COMMENT ON COLUMN tour_payments.early_release_override IS 'True if booking manager manually released payment before show completion';
COMMENT ON COLUMN tour_dates.payment_currency IS 'Currency for this tour payment (USD or USDC)';

-- Update the view to include new fields
DROP VIEW IF EXISTS tour_payment_details;

CREATE OR REPLACE VIEW tour_payment_details AS
SELECT 
    tp.*,
    td.date as tour_date,
    td.band_id,
    td.payment_currency,
    b.band_name,
    td.venue_id,
    bar.venue_name,
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
    -- Override information
    ou.name as override_by_name,
    ou.email as override_by_email
FROM tour_payments tp
JOIN tour_dates td ON tp.tour_date_id = td.id
JOIN bands b ON td.band_id = b.id
JOIN venues bar ON td.venue_id = bar.id
LEFT JOIN tour_member_payouts tmp ON tp.id = tmp.tour_payment_id
LEFT JOIN users ou ON tp.override_by = ou.id
GROUP BY tp.id, td.date, td.band_id, td.payment_currency, b.band_name, td.venue_id, bar.venue_name, ou.name, ou.email;

-- Add audit log for payment status changes
CREATE TABLE IF NOT EXISTS payment_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_payment_id UUID NOT NULL REFERENCES tour_payments(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_status_history_payment ON payment_status_history(tour_payment_id);

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
        INSERT INTO payment_status_history (
            tour_payment_id,
            old_status,
            new_status,
            changed_by,
            reason
        ) VALUES (
            NEW.id,
            OLD.payment_status,
            NEW.payment_status,
            NEW.override_by, -- Will be set when status changes
            CASE 
                WHEN NEW.early_release_override AND NEW.payment_status = 'completed' 
                THEN 'Early release override: ' || COALESCE(NEW.override_reason, 'No reason provided')
                ELSE 'Status changed to ' || NEW.payment_status
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_status_change_trigger
    AFTER UPDATE ON tour_payments
    FOR EACH ROW
    WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
    EXECUTE FUNCTION log_payment_status_change();

COMMENT ON TABLE tour_reviews IS 'Reviews left by bands and venues for specific tour dates, requiring booking manager approval';
COMMENT ON TABLE payment_status_history IS 'Audit log of payment status changes for transparency';

