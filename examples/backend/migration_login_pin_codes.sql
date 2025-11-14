-- Migration for Login PIN Codes
-- Allows users to login with a 9-digit PIN code sent to their email

CREATE TABLE IF NOT EXISTS login_pin_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    pin_code VARCHAR(9) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email and pin_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_pin_codes_email ON login_pin_codes(email);
CREATE INDEX IF NOT EXISTS idx_login_pin_codes_pin ON login_pin_codes(pin_code);
CREATE INDEX IF NOT EXISTS idx_login_pin_codes_expires ON login_pin_codes(expires_at);

-- Create index for unused pins (expires_at check done in queries, not in index)
CREATE INDEX IF NOT EXISTS idx_login_pin_codes_active ON login_pin_codes(email, pin_code, expires_at, used) 
WHERE used = FALSE;

