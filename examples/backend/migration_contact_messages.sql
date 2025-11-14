-- Migration: Add contact_messages table for storing booking agent inquiries
-- This table is optional but recommended for audit trail and future messaging features

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  CONSTRAINT fk_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_sender ON contact_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_recipient ON contact_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);

-- Add comment to table
COMMENT ON TABLE contact_messages IS 'Stores messages sent between users and booking agents for audit trail';

