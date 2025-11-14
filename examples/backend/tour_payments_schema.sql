-- Tour Payments and Payouts Schema
-- This manages payment distribution from venues to booking agents to band members

-- Main tour payments table (records the payment from venue to booking agent)
CREATE TABLE IF NOT EXISTS tour_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_date_id UUID NOT NULL REFERENCES tour_dates(id) ON DELETE CASCADE,
    venue_payment_amount DECIMAL(10, 2) NOT NULL,
    booking_agent_fee_percentage DECIMAL(5, 2) DEFAULT 0,
    booking_agent_fee_amount DECIMAL(10, 2) GENERATED ALWAYS AS (venue_payment_amount * booking_agent_fee_percentage / 100) STORED,
    other_fees_description TEXT,
    other_fees_amount DECIMAL(10, 2) DEFAULT 0,
    total_band_payout DECIMAL(10, 2) GENERATED ALWAYS AS (venue_payment_amount - (venue_payment_amount * booking_agent_fee_percentage / 100) - other_fees_amount) STORED,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'approved', 'paid', 'completed')),
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual band member payouts (breakdown of how band payment is distributed)
CREATE TABLE IF NOT EXISTS tour_member_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_payment_id UUID NOT NULL REFERENCES tour_payments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    band_member_name VARCHAR(255) NOT NULL,
    payout_amount DECIMAL(10, 2) NOT NULL,
    payout_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK(payout_status IN ('pending', 'approved', 'paid')),
    payment_method VARCHAR(50),
    transaction_hash VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tour_payment_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tour_payments_tour_date ON tour_payments(tour_date_id);
CREATE INDEX IF NOT EXISTS idx_tour_payments_status ON tour_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_tour_member_payouts_tour_payment ON tour_member_payouts(tour_payment_id);
CREATE INDEX IF NOT EXISTS idx_tour_member_payouts_user ON tour_member_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_member_payouts_status ON tour_member_payouts(payout_status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tour_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tour_payments_updated_at
    BEFORE UPDATE ON tour_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_tour_payments_updated_at();

CREATE TRIGGER tour_member_payouts_updated_at
    BEFORE UPDATE ON tour_member_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_tour_payments_updated_at();

-- View to get complete payment information for a tour
CREATE OR REPLACE VIEW tour_payment_details AS
SELECT 
    tp.*,
    td.date as tour_date,
    td.band_id,
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
    COALESCE(SUM(tmp.payout_amount), 0) as allocated_amount
FROM tour_payments tp
JOIN tour_dates td ON tp.tour_date_id = td.id
JOIN bands b ON td.band_id = b.id
JOIN venues bar ON td.venue_id = bar.id
LEFT JOIN tour_member_payouts tmp ON tp.id = tmp.tour_payment_id
GROUP BY tp.id, td.date, td.band_id, b.band_name, td.venue_id, bar.venue_name;

