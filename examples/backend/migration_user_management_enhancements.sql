-- Migration for User Management Enhancements
-- Run this after existing schema

-- Add custom billing adjustments for users
CREATE TABLE IF NOT EXISTS user_billing_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    adjusted_by UUID NOT NULL REFERENCES users(id),
    original_amount DECIMAL(10, 2) NOT NULL,
    adjusted_amount DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2),
    reason TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user features/states table for multiple feature assignments
CREATE TABLE IF NOT EXISTS user_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_type VARCHAR(100) NOT NULL,
    feature_value JSONB,
    assigned_by UUID NOT NULL REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feature_type)
);

-- Add user states table for tracking multiple states per user
CREATE TABLE IF NOT EXISTS user_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state_type VARCHAR(50) NOT NULL CHECK(state_type IN ('subscription', 'access_level', 'special_permission', 'custom')),
    state_value VARCHAR(255) NOT NULL,
    assigned_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add booking manager assignments table
CREATE TABLE IF NOT EXISTS booking_manager_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(manager_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_billing_adjustments_user_id ON user_billing_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_adjustments_active ON user_billing_adjustments(active);
CREATE INDEX IF NOT EXISTS idx_user_features_user_id ON user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_user_features_active ON user_features(active);
CREATE INDEX IF NOT EXISTS idx_user_states_user_id ON user_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_states_active ON user_states(active);
CREATE INDEX IF NOT EXISTS idx_booking_manager_assignments_manager_id ON booking_manager_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_booking_manager_assignments_user_id ON booking_manager_assignments(user_id);

-- Add comments
COMMENT ON TABLE user_billing_adjustments IS 'Stores custom billing adjustments made by booking agents';
COMMENT ON TABLE user_features IS 'Stores multiple features assigned to users';
COMMENT ON TABLE user_states IS 'Stores multiple states/permissions for users';
COMMENT ON TABLE booking_manager_assignments IS 'Tracks which users are managed by which booking managers';

