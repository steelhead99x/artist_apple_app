-- Migration to add recovery_email field to users table
-- Run this on your DigitalOcean PostgreSQL database

-- Add recovery_email column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_recovery_email ON users(recovery_email) WHERE recovery_email IS NOT NULL;




