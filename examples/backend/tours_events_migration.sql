-- Tours and Events Migration
-- This restructures the system so bands have "tours" containing multiple "events"
-- Venues see "events" while bands see "tours"
-- Date: October 26, 2025

-- Create tours table (the band's concept of a tour with multiple events)
CREATE TABLE IF NOT EXISTS tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    booking_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tour_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    total_events INTEGER DEFAULT 0,
    confirmed_events INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tour_id to tour_dates (making individual bookings into "events" under a tour)
ALTER TABLE tour_dates 
ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES tours(id) ON DELETE SET NULL;

-- Add booking agent tracking to tour_dates/events
ALTER TABLE tour_dates
ADD COLUMN IF NOT EXISTS booking_agent_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tours_band_id ON tours(band_id);
CREATE INDEX IF NOT EXISTS idx_tours_booking_agent ON tours(booking_agent_id);
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_tours_dates ON tours(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tour_dates_tour_id ON tour_dates(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_dates_booking_agent ON tour_dates(booking_agent_id);

-- Create view for tour summary with event counts
CREATE OR REPLACE VIEW tour_summary AS
SELECT 
    t.*,
    b.band_name,
    b.user_id as band_owner_id,
    u.name as booking_agent_name,
    u.email as booking_agent_email,
    COUNT(td.id) as total_events_count,
    COUNT(CASE WHEN td.status = 'confirmed' THEN 1 END) as confirmed_events_count,
    COUNT(CASE WHEN td.status = 'completed' THEN 1 END) as completed_events_count,
    COALESCE(SUM(td.payment_amount), 0) as total_payment_amount,
    MIN(td.date) as actual_start_date,
    MAX(td.date) as actual_end_date
FROM tours t
LEFT JOIN bands b ON t.band_id = b.id
LEFT JOIN users u ON t.booking_agent_id = u.id
LEFT JOIN tour_dates td ON t.id = td.tour_id
GROUP BY t.id, b.band_name, b.user_id, u.name, u.email;

-- Create view for events (tour_dates) with tour information
CREATE OR REPLACE VIEW events_with_tour AS
SELECT 
    td.*,
    b.band_name,
    v.venue_name,
    v.city,
    v.state,
    t.tour_name,
    t.status as tour_status,
    u.name as booking_agent_name
FROM tour_dates td
LEFT JOIN bands b ON td.band_id = b.id
LEFT JOIN venues v ON td.venue_id = v.id
LEFT JOIN tours t ON td.tour_id = t.id
LEFT JOIN users u ON td.booking_agent_id = u.id;

-- Function to update tour event counts
CREATE OR REPLACE FUNCTION update_tour_event_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.tour_id IS NOT NULL THEN
            UPDATE tours SET
                total_events = (SELECT COUNT(*) FROM tour_dates WHERE tour_id = OLD.tour_id),
                confirmed_events = (SELECT COUNT(*) FROM tour_dates WHERE tour_id = OLD.tour_id AND status = 'confirmed'),
                updated_at = NOW()
            WHERE id = OLD.tour_id;
        END IF;
        RETURN OLD;
    ELSE
        IF NEW.tour_id IS NOT NULL THEN
            UPDATE tours SET
                total_events = (SELECT COUNT(*) FROM tour_dates WHERE tour_id = NEW.tour_id),
                confirmed_events = (SELECT COUNT(*) FROM tour_dates WHERE tour_id = NEW.tour_id AND status = 'confirmed'),
                updated_at = NOW()
            WHERE id = NEW.tour_id;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update event counts
DROP TRIGGER IF EXISTS trigger_update_tour_counts ON tour_dates;
CREATE TRIGGER trigger_update_tour_counts
AFTER INSERT OR UPDATE OR DELETE ON tour_dates
FOR EACH ROW
EXECUTE FUNCTION update_tour_event_counts();

-- Add comments for documentation
COMMENT ON TABLE tours IS 'Tour groupings for bands - each tour contains multiple events/dates';
COMMENT ON COLUMN tours.status IS 'planning=being organized, confirmed=dates locked in, in_progress=tour started, completed=tour finished, cancelled=tour cancelled';
COMMENT ON COLUMN tour_dates.tour_id IS 'Optional: Links this event to a tour. NULL means standalone event.';
COMMENT ON VIEW tour_summary IS 'Complete tour information with aggregated event counts and payment totals';
COMMENT ON VIEW events_with_tour IS 'Individual events with their tour context (for venues/booking agents)';

-- Sample data migration: Create tours for existing tour_dates (optional, comment out if not needed)
-- This groups existing events by band, creating a tour for each band with events
/*
INSERT INTO tours (band_id, tour_name, start_date, end_date, status)
SELECT 
    band_id,
    b.band_name || ' Tour ' || EXTRACT(YEAR FROM MIN(date))::TEXT,
    MIN(date),
    MAX(date),
    CASE 
        WHEN MAX(date) < CURRENT_DATE THEN 'completed'
        WHEN MIN(date) > CURRENT_DATE THEN 'confirmed'
        ELSE 'in_progress'
    END
FROM tour_dates td
JOIN bands b ON td.band_id = b.id
WHERE td.tour_id IS NULL
GROUP BY band_id, b.band_name
HAVING COUNT(*) > 0;

-- Link existing events to the newly created tours
UPDATE tour_dates td
SET tour_id = t.id
FROM tours t
WHERE td.band_id = t.band_id
  AND td.tour_id IS NULL
  AND td.date BETWEEN t.start_date AND t.end_date;
*/

