-- Equipment Rental Contract System for PostgreSQL
-- Add these tables to your existing schema

-- Equipment inventory
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL REFERENCES recording_studios(id) ON DELETE CASCADE,
    equipment_type VARCHAR(50) NOT NULL CHECK(equipment_type IN ('instrument', 'digital_interface', 'effects', 'case')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    condition VARCHAR(50) CHECK(condition IN ('excellent', 'good', 'fair', 'needs_repair')),
    daily_rate_7day DECIMAL(10, 2), -- Daily rate for 7-day term
    daily_rate_30day DECIMAL(10, 2), -- Daily rate for 30-day term
    replacement_value DECIMAL(10, 2),
    available BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    specifications JSONB, -- Additional specs (e.g., size, weight, capabilities)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment rental contracts
CREATE TABLE IF NOT EXISTS equipment_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    studio_id UUID NOT NULL REFERENCES recording_studios(id) ON DELETE CASCADE,
    band_member_id UUID NOT NULL REFERENCES band_members(id) ON DELETE CASCADE,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    rental_term VARCHAR(10) NOT NULL CHECK(rental_term IN ('7_day', '30_day')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_signature', 'active', 'completed', 'cancelled', 'overdue')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
    
    -- Contract terms and conditions
    late_fee_daily DECIMAL(10, 2) DEFAULT 50.00,
    damage_policy TEXT,
    liability_terms TEXT,
    shipping_address TEXT,
    return_shipping_address TEXT,
    
    -- Insurance and liability
    insurance_required BOOLEAN DEFAULT FALSE,
    insurance_amount DECIMAL(10, 2),
    
    -- Signatures
    studio_signed BOOLEAN DEFAULT FALSE,
    studio_signed_at TIMESTAMP WITH TIME ZONE,
    studio_signature_ip VARCHAR(50),
    
    member_signed BOOLEAN DEFAULT FALSE,
    member_signed_at TIMESTAMP WITH TIME ZONE,
    member_signature_ip VARCHAR(50),
    
    -- Notes
    studio_notes TEXT,
    member_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract items (individual equipment in a contract)
CREATE TABLE IF NOT EXISTS contract_equipment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES equipment_contracts(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    daily_rate DECIMAL(10, 2) NOT NULL,
    total_days INTEGER NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    
    -- Condition tracking
    condition_at_rental VARCHAR(50),
    condition_at_return VARCHAR(50),
    damage_notes TEXT,
    damage_charge DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Tracking
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract payments
CREATE TABLE IF NOT EXISTS contract_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES equipment_contracts(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL CHECK(payment_type IN ('rental_fee', 'security_deposit', 'damage_charge', 'late_fee', 'refund')),
    payment_method VARCHAR(50) CHECK(payment_method IN ('credit_card', 'eth_wallet', 'bank_transfer', 'cash')),
    transaction_id VARCHAR(255),
    eth_transaction_hash VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipping information
CREATE TABLE IF NOT EXISTS contract_shipping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES equipment_contracts(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK(direction IN ('outbound', 'return')),
    carrier VARCHAR(100),
    tracking_number VARCHAR(255),
    shipping_cost DECIMAL(10, 2),
    insurance_cost DECIMAL(10, 2),
    shipped_date DATE,
    estimated_delivery DATE,
    actual_delivery DATE,
    signed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract documents (PDFs, images)
CREATE TABLE IF NOT EXISTS contract_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES equipment_contracts(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK(document_type IN ('signed_contract', 'damage_photo', 'insurance_cert', 'receipt', 'other')),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_url TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment maintenance log
CREATE TABLE IF NOT EXISTS equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) CHECK(maintenance_type IN ('inspection', 'repair', 'cleaning', 'upgrade', 'calibration')),
    description TEXT NOT NULL,
    cost DECIMAL(10, 2),
    performed_by VARCHAR(255),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipment_studio_id ON equipment(studio_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_available ON equipment(available);

CREATE INDEX IF NOT EXISTS idx_equipment_contracts_studio_id ON equipment_contracts(studio_id);
CREATE INDEX IF NOT EXISTS idx_equipment_contracts_band_member_id ON equipment_contracts(band_member_id);
CREATE INDEX IF NOT EXISTS idx_equipment_contracts_band_id ON equipment_contracts(band_id);
CREATE INDEX IF NOT EXISTS idx_equipment_contracts_status ON equipment_contracts(status);
CREATE INDEX IF NOT EXISTS idx_equipment_contracts_dates ON equipment_contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_equipment_contracts_number ON equipment_contracts(contract_number);

CREATE INDEX IF NOT EXISTS idx_contract_items_contract_id ON contract_equipment_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_items_equipment_id ON contract_equipment_items(equipment_id);

CREATE INDEX IF NOT EXISTS idx_contract_payments_contract_id ON contract_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_status ON contract_payments(status);

CREATE INDEX IF NOT EXISTS idx_contract_shipping_contract_id ON contract_shipping(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_shipping_tracking ON contract_shipping(tracking_number);

CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment_id ON equipment_maintenance(equipment_id);

-- Triggers for updated_at
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_contracts_updated_at BEFORE UPDATE ON equipment_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    SELECT 'EQC-' || year_prefix || '-' || LPAD(NEXTVAL('contract_number_seq')::TEXT, 6, '0')
    INTO new_number;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Sequence for contract numbers
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1;

-- Function to check equipment availability for date range
CREATE OR REPLACE FUNCTION check_equipment_availability(
    p_equipment_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_contract_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO conflict_count
    FROM equipment_contracts ec
    JOIN contract_equipment_items cei ON ec.id = cei.contract_id
    WHERE cei.equipment_id = p_equipment_id
        AND ec.status IN ('pending_signature', 'active')
        AND (p_exclude_contract_id IS NULL OR ec.id != p_exclude_contract_id)
        AND (
            (p_start_date BETWEEN ec.start_date AND ec.end_date) OR
            (p_end_date BETWEEN ec.start_date AND ec.end_date) OR
            (ec.start_date BETWEEN p_start_date AND p_end_date)
        );
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

