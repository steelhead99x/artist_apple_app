-- Gift Card Admin System for Admin Booking Agents
-- Extends gift card system with admin controls and monthly promotion limits

BEGIN;

-- Update gift card status to include 'suspended'
ALTER TABLE gift_cards 
DROP CONSTRAINT IF EXISTS gift_cards_status_check;

ALTER TABLE gift_cards 
ADD CONSTRAINT gift_cards_status_check 
CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled', 'suspended'));

-- Add admin action tracking
ALTER TABLE gift_cards
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_gift_cards_suspended_by ON gift_cards(suspended_by);

-- Create view to track monthly gift card purchases by booking agent
CREATE OR REPLACE VIEW gift_card_monthly_summary AS
SELECT 
  gc.purchaser_id,
  u.email as purchaser_email,
  u.name as purchaser_name,
  u.is_admin_agent,
  DATE_TRUNC('month', gc.created_at) as month,
  COUNT(gc.id) as cards_purchased,
  SUM(gc.amount) as total_amount,
  SUM(CASE WHEN gc.status = 'active' THEN gc.remaining_balance ELSE 0 END) as active_balance,
  COUNT(CASE WHEN gc.status = 'active' THEN 1 END) as active_cards,
  COUNT(CASE WHEN gc.status = 'redeemed' THEN 1 END) as redeemed_cards,
  COUNT(CASE WHEN gc.status = 'suspended' THEN 1 END) as suspended_cards,
  COUNT(CASE WHEN gc.status = 'expired' THEN 1 END) as expired_cards
FROM gift_cards gc
JOIN users u ON gc.purchaser_id = u.id
WHERE u.user_type = 'booking_agent'
GROUP BY gc.purchaser_id, u.email, u.name, u.is_admin_agent, DATE_TRUNC('month', gc.created_at);

-- Create view for admin dashboard: all gift cards with booking agent info
CREATE OR REPLACE VIEW admin_gift_card_overview AS
SELECT 
  gc.*,
  purchaser.email as purchaser_email,
  purchaser.name as purchaser_name,
  purchaser.is_admin_agent as purchaser_is_admin,
  recipient.email as recipient_email,
  recipient.name as recipient_name,
  suspended_by_user.email as suspended_by_email,
  suspended_by_user.name as suspended_by_name,
  
  -- Calculate days until expiration
  EXTRACT(DAY FROM (gc.expires_at - NOW())) as days_until_expiration,
  
  -- Get transaction count
  (SELECT COUNT(*) FROM gift_card_transactions gct WHERE gct.gift_card_id = gc.id) as transaction_count
  
FROM gift_cards gc
JOIN users purchaser ON gc.purchaser_id = purchaser.id
LEFT JOIN users recipient ON gc.recipient_id = recipient.id
LEFT JOIN users suspended_by_user ON gc.suspended_by = suspended_by_user.id
WHERE purchaser.user_type = 'booking_agent'
ORDER BY gc.created_at DESC;

-- Function to check if booking agent is within monthly promotion limit
CREATE OR REPLACE FUNCTION check_booking_agent_monthly_limit(
  agent_id UUID,
  new_amount DECIMAL(10,2)
)
RETURNS TABLE(
  within_limit BOOLEAN,
  current_month_total DECIMAL(10,2),
  limit_amount DECIMAL(10,2),
  remaining_amount DECIMAL(10,2),
  is_admin BOOLEAN
) AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_current_total DECIMAL(10,2);
  v_limit DECIMAL(10,2) := 125.00; -- $125 monthly limit for non-admin agents
BEGIN
  -- Check if user is admin booking agent
  SELECT is_admin_agent INTO v_is_admin
  FROM users
  WHERE id = agent_id AND user_type = 'booking_agent';
  
  -- Admin agents have no limit
  IF v_is_admin THEN
    RETURN QUERY SELECT 
      TRUE as within_limit,
      0.00 as current_month_total,
      NULL::DECIMAL(10,2) as limit_amount,
      NULL::DECIMAL(10,2) as remaining_amount,
      TRUE as is_admin;
    RETURN;
  END IF;
  
  -- Calculate current month total for non-admin agent
  SELECT COALESCE(SUM(gc.amount), 0.00) INTO v_current_total
  FROM gift_cards gc
  WHERE gc.purchaser_id = agent_id
    AND DATE_TRUNC('month', gc.created_at) = DATE_TRUNC('month', NOW())
    AND gc.status NOT IN ('cancelled', 'suspended'); -- Don't count cancelled/suspended cards
  
  -- Check if new purchase would exceed limit
  RETURN QUERY SELECT 
    (v_current_total + new_amount) <= v_limit as within_limit,
    v_current_total as current_month_total,
    v_limit as limit_amount,
    (v_limit - v_current_total) as remaining_amount,
    FALSE as is_admin;
