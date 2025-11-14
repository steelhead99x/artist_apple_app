-- Migration: Enable Studio Free Plan
-- This enables the studio_free subscription plan so users can create recording studios

-- Update studio_free plan to be active
UPDATE subscription_plans 
SET is_active = 1, updated_at = NOW()
WHERE id = 'studio_free';

-- Verify the update
SELECT id, name, user_type, price_monthly, is_active 
FROM subscription_plans 
WHERE id = 'studio_free';

