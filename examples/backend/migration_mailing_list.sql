-- Add mailing list subscribers table
CREATE TABLE IF NOT EXISTS mailing_list_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    source VARCHAR(100) NOT NULL DEFAULT 'website',
    metadata JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'unsubscribed')),
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mailing_list_subscribers_email ON mailing_list_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_mailing_list_subscribers_status ON mailing_list_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_mailing_list_subscribers_source ON mailing_list_subscribers(source);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_mailing_list_subscribers_updated_at BEFORE UPDATE ON mailing_list_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