END;
$$ LANGUAGE plpgsql;

-- Function to get gift card statistics by booking agent (for admin view)
CREATE OR REPLACE FUNCTION get_gift_card_stats_by_agent()
RETURNS TABLE(
  agent_id UUID,
  agent_email VARCHAR,
  agent_name VARCHAR,
  is_admin_agent BOOLEAN,
  agent_status VARCHAR,
  total_cards_purchased BIGINT,
  total_amount_purchased DECIMAL(10,2),
  current_month_total DECIMAL(10,2),
  current_month_cards BIGINT,
  active_cards BIGINT,
  active_balance DECIMAL(10,2),
  redeemed_cards BIGINT,
  redeemed_amount DECIMAL(10,2),
  suspended_cards BIGINT,
  expired_cards BIGINT,
  monthly_limit DECIMAL(10,2),
  remaining_this_month DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as agent_id,
    u.email as agent_email,
    u.name as agent_name,
    u.is_admin_agent,
    u.agent_status,
    
    -- All time stats
    COUNT(gc.id) as total_cards_purchased,
    COALESCE(SUM(gc.amount), 0.00) as total_amount_purchased,
    
    -- Current month stats
    COALESCE(SUM(CASE 
      WHEN DATE_TRUNC('month', gc.created_at) = DATE_TRUNC('month', NOW()) 
        AND gc.status NOT IN ('cancelled', 'suspended')
      THEN gc.amount 
      ELSE 0 
    END), 0.00) as current_month_total,
    COUNT(CASE 
      WHEN DATE_TRUNC('month', gc.created_at) = DATE_TRUNC('month', NOW())
      THEN 1 
    END) as current_month_cards,
    
    -- Status breakdowns
    COUNT(CASE WHEN gc.status = 'active' THEN 1 END) as active_cards,
    COALESCE(SUM(CASE WHEN gc.status = 'active' THEN gc.remaining_balance ELSE 0 END), 0.00) as active_balance,
    COUNT(CASE WHEN gc.status = 'redeemed' THEN 1 END) as redeemed_cards,
    COALESCE(SUM(CASE WHEN gc.status = 'redeemed' THEN gc.amount ELSE 0 END), 0.00) as redeemed_amount,
    COUNT(CASE WHEN gc.status = 'suspended' THEN 1 END) as suspended_cards,
    COUNT(CASE WHEN gc.status = 'expired' THEN 1 END) as expired_cards,
    
    -- Monthly limit info
    CASE WHEN u.is_admin_agent THEN NULL ELSE 125.00 END as monthly_limit,
    CASE 
      WHEN u.is_admin_agent THEN NULL 
      ELSE 125.00 - COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', gc.created_at) = DATE_TRUNC('month', NOW())
          AND gc.status NOT IN ('cancelled', 'suspended')
        THEN gc.amount 
        ELSE 0 
      END), 0.00)
    END as remaining_this_month
    
  FROM users u
  LEFT JOIN gift_cards gc ON gc.purchaser_id = u.id
  WHERE u.user_type = 'booking_agent'
  GROUP BY u.id, u.email, u.name, u.is_admin_agent, u.agent_status
  ORDER BY u.is_admin_agent DESC, u.name;
END;
$$ LANGUAGE plpgsql;

