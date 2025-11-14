-- Migration to update gift_card_transactions transaction_type constraint
-- Adds 'admin_edit' to allowed transaction types

-- Drop the existing constraint
ALTER TABLE gift_card_transactions
DROP CONSTRAINT IF EXISTS gift_card_transactions_transaction_type_check;

-- Add the updated constraint with 'admin_edit' included
ALTER TABLE gift_card_transactions
ADD CONSTRAINT gift_card_transactions_transaction_type_check
CHECK(transaction_type IN ('purchase', 'award', 'redeem', 'refund', 'expire', 'admin_edit'));

-- Verify the update
SELECT 'Gift card transaction_type constraint updated successfully!' as message;

