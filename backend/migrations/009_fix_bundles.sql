-- Fix bundles table - Add missing columns from migration 009

-- Add missing columns
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS seller_user_id UUID REFERENCES users(id);
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS woo_product_id INTEGER;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS woo_payment_url TEXT;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS checkout_token TEXT;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS upsell_name TEXT;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS upsell_description TEXT;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS upsell_price DECIMAL(10,2);

-- Update discount_type constraint to allow 'none'
ALTER TABLE bundles DROP CONSTRAINT IF EXISTS bundles_discount_type_check;
ALTER TABLE bundles ADD CONSTRAINT bundles_discount_type_check 
  CHECK (discount_type IN ('percentage', 'fixed', 'none'));

-- Make checkout_token unique
ALTER TABLE bundles DROP CONSTRAINT IF EXISTS bundles_checkout_token_key;
ALTER TABLE bundles ADD CONSTRAINT bundles_checkout_token_key UNIQUE (checkout_token);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bundles_contact_id ON bundles(contact_id);
CREATE INDEX IF NOT EXISTS idx_bundles_seller_user_id ON bundles(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_bundles_checkout_token ON bundles(checkout_token);