-- Function for admin to suspend a gift card
CREATE OR REPLACE FUNCTION admin_suspend_gift_card(
  card_id UUID,
  admin_id UUID,
  reason TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  gift_card_id UUID
) AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_card_status VARCHAR(50);
BEGIN
  -- Check if user is admin booking agent
  SELECT is_admin_agent INTO v_is_admin
  FROM users
  WHERE id = admin_id AND user_type = 'booking_agent' AND agent_status = 'active';
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT FALSE, 'Only admin booking agents can suspend gift cards', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if gift card exists and get current status
  SELECT status INTO v_card_status
  FROM gift_cards
  WHERE id = card_id;
  
  IF v_card_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Gift card not found', NULL::UUID;
    RETURN;
  END IF;
  
  IF v_card_status = 'suspended' THEN
    RETURN QUERY SELECT FALSE, 'Gift card is already suspended', NULL::UUID;
    RETURN;
  END IF;
  
  -- Suspend the gift card
  UPDATE gift_cards
  SET 
    status = 'suspended',
    suspended_at = NOW(),
    suspended_by = admin_id,
    suspension_reason = reason,
    updated_at = NOW()
  WHERE id = card_id;
  
  -- Log the action in transactions
  INSERT INTO gift_card_transactions (
    gift_card_id,
    transaction_type,
    amount,
    currency,
    user_id,
    description
  )
  SELECT 
    card_id,
    'expire',
    0,
    'USD',
    admin_id,
    'Gift card suspended by admin: ' || COALESCE(reason, 'No reason provided')
  FROM gift_cards WHERE id = card_id;
  
  RETURN QUERY SELECT TRUE, 'Gift card suspended successfully', card_id;
END;
$$ LANGUAGE plpgsql;

-- Function for admin to unsuspend a gift card
CREATE OR REPLACE FUNCTION admin_unsuspend_gift_card(
  card_id UUID,
  admin_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_card_status VARCHAR(50);
  v_is_expired BOOLEAN;
BEGIN
  -- Check if user is admin booking agent
  SELECT is_admin_agent INTO v_is_admin
  FROM users
  WHERE id = admin_id AND user_type = 'booking_agent' AND agent_status = 'active';
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT FALSE, 'Only admin booking agents can unsuspend gift cards';
    RETURN;
  END IF;
  
  -- Check if gift card exists and get current status
  SELECT status, (expires_at < NOW()) INTO v_card_status, v_is_expired
  FROM gift_cards
  WHERE id = card_id;
  
  IF v_card_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Gift card not found';
    RETURN;
  END IF;
  
  IF v_card_status != 'suspended' THEN
    RETURN QUERY SELECT FALSE, 'Gift card is not suspended';
    RETURN;
  END IF;
  
  -- Determine new status (expired if past expiration, redeemed if no balance, otherwise active)
  UPDATE gift_cards
  SET 
    status = CASE 
      WHEN v_is_expired THEN 'expired'
      WHEN remaining_balance <= 0 THEN 'redeemed'
      ELSE 'active'
    END,
    suspended_at = NULL,
    suspended_by = NULL,
    suspension_reason = NULL,
    admin_notes = 'Unsuspended by admin at ' || NOW(),
    updated_at = NOW()
  WHERE id = card_id;
  
  RETURN QUERY SELECT TRUE, 'Gift card unsuspended successfully';
END;
$$ LANGUAGE plpgsql;

-- Function for admin to delete (cancel) a gift card
CREATE OR REPLACE FUNCTION admin_delete_gift_card(
  card_id UUID,
  admin_id UUID,
  reason TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_card_exists BOOLEAN;
BEGIN
  -- Check if user is admin booking agent
  SELECT is_admin_agent INTO v_is_admin
  FROM users
  WHERE id = admin_id AND user_type = 'booking_agent' AND agent_status = 'active';
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT FALSE, 'Only admin booking agents can delete gift cards';
    RETURN;
  END IF;
  
  -- Check if gift card exists
  SELECT EXISTS(SELECT 1 FROM gift_cards WHERE id = card_id) INTO v_card_exists;
  
  IF NOT v_card_exists THEN
    RETURN QUERY SELECT FALSE, 'Gift card not found';
    RETURN;
  END IF;
  
  -- Mark as cancelled (don't actually delete for audit purposes)
  UPDATE gift_cards
  SET 
    status = 'cancelled',
    suspended_at = NOW(),
    suspended_by = admin_id,
    suspension_reason = reason,
    admin_notes = 'Cancelled by admin: ' || COALESCE(reason, 'No reason provided'),
    updated_at = NOW()
  WHERE id = card_id;
  
  -- Log the cancellation
  INSERT INTO gift_card_transactions (
    gift_card_id,
    transaction_type,
    amount,
    currency,
    user_id,
    description
  )
  SELECT 
    card_id,
    'expire',
    0,
    'USD',
    admin_id,
    'Gift card cancelled by admin: ' || COALESCE(reason, 'No reason provided')
  FROM gift_cards WHERE id = card_id;
  
  RETURN QUERY SELECT TRUE, 'Gift card cancelled successfully';
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchaser_created ON gift_cards(purchaser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status_created ON gift_cards(status, created_at DESC);

