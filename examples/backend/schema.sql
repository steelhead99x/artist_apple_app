-- PostgreSQL Schema for Artist Space
-- Run this to initialize your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension (for future vector similarity searches)
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (for all user types)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    recovery_email VARCHAR(255),
    password_hash VARCHAR(255),
    wallet_address VARCHAR(255) UNIQUE,
    user_type VARCHAR(50) NOT NULL CHECK(user_type IN ('booking_agent', 'booking_manager', 'band', 'bar', 'studio', 'user')),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'deleted')),
    requires_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
    custom_band_limit INTEGER DEFAULT NULL, -- Custom band limit set by booking agent for enterprise users
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- Soft delete timestamp
    suspension_reason VARCHAR(50) DEFAULT NULL CHECK (suspension_reason IN ('admin_deleted', 'payment_overdue', 'user_deleted')), -- Reason for account suspension
    is_admin_agent BOOLEAN DEFAULT FALSE, -- TRUE for admin booking agents who can manage all bookings
    agent_status VARCHAR(20) DEFAULT 'pending' CHECK (agent_status IN ('pending', 'active', 'suspended')), -- Status of booking agent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password reset requests
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    pin_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Band profiles
CREATE TABLE IF NOT EXISTS bands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    band_name VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    eth_wallet VARCHAR(255),
    website VARCHAR(500),
    social_links JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT, -- Notes for booking agent (e.g., duplicate name warning)
    admin_email VARCHAR(255), -- Primary admin email for the band
    band_email VARCHAR(255) UNIQUE, -- Auto-generated unique email for the band
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venue profiles (bars, clubs, concert halls)
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    capacity INTEGER,
    eth_wallet VARCHAR(255),
    description TEXT,
    amenities JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tour dates/Bookings
CREATE TABLE IF NOT EXISTS tour_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    booking_agent_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Track which booking agent created the tour date
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_amount DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KPIs for tour dates
CREATE TABLE IF NOT EXISTS tour_kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_date_id UUID NOT NULL REFERENCES tour_dates(id) ON DELETE CASCADE,
    attendance INTEGER,
    bar_sales DECIMAL(10, 2),
    new_customers INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tour_date_id UUID REFERENCES tour_dates(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    review_text TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- W-2 documents metadata
CREATE TABLE IF NOT EXISTS w2_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_data BYTEA,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Band members (individual users in a band)
CREATE TABLE IF NOT EXISTS band_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending')),
    permissions JSONB DEFAULT '{"can_modify_profile": false, "can_receive_band_emails": false, "can_manage_members": false, "is_owner": false}'::jsonb, -- Band member permissions
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(band_id, user_id)
);

-- Recording Studios
CREATE TABLE IF NOT EXISTS recording_studios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    studio_name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    equipment JSONB,
    daw_software VARCHAR(255),
    hourly_rate DECIMAL(10, 2),
    eth_wallet VARCHAR(255),
    website VARCHAR(500),
    protools_version VARCHAR(50),
    sonobus_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    webrtc_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Studio sessions (track connection time)
CREATE TABLE IF NOT EXISTS studio_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL REFERENCES recording_studios(id) ON DELETE CASCADE,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    connection_type VARCHAR(50) CHECK(connection_type IN ('sonobus', 'webrtc', 'both', 'livekit')),
    session_notes TEXT,
    recording_files JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
    livekit_room_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL CHECK(user_type IN ('user', 'bar', 'studio')),
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2),
    features TEXT NOT NULL, -- JSON string of features
    max_bands INTEGER DEFAULT 1, -- Maximum number of bands user can create/join
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(255) NOT NULL REFERENCES subscription_plans(id),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'yearly')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'expired', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method VARCHAR(50) DEFAULT 'eth_wallet',
    stripe_subscription_id VARCHAR(255),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Payments
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL CHECK(payment_method IN ('stripe', 'eth_wallet', 'bank_transfer', 'paypal', 'gift_card', 'free')),
    stripe_payment_intent_id VARCHAR(255),
    eth_transaction_hash VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'succeeded', 'failed', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_recovery_email ON users(recovery_email) WHERE recovery_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_admin_agent ON users(is_admin_agent) WHERE is_admin_agent = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_agent_status ON users(agent_status) WHERE user_type = 'booking_agent';
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

CREATE INDEX IF NOT EXISTS idx_bands_user_id ON bands(user_id);
CREATE INDEX IF NOT EXISTS idx_bands_booking_manager_id ON bands(booking_manager_id);
CREATE INDEX IF NOT EXISTS idx_bands_band_email ON bands(band_email);
CREATE INDEX IF NOT EXISTS idx_venues_user_id ON venues(user_id);
CREATE INDEX IF NOT EXISTS idx_venues_city_state ON venues(city, state);

CREATE INDEX IF NOT EXISTS idx_tour_dates_band_id ON tour_dates(band_id);
CREATE INDEX IF NOT EXISTS idx_tour_dates_venue_id ON tour_dates(venue_id);
CREATE INDEX IF NOT EXISTS idx_tour_dates_booking_agent_id ON tour_dates(booking_agent_id);
CREATE INDEX IF NOT EXISTS idx_tour_dates_date ON tour_dates(date);
CREATE INDEX IF NOT EXISTS idx_tour_dates_status ON tour_dates(status);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

CREATE INDEX IF NOT EXISTS idx_band_members_band_id ON band_members(band_id);
CREATE INDEX IF NOT EXISTS idx_band_members_user_id ON band_members(user_id);

CREATE INDEX IF NOT EXISTS idx_studio_sessions_studio_id ON studio_sessions(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_sessions_band_id ON studio_sessions(band_id);
CREATE INDEX IF NOT EXISTS idx_studio_sessions_date ON studio_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_studio_sessions_status ON studio_sessions(status);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_user_type ON subscription_plans(user_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Band media files (promo materials, videos, etc.)
CREATE TABLE IF NOT EXISTS band_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    media_type VARCHAR(50) NOT NULL CHECK(media_type IN ('image', 'video', 'audio', 'document')),
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

