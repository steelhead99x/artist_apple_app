-- Migration: Add Real Payment Processing Support
-- Date: 2025-10-26
-- Description: Adds 'venmo' payment method and updates payment tracking fields

-- Update gift_cards table to include venmo
ALTER TABLE gift_cards 
DROP CONSTRAINT IF EXISTS gift_cards_purchase_payment_method_check;

ALTER TABLE gift_cards 
ADD CONSTRAINT gift_cards_purchase_payment_method_check 
CHECK(purchase_payment_method IN ('stripe', 'eth_wallet', 'paypal', 'bank_transfer', 'cod', 'venmo'));

-- Add payment transaction tracking fields to gift_cards
ALTER TABLE gift_cards
ADD COLUMN IF NOT EXISTS payment_provider_response JSONB;

ALTER TABLE gift_cards
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE;

-- Update subscription_payments to include venmo
ALTER TABLE subscription_payments 
DROP CONSTRAINT IF EXISTS subscription_payments_payment_method_check;

ALTER TABLE subscription_payments 
ADD CONSTRAINT subscription_payments_payment_method_check 
CHECK(payment_method IN ('stripe', 'eth_wallet', 'bank_transfer', 'gift_card', 'cod', 'paypal', 'venmo', 'free'));

-- Create payment_intents table for tracking Stripe payment intents
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK(status IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded')),
    
    -- Link to resource being paid for
    resource_type VARCHAR(50) NOT NULL CHECK(resource_type IN ('gift_card', 'subscription', 'equipment_rental', 'booking')),
    resource_id UUID,
    
    -- User information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Client secret for frontend
    client_secret TEXT,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create paypal_orders table for tracking PayPal orders
CREATE TABLE IF NOT EXISTS paypal_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK(status IN ('CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED', 'PAYER_ACTION_REQUIRED')),
    
    -- Link to resource being paid for
    resource_type VARCHAR(50) NOT NULL CHECK(resource_type IN ('gift_card', 'subscription', 'equipment_rental', 'booking')),
    resource_id UUID,
    
    -- User information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Approval URL for frontend redirect
    approval_url TEXT,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create braintree_transactions table for tracking Venmo/Braintree transactions
CREATE TABLE IF NOT EXISTS braintree_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    braintree_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL CHECK(payment_method IN ('venmo', 'paypal', 'credit_card', 'debit_card')),
    status VARCHAR(50) NOT NULL,
    
    -- Link to resource being paid for
    resource_type VARCHAR(50) NOT NULL CHECK(resource_type IN ('gift_card', 'subscription', 'equipment_rental', 'booking')),
    resource_id UUID,
    
    -- User information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create crypto_transactions table for tracking crypto payments
CREATE TABLE IF NOT EXISTS crypto_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(255) UNIQUE NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    amount_eth DECIMAL(20,8) NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    eth_usd_rate DECIMAL(10,2) NOT NULL,
    block_number INTEGER,
    confirmations INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL CHECK(status IN ('pending', 'confirmed', 'failed')),
    
    -- Link to resource being paid for
    resource_type VARCHAR(50) NOT NULL CHECK(resource_type IN ('gift_card', 'subscription', 'equipment_rental', 'booking')),
    resource_id UUID,
    
    -- User information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Verification timestamp
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_resource ON payment_intents(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_paypal_orders_user_id ON paypal_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_paypal_orders_resource ON paypal_orders(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_paypal_orders_status ON paypal_orders(status);
CREATE INDEX IF NOT EXISTS idx_paypal_orders_paypal_id ON paypal_orders(paypal_order_id);

CREATE INDEX IF NOT EXISTS idx_braintree_transactions_user_id ON braintree_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_braintree_transactions_resource ON braintree_transactions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_braintree_transactions_status ON braintree_transactions(status);
CREATE INDEX IF NOT EXISTS idx_braintree_transactions_braintree_id ON braintree_transactions(braintree_transaction_id);

CREATE INDEX IF NOT EXISTS idx_crypto_transactions_user_id ON crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_resource ON crypto_transactions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_status ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_hash ON crypto_transactions(transaction_hash);

-- Verify the migration
SELECT 'Migration completed successfully - Real payment support added' as status;

