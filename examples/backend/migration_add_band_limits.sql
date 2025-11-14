-- Migration: Add band limits to subscription plans and user features
-- This enables subscription-based band creation limits

-- Add max_bands column to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_bands INTEGER DEFAULT 1;

-- Update existing plans with band limits
UPDATE subscription_plans SET max_bands = 1 WHERE id = 'artist_free';
UPDATE subscription_plans SET max_bands = 2 WHERE id = 'artist_premium';
UPDATE subscription_plans SET max_bands = 2 WHERE id = 'artist_streaming';

-- Venue and studio plans (not band-related, set to 0)
UPDATE subscription_plans SET max_bands = 0 WHERE user_type IN ('bar', 'studio');

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user_type ON subscription_plans(user_type);

-- Add unique constraint to prevent users from being in same band multiple times
-- (already exists via band_members unique constraint, but good to verify)
CREATE UNIQUE INDEX IF NOT EXISTS idx_band_members_unique 
ON band_members(band_id, user_id) WHERE status = 'active';

-- Display results
SELECT id, name, user_type, max_bands, price_monthly 
FROM subscription_plans 
ORDER BY user_type, price_monthly;

