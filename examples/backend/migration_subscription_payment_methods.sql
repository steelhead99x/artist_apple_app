-- Migration to fix subscription payment method constraint
-- This adds support for 'paypal', 'gift_card', and 'free' payment methods

-- Drop the existing constraint
ALTER TABLE subscription_payments 
DROP CONSTRAINT IF EXISTS subscription_payments_payment_method_check;

-- Add the new constraint with all payment methods
ALTER TABLE subscription_payments 
ADD CONSTRAINT subscription_payments_payment_method_check 
CHECK (payment_method IN ('stripe', 'eth_wallet', 'bank_transfer', 'paypal', 'gift_card', 'free'));

