-- Venue Payment Tracking System
-- Tracks payments from venues to booking agent for tours

-- Add venue payment tracking fields to tour_dates
ALTER TABLE tour_dates
ADD COLUMN IF NOT EXISTS venue_payment_status VARCHAR(20) DEFAULT 'pending' 
    CHECK(venue_payment_status IN ('pending', 'cod_requested', 'paid', 'overdue')),
ADD COLUMN IF NOT EXISTS venue_payment_date DATE,
ADD COLUMN IF NOT EXISTS venue_payment_method VARCHAR(20) DEFAULT 'cod',
ADD COLUMN IF NOT EXISTS venue_payment_notes TEXT,
ADD COLUMN IF NOT EXISTS venue_payment_received_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS venue_payment_received_at TIMESTAMP WITH TIME ZONE;

-- Venue payment ledger (detailed transaction history)
CREATE TABLE IF NOT EXISTS venue_payment_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_date_id UUID NOT NULL REFERENCES tour_dates(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    booking_agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment details
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'cod' CHECK(payment_method IN ('cod', 'cash', 'check', 'bank_transfer', 'crypto')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    
    -- Dates
    due_date DATE,
    payment_date DATE,
    
    -- Notes and tracking
    venue_notes TEXT,
    booking_agent_notes TEXT,
    reference_number VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions (each payment made against a ledger entry)
CREATE TABLE IF NOT EXISTS venue_payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID NOT NULL REFERENCES venue_payment_ledger(id) ON DELETE CASCADE,
    
    -- Transaction details
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'payment' CHECK(transaction_type IN ('payment', 'refund', 'adjustment')),
    
    -- Who recorded it
    recorded_by UUID NOT NULL REFERENCES users(id),
    
    -- Notes
    notes TEXT,
    reference_number VARCHAR(100),
    
    -- Timestamp
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_venue_payment_ledger_tour ON venue_payment_ledger(tour_date_id);
CREATE INDEX IF NOT EXISTS idx_venue_payment_ledger_venue ON venue_payment_ledger(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_payment_ledger_agent ON venue_payment_ledger(booking_agent_id);
CREATE INDEX IF NOT EXISTS idx_venue_payment_ledger_status ON venue_payment_ledger(payment_status);
CREATE INDEX IF NOT EXISTS idx_venue_payment_transactions_ledger ON venue_payment_transactions(ledger_id);

-- Trigger to update ledger updated_at
CREATE OR REPLACE FUNCTION update_venue_ledger_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_payment_ledger_updated_at
    BEFORE UPDATE ON venue_payment_ledger
    FOR EACH ROW
    EXECUTE FUNCTION update_venue_ledger_timestamp();

-- Trigger to automatically create ledger entry when tour is confirmed
CREATE OR REPLACE FUNCTION create_venue_payment_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create ledger if tour has payment amount and status changed to confirmed/completed
    IF NEW.payment_amount IS NOT NULL 
       AND NEW.payment_amount > 0 
       AND (NEW.status = 'confirmed' OR NEW.status = 'completed')
       AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        
        -- Check if ledger entry doesn't already exist
        IF NOT EXISTS (SELECT 1 FROM venue_payment_ledger WHERE tour_date_id = NEW.id) THEN
            INSERT INTO venue_payment_ledger (
                tour_date_id,
                venue_id,
                booking_agent_id,
                amount_due,
                due_date,
                payment_status
            ) SELECT
                NEW.id,
                NEW.venue_id,
                (SELECT id FROM users WHERE user_type = 'booking_agent' LIMIT 1), -- Get booking agent
                NEW.payment_amount,
                NEW.date + INTERVAL '7 days', -- Due 7 days after show
                'pending';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tour_create_payment_ledger
    AFTER INSERT OR UPDATE ON tour_dates
    FOR EACH ROW
    EXECUTE FUNCTION create_venue_payment_ledger();

-- View for venue outstanding balances
CREATE OR REPLACE VIEW venue_outstanding_balances AS
SELECT 
    v.id as venue_id,
    v.venue_name,
    v.user_id as venue_owner_id,
    COUNT(vpl.id) as total_invoices,
    COUNT(CASE WHEN vpl.payment_status = 'pending' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN vpl.payment_status = 'overdue' THEN 1 END) as overdue_invoices,
    COALESCE(SUM(vpl.amount_due), 0) as total_amount_due,
    COALESCE(SUM(vpl.amount_paid), 0) as total_amount_paid,
    COALESCE(SUM(vpl.amount_due - vpl.amount_paid), 0) as outstanding_balance
FROM venues v
LEFT JOIN venue_payment_ledger vpl ON v.id = vpl.venue_id
GROUP BY v.id, v.venue_name, v.user_id;

-- View for booking agent receivables
CREATE OR REPLACE VIEW booking_agent_receivables AS
SELECT 
    ba.id as booking_agent_id,
    ba.name as booking_agent_name,
    COUNT(vpl.id) as total_invoices,
    COUNT(CASE WHEN vpl.payment_status = 'pending' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN vpl.payment_status = 'overdue' THEN 1 END) as overdue_invoices,
    COALESCE(SUM(vpl.amount_due), 0) as total_amount_due,
    COALESCE(SUM(vpl.amount_paid), 0) as total_amount_received,
    COALESCE(SUM(vpl.amount_due - vpl.amount_paid), 0) as outstanding_receivables
FROM users ba
LEFT JOIN venue_payment_ledger vpl ON ba.id = vpl.booking_agent_id
WHERE ba.user_type = 'booking_agent'
GROUP BY ba.id, ba.name;

-- View for detailed ledger with tour info
CREATE OR REPLACE VIEW venue_payment_ledger_details AS
SELECT 
    vpl.*,
    td.date as tour_date,
    td.start_time,
    td.status as tour_status,
    td.payment_currency,
    b.band_name,
    v.venue_name,
    v.city,
    v.state,
    ba.name as booking_agent_name,
    ba.email as booking_agent_email,
    -- Payment summary
    (vpl.amount_due - vpl.amount_paid) as balance_due,
    -- Transaction count
    (SELECT COUNT(*) FROM venue_payment_transactions WHERE ledger_id = vpl.id) as transaction_count
FROM venue_payment_ledger vpl
JOIN tour_dates td ON vpl.tour_date_id = td.id
JOIN bands b ON td.band_id = b.id
JOIN venues v ON vpl.venue_id = v.id
JOIN users ba ON vpl.booking_agent_id = ba.id;

-- Comments for documentation
COMMENT ON TABLE venue_payment_ledger IS 'Tracks payments owed by venues to booking agent for completed tours';
COMMENT ON TABLE venue_payment_transactions IS 'Individual payment transactions against ledger entries';
COMMENT ON COLUMN tour_dates.venue_payment_status IS 'Status of venue payment to booking agent (pending, cod_requested, paid, overdue)';
COMMENT ON VIEW venue_outstanding_balances IS 'Summary of what each venue owes';
COMMENT ON VIEW booking_agent_receivables IS 'Summary of what booking agents are owed';
COMMENT ON VIEW venue_payment_ledger_details IS 'Complete ledger information with tour and venue details';

