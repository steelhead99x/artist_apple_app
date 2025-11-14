-- Migration: Update gift card recipient_type constraint to support venue, studio, and band
-- Date: 2025-10-27
-- Description: Updates the recipient_type constraint to accept 'venue', 'studio', and 'band' instead of just 'user' and 'bar'

-- Drop the existing constraint
ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_recipient_type_check;

-- Add the new constraint with updated values
ALTER TABLE gift_cards 
ADD CONSTRAINT gift_cards_recipient_type_check 
CHECK (recipient_type IN ('user', 'venue', 'studio', 'band'));

-- Note: This migration is safe to run even if constraint doesn't exist (IF EXISTS clause)
-- All existing data will remain valid as long as it matches one of the new allowed values

SELECT 'Gift card recipient_type constraint updated successfully!' as message;

