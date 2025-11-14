-- Migration: Add comprehensive audit logging
-- Purpose: Track all security-sensitive operations for compliance and security monitoring
-- Date: 2025-01-XX
-- Security Feature: Provides audit trail for security events

-- Main audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- e.g., 'login', 'logout', 'password_change', 'admin_action'
    event_category VARCHAR(50) NOT NULL, -- 'authentication', 'authorization', 'data_access', 'admin', 'payment'
    event_status VARCHAR(20) NOT NULL, -- 'success', 'failure', 'pending'
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    email VARCHAR(255), -- Store email even if user is deleted
    user_type VARCHAR(50),
    details JSONB, -- Additional context about the event
    security_level VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
    ON audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_category
    ON audit_logs(event_category);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_email
    ON audit_logs(email);

CREATE INDEX IF NOT EXISTS idx_audit_logs_security_level
    ON audit_logs(security_level)
    WHERE security_level IN ('warning', 'critical');

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time
    ON audit_logs(user_id, created_at DESC);

-- GIN index for JSONB details column for searching within details
CREATE INDEX IF NOT EXISTS idx_audit_logs_details
    ON audit_logs USING GIN (details);

-- Table for sensitive admin actions (subset of audit_logs with stricter retention)
CREATE TABLE IF NOT EXISTS admin_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_email VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- 'user_delete', 'user_ban', 'permission_change', etc.
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_email VARCHAR(255),
    target_type VARCHAR(50), -- 'user', 'band', 'venue', etc.
    action_details JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_user
    ON admin_action_logs(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target_user
    ON admin_action_logs(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type
    ON admin_action_logs(action_type);

-- Function to automatically log authentication events
CREATE OR REPLACE FUNCTION log_authentication_event(
    p_user_id UUID,
    p_email VARCHAR,
    p_event_type VARCHAR,
    p_event_status VARCHAR,
    p_ip_address VARCHAR DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id,
        email,
        event_type,
        event_category,
        event_status,
        ip_address,
        user_agent,
        details,
        security_level
    ) VALUES (
        p_user_id,
        p_email,
        p_event_type,
        'authentication',
        p_event_status,
        p_ip_address,
        p_user_agent,
        p_details,
        CASE
            WHEN p_event_status = 'failure' THEN 'warning'
            WHEN p_event_type IN ('password_change', 'admin_login') THEN 'info'
            ELSE 'info'
        END
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_user_id UUID,
    p_admin_email VARCHAR,
    p_action_type VARCHAR,
    p_target_user_id UUID DEFAULT NULL,
    p_target_email VARCHAR DEFAULT NULL,
    p_target_type VARCHAR DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_action_details JSONB DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_audit_log_id UUID;
BEGIN
    -- Log to admin_action_logs
    INSERT INTO admin_action_logs (
        admin_user_id,
        admin_email,
        action_type,
        target_user_id,
        target_email,
        target_type,
        reason,
        action_details,
        ip_address
    ) VALUES (
        p_admin_user_id,
        p_admin_email,
        p_action_type,
        p_target_user_id,
        p_target_email,
        p_target_type,
        p_reason,
        p_action_details,
        p_ip_address
    ) RETURNING id INTO v_log_id;

    -- Also log to main audit_logs
    INSERT INTO audit_logs (
        user_id,
        email,
        event_type,
        event_category,
        event_status,
        ip_address,
        details,
        security_level
    ) VALUES (
        p_admin_user_id,
        p_admin_email,
        'admin_action_' || p_action_type,
        'admin',
        'success',
        p_ip_address,
        jsonb_build_object(
            'action_type', p_action_type,
            'target_user_id', p_target_user_id,
            'target_email', p_target_email,
            'target_type', p_target_type,
            'reason', p_reason,
            'details', p_action_details
        ),
        'info'
    ) RETURNING id INTO v_audit_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs (keep 90 days for regular, 2 years for admin actions)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    -- Delete regular audit logs older than 90 days (except critical events)
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND security_level NOT IN ('warning', 'critical');

    -- Delete critical/warning logs older than 1 year
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '1 year'
      AND security_level IN ('warning', 'critical');

    -- Keep admin action logs for 2 years
    DELETE FROM admin_action_logs
    WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Views for common audit queries
CREATE OR REPLACE VIEW recent_failed_logins AS
SELECT
    user_id,
    email,
    event_type,
    ip_address,
    details,
    created_at
FROM audit_logs
WHERE event_category = 'authentication'
  AND event_status = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW recent_admin_actions AS
SELECT
    aal.admin_email,
    aal.action_type,
    aal.target_email,
    aal.target_type,
    aal.reason,
    aal.created_at
FROM admin_action_logs aal
WHERE aal.created_at > NOW() - INTERVAL '7 days'
ORDER BY aal.created_at DESC;

-- Comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all security-sensitive operations';
COMMENT ON TABLE admin_action_logs IS 'Dedicated log for admin actions with extended retention period';
COMMENT ON COLUMN audit_logs.event_category IS 'Category: authentication, authorization, data_access, admin, payment';
COMMENT ON COLUMN audit_logs.security_level IS 'Severity: info, warning, critical';
COMMENT ON COLUMN audit_logs.details IS 'Additional context stored as JSONB for flexibility';
