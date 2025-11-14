-- Migration: Add Contact Fields for Artists and Bands
-- Adds contact_phone, contact_email, contact_address, and recovery_email columns
-- Date: December 2024

-- Add contact fields to users table (for artists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_address TEXT,
ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255);

-- Add contact fields to bands table
ALTER TABLE bands 
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_address TEXT,
ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255);

-- Add comments to explain the new columns
COMMENT ON COLUMN users.contact_phone IS 'Contact phone number for the artist (separate from login credentials)';
COMMENT ON COLUMN users.contact_email IS 'Contact email for the artist (separate from login email)';
COMMENT ON COLUMN users.contact_address IS 'Contact address for the artist';
COMMENT ON COLUMN users.recovery_email IS 'Backup recovery email for account recovery';

COMMENT ON COLUMN bands.contact_phone IS 'Contact phone number for the band';
COMMENT ON COLUMN bands.contact_email IS 'Contact email for the band (separate from admin_email)';
COMMENT ON COLUMN bands.contact_address IS 'Contact address for the band';
COMMENT ON COLUMN bands.recovery_email IS 'Backup recovery email for band account recovery';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_contact_email ON users(contact_email);
CREATE INDEX IF NOT EXISTS idx_users_recovery_email ON users(recovery_email);
CREATE INDEX IF NOT EXISTS idx_bands_contact_email ON bands(contact_email);
CREATE INDEX IF NOT EXISTS idx_bands_recovery_email ON bands(recovery_email);




