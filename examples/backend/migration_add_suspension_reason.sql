-- Migration: Add suspension_reason to users table
-- This allows us to differentiate between admin deletions and payment suspensions

BEGIN;

-- Add suspension_reason column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(50);

-- Add comment explaining the field
COMMENT ON COLUMN users.suspension_reason IS 
'Reason for account suspension: 
- NULL: Not suspended
- admin_deleted: Manually deleted by booking agent/admin
- payment_overdue: Suspended due to unpaid balance
- violation: Terms of service violation
- fraud: Suspected fraudulent activity';

-- Update existing deleted users to have admin_deleted reason
UPDATE users 
SET suspension_reason = 'admin_deleted'
WHERE deleted_at IS NOT NULL OR status = 'deleted';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_suspension_reason 
ON users(suspension_reason) 
WHERE suspension_reason IS NOT NULL;

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Added suspension_reason column to users table';
  RAISE NOTICE 'Updated existing deleted users to have admin_deleted reason';
  RAISE NOTICE '';
  RAISE NOTICE 'Valid suspension reasons:';
  RAISE NOTICE '  - admin_deleted: Account deleted by booking agent';
  RAISE NOTICE '  - payment_overdue: Suspended for unpaid balance';
  RAISE NOTICE '  - violation: Terms of service violation';
  RAISE NOTICE '  - fraud: Suspected fraud';
END $$;

