-- Migration: Create artist_w2_documents table for secure W-2 storage
-- This table stores W-2 forms uploaded by artists, accessible only by their assigned booking agent

-- Enable pgcrypto extension for encryption (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create artist_w2_documents table
CREATE TABLE IF NOT EXISTS artist_w2_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_data BYTEA NOT NULL, -- Encrypted file data
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    encryption_key_hash VARCHAR(255), -- Hash of encryption key for verification
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    artist_can_access BOOLEAN NOT NULL DEFAULT FALSE, -- Once uploaded, artist cannot access
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, year) -- One W-2 per year per artist
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artist_w2_documents_user_id ON artist_w2_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_w2_documents_booking_agent_id ON artist_w2_documents(booking_agent_id);
CREATE INDEX IF NOT EXISTS idx_artist_w2_documents_year ON artist_w2_documents(year);

-- Add comments
COMMENT ON TABLE artist_w2_documents IS 'Stores W-2 forms uploaded by artists, accessible only by assigned booking agents with bank-level security';
COMMENT ON COLUMN artist_w2_documents.artist_can_access IS 'Once uploaded, set to FALSE to prevent artist from accessing their W-2 for security';
COMMENT ON COLUMN artist_w2_documents.file_data IS 'Encrypted file data stored in BYTEA format';
COMMENT ON COLUMN artist_w2_documents.encryption_key_hash IS 'Hash of encryption key for security verification';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Artist W-2 documents table created successfully!';
  RAISE NOTICE 'Table: artist_w2_documents';
END $$;




