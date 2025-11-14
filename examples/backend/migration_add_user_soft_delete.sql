-- Migration: Add soft delete support for users
-- Allows users to be "deleted" but recoverable for 30 days

-- Add deleted_at column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted. NULL means user is active. Users can be recovered within 30 days.';

-- Create index for finding deleted users
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Display results
SELECT id, name, email, user_type, status, deleted_at,
       CASE 
         WHEN deleted_at IS NULL THEN 'Active'
         WHEN deleted_at > NOW() - INTERVAL '30 days' THEN 'Recoverable'
         ELSE 'Permanently Deleted'
       END as recovery_status
FROM users 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 10;

-- If no deleted users exist yet, show message
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE deleted_at IS NOT NULL LIMIT 1) THEN
    RAISE NOTICE 'No deleted users yet. Users marked for deletion will be recoverable for 30 days.';
  END IF;
END $$;

