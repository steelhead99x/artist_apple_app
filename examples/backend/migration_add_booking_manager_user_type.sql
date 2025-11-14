-- Migration to add 'booking_manager' user type
-- This should be run BEFORE the user_management_enhancements migration

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Add the new constraint with 'booking_manager' included
ALTER TABLE users ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('booking_agent', 'booking_manager', 'band', 'bar', 'studio', 'user'));

-- Optional: Add comment for clarity
COMMENT ON COLUMN users.user_type IS 'User type: booking_agent (full admin), booking_manager (manages assigned users), band, bar, studio, or user (artist/musician)';

