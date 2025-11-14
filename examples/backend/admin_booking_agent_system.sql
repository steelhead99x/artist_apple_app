-- Admin Booking Agent System
-- Creates hierarchical booking agent structure with admin superusers

BEGIN;

-- Add booking_agent_id to tour_dates if not exists
ALTER TABLE tour_dates 
ADD COLUMN IF NOT EXISTS booking_agent_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for booking agent queries
CREATE INDEX IF NOT EXISTS idx_tour_dates_booking_agent_id ON tour_dates(booking_agent_id);

-- Add admin status column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin_agent BOOLEAN DEFAULT FALSE;

-- Add approval status for booking agents
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS agent_status VARCHAR(20) DEFAULT 'pending'
  CHECK (agent_status IN ('pending', 'active', 'suspended'));

-- Update existing booking agents to be active
UPDATE users 
SET agent_status = 'active' 
WHERE user_type = 'booking_agent';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin_agent ON users(is_admin_agent) WHERE is_admin_agent = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_agent_status ON users(agent_status) WHERE user_type = 'booking_agent';

-- Function to set admin booking agents from email list
CREATE OR REPLACE FUNCTION set_admin_booking_agents(admin_emails TEXT[])
RETURNS TABLE(email VARCHAR, is_now_admin BOOLEAN) AS $$
BEGIN
  -- First, remove admin status from all users
  UPDATE users SET is_admin_agent = FALSE WHERE user_type = 'booking_agent';
  
  -- Then set admin status for specified emails (qualify table name to avoid ambiguity)
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

-- Create view for booking agent hierarchy
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

-- Create view for admin dashboard stats
-- Compatible with both bars and venues tables
DO $$
BEGIN
  -- Check if venues table exists, otherwise use bars
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
    EXECUTE 'CREATE OR REPLACE VIEW admin_booking_stats AS
      SELECT 
        COUNT(DISTINCT u.id) as total_agents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_admin_agent = TRUE) as admin_agents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = ''active'') as active_agents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = ''pending'') as pending_agents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = ''suspended'') as suspended_agents,
        COUNT(DISTINCT td.id) as total_tours,
        COUNT(DISTINCT b.id) as total_bands,
        (SELECT COUNT(*) FROM venues) as total_venues
      FROM users u
      LEFT JOIN tour_dates td ON td.booking_agent_id IN (
        SELECT id FROM users WHERE user_type = ''booking_agent''
      )
      LEFT JOIN bands b ON TRUE
      WHERE u.user_type = ''booking_agent''';
  ELSE
    -- Fallback to bars table
    EXECUTE 'CREATE OR REPLACE VIEW admin_booking_stats AS
      SELECT 
        COUNT(DISTINCT u.id) as total_agents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_admin_agent = TRUE) as admin_agents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = ''active'') as active_agents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = ''pending'') as pending_agents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.agent_status = ''suspended'') as suspended_agents,
        COUNT(DISTINCT td.id) as total_tours,
        COUNT(DISTINCT b.id) as total_bands,
        (SELECT COUNT(*) FROM bars) as total_venues
      FROM users u
      LEFT JOIN tour_dates td ON td.booking_agent_id IN (
        SELECT id FROM users WHERE user_type = ''booking_agent''
      )
      LEFT JOIN bands b ON TRUE
      WHERE u.user_type = ''booking_agent''';
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN users.is_admin_agent IS 'TRUE for admin booking agents who can manage all bookings';
COMMENT ON COLUMN users.agent_status IS 'Status of booking agent: pending (awaiting approval), active (can book), suspended (access revoked)';
COMMENT ON VIEW booking_agent_hierarchy IS 'Hierarchical view of all booking agents with their stats';
COMMENT ON VIEW admin_booking_stats IS 'Dashboard statistics for admin booking agents';

COMMIT;

-- Success messages
DO $$
BEGIN
  RAISE NOTICE '✅ Admin Booking Agent System Created Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features Added:';
  RAISE NOTICE '  • is_admin_agent column for superuser booking agents';
  RAISE NOTICE '  • agent_status for approval workflow (pending/active/suspended)';
  RAISE NOTICE '  • booking_agent_hierarchy view';
  RAISE NOTICE '  • admin_booking_stats view';
  RAISE NOTICE '  • set_admin_booking_agents() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Set ADMIN_BOOKING_AGENTS env variable';
  RAISE NOTICE '  2. Run sync function on server startup';
  RAISE NOTICE '  3. Deploy updated backend routes';
  RAISE NOTICE '  4. Test admin dashboard at /dashboard';
END $$;

