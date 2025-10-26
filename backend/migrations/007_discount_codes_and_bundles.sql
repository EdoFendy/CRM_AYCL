-- Migration 007: Discount Codes and Bundles System

-- Discount Codes Table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  applicable_products JSONB DEFAULT '[]'::jsonb,
  applicable_to TEXT DEFAULT 'all' CHECK (applicable_to IN ('all', 'specific')),
  min_purchase_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_expires_at ON discount_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_discount_codes_created_by ON discount_codes(created_by);

-- Bundles Table  
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  includes_upsell BOOLEAN DEFAULT false,
  upsell_details JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_by UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_company_id ON bundles(company_id);
CREATE INDEX IF NOT EXISTS idx_bundles_created_by ON bundles(created_by);
CREATE INDEX IF NOT EXISTS idx_bundles_valid_until ON bundles(valid_until);
CREATE INDEX IF NOT EXISTS idx_bundles_status ON bundles(status);

-- Enhance Contracts Table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cart_reference TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES bundles(id);

CREATE INDEX IF NOT EXISTS idx_contracts_quote_id ON contracts(quote_id);
CREATE INDEX IF NOT EXISTS idx_contracts_bundle_id ON contracts(bundle_id);

-- Enhance Offers Table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS offer_type TEXT DEFAULT 'standard' 
  CHECK (offer_type IN ('standard', 'propsell', 'upsell'));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS parent_offer_id UUID REFERENCES offers(id);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id);

CREATE INDEX IF NOT EXISTS idx_offers_offer_type ON offers(offer_type);
CREATE INDEX IF NOT EXISTS idx_offers_parent_offer_id ON offers(parent_offer_id);

-- Enhance Quotes Table for Drive Test tracking
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'standard'
  CHECK (quote_type IN ('standard', 'drive_test', 'cart'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_quotes_quote_type ON quotes(quote_type);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);

-- Function to auto-expire discount codes
CREATE OR REPLACE FUNCTION expire_discount_codes()
RETURNS void AS $$
BEGIN
  UPDATE discount_codes
  SET is_active = false
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire bundles
CREATE OR REPLACE FUNCTION expire_bundles()
RETURNS void AS $$
BEGIN
  UPDATE bundles
  SET status = 'expired'
  WHERE valid_until < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire drive tests
CREATE OR REPLACE FUNCTION expire_drive_tests()
RETURNS void AS $$
BEGIN
  UPDATE quotes
  SET is_active = false
  WHERE quote_type = 'drive_test' 
    AND expires_at < NOW() 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE discount_codes IS 'Discount codes with expiration and usage limits';
COMMENT ON TABLE bundles IS 'Product bundles with discounts and upsell options';
COMMENT ON COLUMN contracts.quote_id IS 'Reference to the quote that generated this contract';
COMMENT ON COLUMN contracts.cart_reference IS 'Reference to the cart/quote that generated multiple contracts';
COMMENT ON COLUMN offers.offer_type IS 'Type of offer: standard, propsell (cross-sell), or upsell';
COMMENT ON COLUMN quotes.quote_type IS 'Type of quote: standard, drive_test, or cart';

