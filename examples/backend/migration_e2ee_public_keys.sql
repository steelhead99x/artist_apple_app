-- Migration: Add E2EE Public Keys Storage
-- Description: Stores users' public encryption keys for end-to-end encrypted messaging
-- Security: Public keys are safe to store (only private keys must be kept secret on client devices)

-- Add public key columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS e2ee_public_key TEXT,
ADD COLUMN IF NOT EXISTS e2ee_key_updated_at TIMESTAMP;

-- Create index for faster public key lookups
CREATE INDEX IF NOT EXISTS idx_users_e2ee_public_key
ON users(id)
WHERE e2ee_public_key IS NOT NULL;

-- Add comment explaining the security model
COMMENT ON COLUMN users.e2ee_public_key IS 'Base64-encoded X25519 public key for E2EE messaging. Safe to share publicly.';
COMMENT ON COLUMN users.e2ee_key_updated_at IS 'Last time the user rotated their encryption key pair';

-- Migration complete
SELECT 'E2EE public key storage migration completed successfully' AS status;
