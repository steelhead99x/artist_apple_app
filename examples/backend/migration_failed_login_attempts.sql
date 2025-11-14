-- Migration: Add failed login attempts tracking
-- Purpose: Track failed login attempts for account lockout and security monitoring
-- Date: 2025-01-XX
-- Security Feature: Prevents brute force attacks

-- Table to track failed login attempts
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT,
    attempt_type VARCHAR(50) DEFAULT 'password', -- 'password', 'pin', 'wallet'
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups by email and time
CREATE INDEX IF NOT EXISTS idx_failed_login_email_time
    ON failed_login_attempts(email, attempted_at DESC);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_failed_login_created_at
    ON failed_login_attempts(attempted_at);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_failed_login_user_id
    ON failed_login_attempts(user_id);

-- Add account lockout fields to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS lockout_reason VARCHAR(255),
    ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE;

-- Index for locked accounts
CREATE INDEX IF NOT EXISTS idx_users_locked_until
    ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Function to clean up old failed login attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_failed_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM failed_login_attempts
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up old records (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-failed-logins', '0 3 * * *', 'SELECT cleanup_old_failed_login_attempts()');

COMMENT ON TABLE failed_login_attempts IS 'Tracks failed login attempts for security monitoring and account lockout';
COMMENT ON COLUMN users.locked_until IS 'Account is locked until this timestamp (NULL = not locked)';
COMMENT ON COLUMN users.lockout_reason IS 'Reason for account lockout (e.g., too_many_attempts, admin_action)';
COMMENT ON COLUMN users.failed_login_count IS 'Count of consecutive failed login attempts';
COMMENT ON COLUMN users.last_failed_login IS 'Timestamp of most recent failed login attempt';
