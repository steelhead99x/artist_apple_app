-- Migration: Streaming Content Table with Metadata Support
-- This table stores streaming media (videos, audio) uploaded to Mux
-- and thumbnails stored securely with optional public links

CREATE TABLE IF NOT EXISTS streaming_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL CHECK(content_type IN ('video', 'audio', 'thumbnail')),
    
    -- Mux asset fields (for video/audio)
    mux_asset_id VARCHAR(255),
    mux_playback_id VARCHAR(255),
    mux_playback_url TEXT,
    mux_upload_id VARCHAR(255),
    mux_status VARCHAR(50) DEFAULT 'pending',
    
    -- Thumbnail fields (for images stored securely)
    thumbnail_filename VARCHAR(255),
    thumbnail_path VARCHAR(500),
    thumbnail_public_link VARCHAR(500), -- Generated secure link if artist wants to share
    thumbnail_public_enabled BOOLEAN DEFAULT FALSE,
    
    -- Metadata and tags (for creator filtering and targeting)
    metadata JSONB DEFAULT '{}',
    
    -- File metadata
    file_size BIGINT,
    mime_type VARCHAR(100),
    duration_seconds INTEGER,
    
    -- Security and sharing
    is_public BOOLEAN DEFAULT FALSE,
    public_share_token UUID DEFAULT uuid_generate_v4(), -- Unique token for public sharing
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_streaming_content_user_id ON streaming_content(user_id);
CREATE INDEX IF NOT EXISTS idx_streaming_content_content_type ON streaming_content(content_type);
CREATE INDEX IF NOT EXISTS idx_streaming_content_mux_asset_id ON streaming_content(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_streaming_content_public_token ON streaming_content(public_share_token);

-- Metadata indexes for tag searches
CREATE INDEX IF NOT EXISTS idx_streaming_content_metadata ON streaming_content USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_streaming_content_metadata_tags ON streaming_content USING GIN((metadata->'tags'));

-- Update timestamp trigger
CREATE TRIGGER update_streaming_content_updated_at 
    BEFORE UPDATE ON streaming_content
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- If table already exists, add metadata column if missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'streaming_content') THEN
        -- Add metadata column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'streaming_content' AND column_name = 'metadata') THEN
            ALTER TABLE streaming_content ADD COLUMN metadata JSONB DEFAULT '{}';
            
            -- Add metadata indexes if they don't exist
            CREATE INDEX IF NOT EXISTS idx_streaming_content_metadata ON streaming_content USING GIN(metadata);
            CREATE INDEX IF NOT EXISTS idx_streaming_content_metadata_tags ON streaming_content USING GIN((metadata->'tags'));
            
            RAISE NOTICE 'Added metadata column and indexes to existing streaming_content table';
        END IF;
    END IF;
END $$;




