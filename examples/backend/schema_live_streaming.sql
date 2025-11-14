-- Live Streaming Schema for PostgreSQL
-- This schema adds live streaming capabilities to the existing ArtistSpace platform

-- Live Streams table
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stream_key VARCHAR(255) UNIQUE NOT NULL,
    playback_id VARCHAR(255), -- Mux playback ID for recording
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'live', 'ended', 'archived')),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    max_viewers INTEGER DEFAULT 100,
    current_viewers INTEGER DEFAULT 0,
    stream_url VARCHAR(500), -- RTMP ingest URL
    playback_url VARCHAR(500), -- HLS playback URL
    thumbnail_url VARCHAR(500),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stream Analytics table
CREATE TABLE IF NOT EXISTS stream_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    viewer_count INTEGER NOT NULL DEFAULT 0,
    peak_viewers INTEGER NOT NULL DEFAULT 0,
    avg_viewers DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_watch_time INTEGER NOT NULL DEFAULT 0, -- in seconds
    engagement_score DECIMAL(5,2) DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stream Comments/Chat table
CREATE TABLE IF NOT EXISTS stream_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stream Recordings table (for VOD)
CREATE TABLE IF NOT EXISTS stream_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    recording_url VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration_seconds INTEGER NOT NULL,
    quality VARCHAR(50) DEFAULT '720p',
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Streaming Limits table (based on subscription)
CREATE TABLE IF NOT EXISTS user_streaming_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_concurrent_streams INTEGER NOT NULL DEFAULT 0,
    can_record_streams BOOLEAN NOT NULL DEFAULT FALSE,
    can_use_overlays BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Stream Overlays table (for custom branding)
CREATE TABLE IF NOT EXISTS stream_overlays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    overlay_type VARCHAR(50) NOT NULL CHECK(overlay_type IN ('logo', 'text', 'image', 'webcam')),
    position VARCHAR(50) NOT NULL CHECK(position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center')),
    content TEXT, -- JSON for overlay configuration
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stream Followers table (for notifications)
CREATE TABLE IF NOT EXISTS stream_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streamer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, streamer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_streams_user_id ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_public ON live_streams(is_public);
CREATE INDEX IF NOT EXISTS idx_stream_analytics_stream_id ON stream_analytics(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_comments_stream_id ON stream_comments(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_recordings_stream_id ON stream_recordings(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_followers_user_id ON stream_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_followers_streamer_id ON stream_followers(streamer_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_live_streams_updated_at BEFORE UPDATE ON live_streams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streaming_limits_updated_at BEFORE UPDATE ON user_streaming_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
