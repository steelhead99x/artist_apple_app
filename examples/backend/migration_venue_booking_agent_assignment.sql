-- Migration: Add booking_agent_id to venues table
-- This allows venues to be assigned to booking agents upon approval
-- Date: Current

-- Add booking_agent_id column to venues table if it doesn't exist
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS booking_agent_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_venues_booking_agent_id ON venues(booking_agent_id);

-- Add comment to column
COMMENT ON COLUMN venues.booking_agent_id IS 'The booking agent who approved this venue and is responsible for managing it';

