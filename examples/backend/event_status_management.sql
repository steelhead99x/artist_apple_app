-- Event Status Management System
-- Automatically manages event statuses based on payment completion and timeline
-- Date: October 26, 2025

-- Add finalization fields to tour_dates
ALTER TABLE tour_dates
ADD COLUMN IF NOT EXISTS finalized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS finalization_notes TEXT;

-- Create computed event status view that considers payment and timeline
CREATE OR REPLACE VIEW event_status_computed AS
SELECT 
    td.*,
    tp.payment_status as tour_payment_status,
    tp.id as tour_payment_id,
    -- Compute actual status based on business rules
    CASE
        -- If cancelled, keep as cancelled
        WHEN td.status = 'cancelled' THEN 'cancelled'
        
        -- If finalized by booking agent, show as completed
        WHEN td.finalized = TRUE THEN 'completed'
        
        -- If event date has passed and end time has passed
        WHEN td.date < CURRENT_DATE 
            OR (td.date = CURRENT_DATE AND td.end_time IS NOT NULL AND td.end_time < CURRENT_TIME) 
            THEN 
            CASE 
                -- If no payment required ($0 or null), ready for finalization
                WHEN td.payment_amount IS NULL OR td.payment_amount = 0 THEN 'completed_pending_finalization'
                -- If payment is completed, ready for finalization
                WHEN tp.payment_status = 'completed' THEN 'completed_pending_finalization'
                -- If payment exists but not completed, payment pending
                WHEN tp.id IS NOT NULL AND tp.payment_status != 'completed' THEN 'payment_pending'
                -- If no payment record exists but payment required, payment pending
                ELSE 'payment_pending'
            END
        
        -- If event is happening right now
        WHEN td.date = CURRENT_DATE 
            AND td.start_time IS NOT NULL 
            AND td.start_time <= CURRENT_TIME 
            AND (td.end_time IS NULL OR td.end_time >= CURRENT_TIME)
            THEN 'in_progress'
        
        -- Future events - check if confirmed
        WHEN td.status = 'confirmed' THEN 'confirmed'
        
        -- Default to pending
        ELSE 'pending'
    END as computed_status,
    
    -- Check if payment is fully allocated or not required
    CASE 
        -- If no payment amount or $0, no payment needed
        WHEN td.payment_amount IS NULL OR td.payment_amount = 0 THEN TRUE
        -- If payment record exists and completed
        WHEN tp.id IS NOT NULL THEN
            CASE 
                WHEN tp.payment_status = 'completed' THEN TRUE
                ELSE FALSE
            END
        -- Payment required but not allocated
        ELSE FALSE
    END as payment_completed,
    
    -- Check if event can be finalized
    CASE
        WHEN td.finalized = TRUE THEN FALSE
        WHEN td.date < CURRENT_DATE 
            OR (td.date = CURRENT_DATE AND td.end_time IS NOT NULL AND td.end_time < CURRENT_TIME)
            THEN TRUE
        ELSE FALSE
    END as can_finalize
FROM tour_dates td
LEFT JOIN tour_payments tp ON td.id = tp.tour_date_id;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tour_dates_date_time ON tour_dates(date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_tour_dates_finalized ON tour_dates(finalized);

-- Function to automatically update event statuses based on computed rules
CREATE OR REPLACE FUNCTION update_event_statuses()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update events that should be in_progress
    UPDATE tour_dates td
    SET status = 'in_progress'
    FROM event_status_computed esc
    WHERE td.id = esc.id
        AND esc.computed_status = 'in_progress'
        AND td.status != 'in_progress'
        AND td.status != 'cancelled';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Don't automatically set to completed - require booking agent finalization
    -- But we can mark as ready for finalization via the view
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function for booking agent to finalize an event
CREATE OR REPLACE FUNCTION finalize_event(
    p_event_id UUID,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_payment_completed BOOLEAN;
    v_can_finalize BOOLEAN;
BEGIN
    -- Check if event exists and can be finalized
    SELECT 
        payment_completed,
        can_finalize
    INTO 
        v_payment_completed,
        v_can_finalize
    FROM event_status_computed
    WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;
    
    IF NOT v_can_finalize THEN
        RAISE EXCEPTION 'Event cannot be finalized yet (event must be past)';
    END IF;
    
    -- Update the event
    UPDATE tour_dates
    SET 
        finalized = TRUE,
        finalized_at = NOW(),
        finalized_by = p_user_id,
        finalization_notes = p_notes,
        status = 'completed'
    WHERE id = p_event_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- View for booking agents to see events requiring finalization
CREATE OR REPLACE VIEW events_pending_finalization AS
SELECT 
    esc.*,
    b.band_name,
    v.venue_name,
    v.city,
    v.state,
    u.name as booking_agent_name
FROM event_status_computed esc
JOIN bands b ON esc.band_id = b.id
LEFT JOIN venues v ON esc.venue_id = v.id
LEFT JOIN users u ON esc.booking_agent_id = u.id
WHERE esc.computed_status = 'completed_pending_finalization'
    AND esc.finalized = FALSE
ORDER BY esc.date ASC;

-- View for payment pending events
CREATE OR REPLACE VIEW events_payment_pending AS
SELECT 
    esc.*,
    b.band_name,
    v.venue_name,
    v.city,
    v.state,
    u.name as booking_agent_name
FROM event_status_computed esc
JOIN bands b ON esc.band_id = b.id
LEFT JOIN venues v ON esc.venue_id = v.id
LEFT JOIN users u ON esc.booking_agent_id = u.id
WHERE esc.computed_status = 'payment_pending'
    AND esc.finalized = FALSE
ORDER BY esc.date ASC;

-- Comments for documentation
COMMENT ON VIEW event_status_computed IS 'Computed event statuses based on payment completion and timeline';
COMMENT ON VIEW events_pending_finalization IS 'Events that have passed and are waiting for booking agent finalization';
COMMENT ON VIEW events_payment_pending IS 'Events that have passed but payment is not fully completed';
COMMENT ON FUNCTION update_event_statuses() IS 'Updates event statuses based on current time - should be called periodically';
COMMENT ON FUNCTION finalize_event IS 'Allows booking agent to finalize an event after it has occurred';
COMMENT ON COLUMN tour_dates.finalized IS 'Whether booking agent has finalized this event with reviews and final information';

-- Create a trigger to auto-update in_progress status when event is updated
CREATE OR REPLACE FUNCTION auto_update_event_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If event date/time changed, recalculate status
    IF NEW.date IS DISTINCT FROM OLD.date 
        OR NEW.start_time IS DISTINCT FROM OLD.start_time 
        OR NEW.end_time IS DISTINCT FROM OLD.end_time THEN
        
        -- Check if should be in_progress
        IF NEW.date = CURRENT_DATE 
            AND NEW.start_time IS NOT NULL 
            AND NEW.start_time <= CURRENT_TIME 
            AND (NEW.end_time IS NULL OR NEW.end_time >= CURRENT_TIME)
            AND NEW.status NOT IN ('cancelled', 'completed') THEN
            NEW.status := 'in_progress';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_update_event_status ON tour_dates;
CREATE TRIGGER trigger_auto_update_event_status
    BEFORE UPDATE ON tour_dates
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_event_status();


