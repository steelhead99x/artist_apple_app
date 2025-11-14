-- Quick Fix for User Deletion Error
-- This adds the missing deleted_at column and updates the status constraint

-- Step 1: Add deleted_at column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted. NULL means user is active. Users can be recovered within 30 days.';

-- Step 2: Update status constraint to include 'suspended'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Step 4: Verify changes were applied
DO $$
BEGIN
  -- Check if deleted_at column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'deleted_at'
  ) THEN
    RAISE NOTICE '✅ deleted_at column exists';
  ELSE
    RAISE WARNING '❌ deleted_at column is missing!';
  END IF;

  -- Check if status constraint allows 'suspended'
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users'
    AND c.conname = 'users_status_check'
    AND pg_get_constraintdef(c.oid) LIKE '%suspended%'
  ) THEN
    RAISE NOTICE '✅ Status constraint includes suspended';
  ELSE
    RAISE WARNING '❌ Status constraint does not include suspended!';
  END IF;
END $$;

-- Step 5: Display table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('deleted_at', 'status')
ORDER BY column_name;

-- Success message
SELECT '✅ User deletion fix applied successfully! You can now delete users from the booking agent dashboard.' as status;

