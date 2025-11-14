-- Migration: Add metadata/tags support to streaming_content
-- This allows creators to tag their content with metadata for future targeting

-- Add metadata column as JSONB for flexible tag storage
ALTER TABLE streaming_content 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add creator_id column (alias for user_id for clarity, or we can just use user_id)
-- Actually, user_id already exists, so we'll use that as creator_id

-- Create index on metadata for faster queries
CREATE INDEX IF NOT EXISTS idx_streaming_content_metadata ON streaming_content USING GIN(metadata);

-- Add index for metadata tag searches
CREATE INDEX IF NOT EXISTS idx_streaming_content_metadata_tags ON streaming_content USING GIN((metadata->'tags'));

