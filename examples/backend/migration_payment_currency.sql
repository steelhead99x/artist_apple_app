-- Migration: Add payment currency tracking to tours and KPIs
-- Date: October 26, 2025

-- Add payment_currency to tour_dates table
ALTER TABLE tour_dates 
ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(10) DEFAULT 'USD' CHECK(payment_currency IN ('USD', 'USDC', 'ETH'));

-- Add sales_currency to tour_kpis table  
ALTER TABLE tour_kpis
ADD COLUMN IF NOT EXISTS sales_currency VARCHAR(10) DEFAULT 'USD' CHECK(sales_currency IN ('USD', 'USDC', 'ETH'));

-- Add ETH equivalent columns for conversion tracking
ALTER TABLE tour_dates
ADD COLUMN IF NOT EXISTS payment_amount_eth DECIMAL(18, 8);

ALTER TABLE tour_kpis
ADD COLUMN IF NOT EXISTS bar_sales_eth DECIMAL(18, 8);

-- Add exchange rate tracking for audit purposes
ALTER TABLE tour_dates
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 6);

ALTER TABLE tour_kpis
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 6);

-- Create index for currency queries
CREATE INDEX IF NOT EXISTS idx_tour_dates_payment_currency ON tour_dates(payment_currency);
CREATE INDEX IF NOT EXISTS idx_tour_kpis_sales_currency ON tour_kpis(sales_currency);

COMMENT ON COLUMN tour_dates.payment_currency IS 'Currency used for payment: USD (cash), USDC (stablecoin), or ETH';
COMMENT ON COLUMN tour_dates.payment_amount_eth IS 'Payment amount converted to ETH for blockchain settlement';
COMMENT ON COLUMN tour_dates.exchange_rate IS 'Exchange rate used for ETH conversion at time of payment';

COMMENT ON COLUMN tour_kpis.sales_currency IS 'Currency used for bar sales: USD (cash), USDC (stablecoin), or ETH';
COMMENT ON COLUMN tour_kpis.bar_sales_eth IS 'Bar sales converted to ETH for blockchain settlement';
COMMENT ON COLUMN tour_kpis.exchange_rate IS 'Exchange rate used for ETH conversion at time of recording';

