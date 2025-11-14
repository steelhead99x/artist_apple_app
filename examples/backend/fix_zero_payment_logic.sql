-- Fix Zero Payment Logic
-- Events with $0 payment amount should be considered "payment completed"
-- since there's nothing to allocate
-- Date: October 26, 2025

-- Update the event_status_computed view to handle $0 payments correctly
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

-- Update the events_payment_pending view to exclude $0 events
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
    AND esc.payment_amount IS NOT NULL
    AND esc.payment_amount > 0
ORDER BY esc.date ASC;

