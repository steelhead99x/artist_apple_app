-- Migration: Add custom band limits to users table
-- Allows booking agents to set custom band limits for enterprise users

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS custom_band_limit INTEGER DEFAULT NULL;

COMMENT ON COLUMN users.custom_band_limit IS 'Custom band limit set by booking agent. NULL means use subscription plan default. Used for enterprise/custom pricing tiers.';

-- Display results
SELECT id, name, email, user_type, custom_band_limit 
FROM users 
WHERE custom_band_limit IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- If no custom limits exist yet, show message
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE custom_band_limit IS NOT NULL LIMIT 1) THEN
    RAISE NOTICE 'No users have custom band limits set yet. Booking agents can now set these via the admin dashboard.';
  END IF;
END $$;

