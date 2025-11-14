-- Migration: Add COD (Cash on Delivery) payment method for booking agents
-- Date: 2025-10-26
-- Description: Adds 'cod' as a valid payment method for gift card purchases by booking agents

-- Update gift_cards table constraint to include 'cod'
ALTER TABLE gift_cards 
DROP CONSTRAINT IF EXISTS gift_cards_purchase_payment_method_check;

ALTER TABLE gift_cards 
ADD CONSTRAINT gift_cards_purchase_payment_method_check 
CHECK(purchase_payment_method IN ('stripe', 'eth_wallet', 'paypal', 'bank_transfer', 'cod'));

-- Update subscription_payments table constraint to include 'cod'
ALTER TABLE subscription_payments 
DROP CONSTRAINT IF EXISTS subscription_payments_payment_method_check;

ALTER TABLE subscription_payments 
ADD CONSTRAINT subscription_payments_payment_method_check 
CHECK(payment_method IN ('stripe', 'eth_wallet', 'bank_transfer', 'gift_card', 'cod'));

-- Verify the migration
SELECT 'Migration completed successfully - COD payment method added' as status;

