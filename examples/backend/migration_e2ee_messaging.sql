-- Migration: Create E2EE messaging system
-- This enables end-to-end encrypted messaging between users, venues, and booking agents
-- Date: Current

-- Messages table for storing encrypted messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted message content
    encrypted_content TEXT NOT NULL,
    iv TEXT NOT NULL, -- Initialization vector for AES-GCM
    
    -- Message metadata
    message_type VARCHAR(20) DEFAULT 'text' CHECK(message_type IN ('text', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = FALSE;

-- Create composite index for conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(
    LEAST(sender_id, recipient_id),
    GREATEST(sender_id, recipient_id),
    created_at DESC
);

-- Add comment to table
COMMENT ON TABLE messages IS 'Stores end-to-end encrypted messages between users, venues, and booking agents';

