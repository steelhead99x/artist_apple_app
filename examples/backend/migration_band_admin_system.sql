-- Migration: Band Admin System
-- Adds unique band emails, admin email management, and permission system for bands
-- Date: October 26, 2025

-- Add new columns to bands table
ALTER TABLE bands 
ADD COLUMN IF NOT EXISTS band_email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);

-- Add comment to explain the new columns
COMMENT ON COLUMN bands.band_email IS 'Unique email address for the band (e.g., bandname_123@artist-space.com)';
COMMENT ON COLUMN bands.admin_email IS 'External admin email address who receives notifications about band activities';

-- Add permissions column to band_members table
ALTER TABLE band_members
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_modify_profile": false, "can_receive_band_emails": false}'::jsonb;

-- Add comment to explain permissions
COMMENT ON COLUMN band_members.permissions IS 'Band member permissions: can_modify_profile, can_receive_band_emails';

-- Create an index on band_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_bands_band_email ON bands(band_email);
CREATE INDEX IF NOT EXISTS idx_bands_admin_email ON bands(admin_email);

-- Create a function to generate unique band emails
CREATE OR REPLACE FUNCTION generate_band_email(p_band_name VARCHAR(255)) 
RETURNS VARCHAR(255) AS $$
DECLARE
    sanitized_name VARCHAR(255);
    random_suffix VARCHAR(3);
    new_email VARCHAR(255);
    email_exists BOOLEAN;
BEGIN
    -- Sanitize band name: lowercase, remove special chars, replace spaces with underscores
    sanitized_name := LOWER(REGEXP_REPLACE(p_band_name, '[^a-zA-Z0-9\s]', '', 'g'));
    sanitized_name := REGEXP_REPLACE(sanitized_name, '\s+', '_', 'g');
    
    -- Limit length to 50 characters
    IF LENGTH(sanitized_name) > 50 THEN
        sanitized_name := SUBSTRING(sanitized_name, 1, 50);
    END IF;
    
    -- Try up to 100 times to generate a unique email
    FOR i IN 1..100 LOOP
        -- Generate random 3-digit number
        random_suffix := LPAD(FLOOR(RANDOM() * 1000)::VARCHAR, 3, '0');
        new_email := sanitized_name || '_' || random_suffix || '@artist-space.com';
        
        -- Check if email already exists
        SELECT EXISTS(SELECT 1 FROM bands WHERE band_email = new_email) INTO email_exists;
        
        IF NOT email_exists THEN
            RETURN new_email;
        END IF;
    END LOOP;
    
    -- If we couldn't generate a unique email after 100 tries, use UUID
    RETURN sanitized_name || '_' || SUBSTRING(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 1, 6) || '@artist-space.com';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically generate band_email if not provided
CREATE OR REPLACE FUNCTION set_band_email() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.band_email IS NULL THEN
        NEW.band_email := generate_band_email(NEW.band_name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_set_band_email ON bands;
CREATE TRIGGER trigger_set_band_email
    BEFORE INSERT ON bands
    FOR EACH ROW
    EXECUTE FUNCTION set_band_email();

-- Update existing bands to have band emails (only if they don't have one)
DO $$
DECLARE
    band_record RECORD;
BEGIN
    FOR band_record IN SELECT id, band_name FROM bands WHERE band_email IS NULL
    LOOP
        UPDATE bands 
        SET band_email = generate_band_email(band_record.band_name)
        WHERE id = band_record.id;
    END LOOP;
END $$;

-- Create a table to log band admin notifications
CREATE TABLE IF NOT EXISTS band_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK(notification_type IN ('new_member', 'member_left', 'profile_updated', 'payment_received')),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK(status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_band_notifications_band_id ON band_notifications(band_id);
CREATE INDEX IF NOT EXISTS idx_band_notifications_type ON band_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_band_notifications_sent_at ON band_notifications(sent_at);

COMMENT ON TABLE band_notifications IS 'Logs all notifications sent to band admins';
COMMENT ON COLUMN band_notifications.notification_type IS 'Type of notification: new_member, member_left, profile_updated, payment_received';
COMMENT ON COLUMN band_notifications.metadata IS 'Additional data about the notification (e.g., member name, user_id)';

-- Grant permissions (adjust as needed for your database user)
-- GRANT ALL PRIVILEGES ON TABLE bands TO artist_user;
-- GRANT ALL PRIVILEGES ON TABLE band_members TO artist_user;
-- GRANT ALL PRIVILEGES ON TABLE band_notifications TO artist_user;

