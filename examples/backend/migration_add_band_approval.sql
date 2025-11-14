-- Migration: Add approval status to bands table
-- Allows booking agents to approve/reject band creation requests and see duplicate warnings

-- Add status column
ALTER TABLE bands 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected'));

-- Add admin notes column for warnings
ALTER TABLE bands 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_bands_status ON bands(status);

-- Update existing bands to approved status
UPDATE bands SET status = 'approved' WHERE status IS NULL;

COMMENT ON COLUMN bands.status IS 'Approval status: pending (awaiting booking agent), approved (active), rejected (denied)';
COMMENT ON COLUMN bands.admin_notes IS 'Internal notes for booking agent, such as duplicate name warnings';

-- Display results
SELECT id, band_name, status, admin_notes, created_at 
FROM bands 
WHERE status = 'pending' OR admin_notes IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

