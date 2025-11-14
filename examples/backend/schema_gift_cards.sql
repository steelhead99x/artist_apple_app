-- Gift Card System Schema for Artist Space
-- This extends the main schema with gift card functionality

-- Gift Cards table
CREATE TABLE IF NOT EXISTS gift_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL, -- Human-readable gift card code
    amount DECIMAL(10,2) NOT NULL CHECK(amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'redeemed', 'expired', 'cancelled')),
    
    -- Purchase information
    purchaser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purchaser_type VARCHAR(50) NOT NULL CHECK(purchaser_type IN ('studio', 'booking_agent')),
    purchase_payment_method VARCHAR(50) NOT NULL CHECK(purchase_payment_method IN ('stripe', 'eth_wallet', 'paypal', 'bank_transfer', 'cod')),
    purchase_transaction_id VARCHAR(255),
    
    -- Recipient information (can be null if not yet awarded)
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_type VARCHAR(50) CHECK(recipient_type IN ('user', 'venue', 'studio', 'band')),
    awarded_at TIMESTAMP WITH TIME ZONE,
    awarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Usage information
    redeemed_at TIMESTAMP WITH TIME ZONE,
    redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    remaining_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Expiration: Default 1 year (365 days), but can be customized to expire earlier (1-365 days) when creating
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    
    -- Metadata
    message TEXT, -- Optional message from purchaser to recipient
    notes TEXT, -- Internal notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gift Card Transactions (track all usage)
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK(transaction_type IN ('purchase', 'award', 'redeem', 'refund', 'expire')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    
    -- Transaction details
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    service_type VARCHAR(50) CHECK(service_type IN ('subscription', 'studio_session', 'equipment_rental', 'booking', 'other')),
    service_id UUID, -- Reference to the specific service (subscription, session, etc.)
    
    -- Payment processing
    payment_method VARCHAR(50),
    payment_transaction_id VARCHAR(255),
    
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gift Card Balances (for users who have received gift cards)
CREATE TABLE IF NOT EXISTS gift_card_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchaser_id ON gift_cards(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_id ON gift_cards(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_expires_at ON gift_cards(expires_at);
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchaser_type ON gift_cards(purchaser_type);

CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gift_card_id ON gift_card_transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_user_id ON gift_card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_type ON gift_card_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_service_type ON gift_card_transactions(service_type);

CREATE INDEX IF NOT EXISTS idx_gift_card_balances_user_id ON gift_card_balances(user_id);

-- Function to generate unique gift card codes
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate a code like "GC-ABC123-XYZ789"
        code := 'GC-' || 
                substring(md5(random()::text) from 1 for 6) || '-' ||
                substring(md5(random()::text) from 1 for 6);
        
        -- Check if code already exists
        SELECT COUNT(*) INTO exists_count FROM gift_cards WHERE gift_cards.code = code;
        
        -- If code doesn't exist, return it
        IF exists_count = 0 THEN
            RETURN UPPER(code);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update gift card balance when transactions occur
CREATE OR REPLACE FUNCTION update_gift_card_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the gift card's remaining balance
    IF NEW.transaction_type = 'redeem' THEN
        UPDATE gift_cards 
        SET remaining_balance = remaining_balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.gift_card_id;
        
        -- Update user's gift card balance
        INSERT INTO gift_card_balances (user_id, total_balance, currency)
        VALUES (NEW.user_id, -NEW.amount, NEW.currency)
        ON CONFLICT (user_id, currency) 
        DO UPDATE SET 
            total_balance = gift_card_balances.total_balance - NEW.amount,
            last_updated = NOW();
            
    ELSIF NEW.transaction_type = 'award' THEN
        -- Update user's gift card balance when awarded
        INSERT INTO gift_card_balances (user_id, total_balance, currency)
        VALUES (NEW.user_id, NEW.amount, NEW.currency)
        ON CONFLICT (user_id, currency) 
        DO UPDATE SET 
            total_balance = gift_card_balances.total_balance + NEW.amount,
            last_updated = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update balances
CREATE TRIGGER gift_card_transaction_balance_update
    AFTER INSERT ON gift_card_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_gift_card_balance();

-- Function to check and expire old gift cards
CREATE OR REPLACE FUNCTION expire_gift_cards()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mark expired gift cards
    UPDATE gift_cards 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' 
    AND expires_at < NOW()
    AND remaining_balance > 0;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Create expiration transactions for expired cards
    INSERT INTO gift_card_transactions (
        gift_card_id, transaction_type, amount, currency, description
    )
    SELECT 
        id, 'expire', remaining_balance, currency, 'Gift card expired'
    FROM gift_cards 
    WHERE status = 'expired' 
    AND remaining_balance > 0;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Add gift card support to existing payment methods
-- Update subscription_payments to support gift cards
ALTER TABLE subscription_payments 
ADD COLUMN IF NOT EXISTS gift_card_id UUID REFERENCES gift_cards(id) ON DELETE SET NULL;

-- Update payment method constraints to include gift_card
ALTER TABLE subscription_payments 
DROP CONSTRAINT IF EXISTS subscription_payments_payment_method_check;

ALTER TABLE subscription_payments 
ADD CONSTRAINT subscription_payments_payment_method_check 
CHECK(payment_method IN ('stripe', 'eth_wallet', 'bank_transfer', 'gift_card', 'cod'));

-- Add gift card support to equipment contracts payments
-- (This would need to be added to the equipment contracts schema as well)
