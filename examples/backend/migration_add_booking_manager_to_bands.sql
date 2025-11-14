-- Migration: Add booking_manager_id column to bands table
-- This column links bands to their booking manager/agent

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bands' 
        AND column_name = 'booking_manager_id'
    ) THEN
        ALTER TABLE bands 
        ADD COLUMN booking_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column booking_manager_id added to bands table';
    ELSE
        RAISE NOTICE 'Column booking_manager_id already exists in bands table';
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bands_booking_manager_id ON bands(booking_manager_id);

-- Display result
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bands' 
AND column_name = 'booking_manager_id';


