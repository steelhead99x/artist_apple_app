-- Migration: Add 'admin_created' payment method for admin-created gift cards
-- Date: 2025-10-27
-- Description: Adds 'admin_created' as a valid payment method for gift cards created by admin booking agents

-- Update gift_cards table constraint to include 'admin_created'
ALTER TABLE gift_cards 
DROP CONSTRAINT IF EXISTS gift_cards_purchase_payment_method_check;

ALTER TABLE gift_cards 
ADD CONSTRAINT gift_cards_purchase_payment_method_check 
CHECK(purchase_payment_method IN ('stripe', 'eth_wallet', 'paypal', 'bank_transfer', 'cod', 'venmo', 'admin_created'));

-- Verify the migration
SELECT 'Migration completed successfully - admin_created payment method added' as status;

