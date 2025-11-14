-- Migration: Ensure Admin Booking Agent Columns Exist
-- This migration ensures the columns exist even if base schema failed
-- Safe to run at any time - uses IF NOT EXISTS

-- Add is_admin_agent column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_admin_agent'
    ) THEN
        ALTER TABLE users ADD COLUMN is_admin_agent BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_admin_agent column';
    END IF;
END $$;

-- Add agent_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'agent_status'
    ) THEN
        ALTER TABLE users ADD COLUMN agent_status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Added agent_status column';
    END IF;
END $$;

-- Add check constraint for agent_status if it doesn't exist
DO $$ 
BEGIN
    ALTER TABLE users ADD CONSTRAINT users_agent_status_check 
    CHECK (agent_status IN ('pending', 'active', 'suspended'));
    RAISE NOTICE 'Added agent_status check constraint';
EXCEPTION 
    WHEN duplicate_object THEN 
        RAISE NOTICE 'agent_status check constraint already exists';
END $$;

-- Update existing booking agents to be active
UPDATE users 
SET agent_status = 'active' 
WHERE user_type = 'booking_agent' 
  AND (agent_status IS NULL OR agent_status = 'pending');

-- Add booking_agent_id to tour_dates if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tour_dates' AND column_name = 'booking_agent_id'
    ) THEN
        ALTER TABLE tour_dates 
        ADD COLUMN booking_agent_id UUID REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added booking_agent_id column to tour_dates';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_is_admin_agent 
ON users(is_admin_agent) WHERE is_admin_agent = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_agent_status 
ON users(agent_status) WHERE user_type = 'booking_agent';

CREATE INDEX IF NOT EXISTS idx_tour_dates_booking_agent_id 
ON tour_dates(booking_agent_id);

-- Create the set_admin_booking_agents function
CREATE OR REPLACE FUNCTION set_admin_booking_agents(admin_emails TEXT[])
RETURNS TABLE(email VARCHAR, is_now_admin BOOLEAN) AS $$
BEGIN
  -- First, remove admin status from all users
  UPDATE users SET is_admin_agent = FALSE WHERE user_type = 'booking_agent';
  
  -- Then set admin status for specified emails
  UPDATE users 
  SET is_admin_agent = TRUE, agent_status = 'active'
  WHERE LOWER(users.email) = ANY(SELECT LOWER(unnest(admin_emails)))
    AND user_type = 'booking_agent';
  
  -- Return results
  RETURN QUERY
  SELECT 
    u.email::VARCHAR,
    u.is_admin_agent
  FROM users u
  WHERE user_type = 'booking_agent'
  ORDER BY is_admin_agent DESC, u.email;
END;
$$ LANGUAGE plpgsql;

-- Create views (compatible with bars table)
CREATE OR REPLACE VIEW booking_agent_hierarchy AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.is_admin_agent,
  u.agent_status,
  u.status as approval_status,
  u.created_at,
  COUNT(DISTINCT td.id) as total_tours,
  COUNT(DISTINCT td.id) FILTER (WHERE td.status = 'confirmed') as confirmed_tours,
  COUNT(DISTINCT td.id) FILTER (WHERE td.status = 'completed') as completed_tours,
  COALESCE(SUM(td.payment_amount) FILTER (WHERE td.status IN ('confirmed', 'completed')), 0) as total_bookings_value
FROM users u
LEFT JOIN tour_dates td ON u.id = td.booking_agent_id
WHERE u.user_type = 'booking_agent'
GROUP BY u.id, u.email, u.name, u.is_admin_agent, u.agent_status, u.status, u.created_at;

-- Create admin stats view (compatible with bars table)
CREATE OR REPLACE VIEW admin_booking_stats AS
SELECT 
  COUNT(DISTINCT u.id) as total_agents,
  COUNT(DISTINCT u.id) FILTER (WHERE u.is_admin_agent = TRUE) as admin_agents,
  COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = 'active') as active_agents,
  COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = 'pending') as pending_agents,
  COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = 'suspended') as suspended_agents,
  COUNT(DISTINCT td.id) as total_tours,
  COUNT(DISTINCT b.id) as total_bands,
  (SELECT COUNT(*) FROM venues) as total_venues
FROM users u
LEFT JOIN tour_dates td ON td.booking_agent_id IN (
  SELECT id FROM users WHERE user_type = 'booking_agent'
)
LEFT JOIN bands b ON TRUE
WHERE u.user_type = 'booking_agent';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Admin booking agent columns ensured!';
  RAISE NOTICE 'Columns: is_admin_agent, agent_status';
  RAISE NOTICE 'Function: set_admin_booking_agents()';
  RAISE NOTICE 'Views: booking_agent_hierarchy, admin_booking_stats';
END $$;

