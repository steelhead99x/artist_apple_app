-- Migration: Message Encryption at Rest
-- Description: Add server-side encryption for stored messages (defense in depth)
-- Note: This is IN ADDITION to client-side E2EE encryption

-- Add server-side encryption fields
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS server_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Create index for encrypted messages
CREATE INDEX IF NOT EXISTS idx_messages_server_encrypted
ON messages(server_encrypted)
WHERE server_encrypted = true;

-- Add comments
COMMENT ON COLUMN messages.server_encrypted IS 'Whether this message has additional server-side encryption (defense in depth)';
COMMENT ON COLUMN messages.encryption_version IS 'Encryption algorithm version used (allows for key rotation)';

-- Migration complete
SELECT 'Message encryption at rest migration completed successfully' AS status;
