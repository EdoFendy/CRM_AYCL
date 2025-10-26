-- Migration 009: Bundles System
-- Sistema completo per gestione bundle con prodotti WooCommerce, sconti e checkout

-- Tabella principale bundles
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  seller_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Discount configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'none')),
  discount_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Pricing
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  
  -- UpSell configuration
  includes_upsell BOOLEAN DEFAULT false,
  upsell_name TEXT,
  upsell_description TEXT,
  upsell_price DECIMAL(10, 2),
  
  -- Status and validity
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sent', 'accepted', 'expired', 'cancelled')),
  valid_until TIMESTAMPTZ,
  
  -- WooCommerce integration
  woo_product_id INTEGER,
  woo_payment_url TEXT,
  
  -- Checkout tracking
  checkout_url TEXT,
  checkout_token TEXT UNIQUE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabella prodotti nel bundle
CREATE TABLE IF NOT EXISTS bundle_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  
  -- Product info
  woo_product_id INTEGER,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_description TEXT,
  
  -- Pricing
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  
  -- Product-specific discount (optional)
  product_discount_type TEXT CHECK (product_discount_type IN ('percentage', 'fixed', 'none')),
  product_discount_value DECIMAL(10, 2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_bundles_company_id ON bundles(company_id);
CREATE INDEX idx_bundles_contact_id ON bundles(contact_id);
CREATE INDEX idx_bundles_seller_user_id ON bundles(seller_user_id);
CREATE INDEX idx_bundles_status ON bundles(status);
CREATE INDEX idx_bundles_valid_until ON bundles(valid_until);
CREATE INDEX idx_bundles_checkout_token ON bundles(checkout_token);
CREATE INDEX idx_bundles_created_at ON bundles(created_at DESC);

CREATE INDEX idx_bundle_products_bundle_id ON bundle_products(bundle_id);
CREATE INDEX idx_bundle_products_woo_product_id ON bundle_products(woo_product_id);

-- Funzione per calcolare totali bundle
CREATE OR REPLACE FUNCTION calculate_bundle_totals(bundle_id_param UUID)
RETURNS void AS $$
DECLARE
  bundle_subtotal DECIMAL(10, 2);
  bundle_discount_type TEXT;
  bundle_discount_value DECIMAL(10, 2);
  bundle_discount_amount DECIMAL(10, 2);
  bundle_total DECIMAL(10, 2);
BEGIN
  -- Calcola subtotale dalla somma dei prodotti
  SELECT COALESCE(SUM(total_price), 0) INTO bundle_subtotal
  FROM bundle_products
  WHERE bundle_id = bundle_id_param;
  
  -- Ottieni configurazione sconto
  SELECT discount_type, discount_value INTO bundle_discount_type, bundle_discount_value
  FROM bundles
  WHERE id = bundle_id_param;
  
  -- Calcola sconto
  IF bundle_discount_type = 'percentage' THEN
    bundle_discount_amount := (bundle_subtotal * bundle_discount_value) / 100;
  ELSIF bundle_discount_type = 'fixed' THEN
    bundle_discount_amount := bundle_discount_value;
  ELSE
    bundle_discount_amount := 0;
  END IF;
  
  -- Calcola totale
  bundle_total := GREATEST(0, bundle_subtotal - bundle_discount_amount);
  
  -- Aggiorna bundle
  UPDATE bundles
  SET 
    subtotal = bundle_subtotal,
    discount_amount = bundle_discount_amount,
    total = bundle_total,
    updated_at = NOW()
  WHERE id = bundle_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger per ricalcolare totali quando cambiano i prodotti
CREATE OR REPLACE FUNCTION trigger_recalculate_bundle_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_bundle_totals(OLD.bundle_id);
    RETURN OLD;
  ELSE
    PERFORM calculate_bundle_totals(NEW.bundle_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bundle_products_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON bundle_products
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_bundle_totals();

-- Funzione per generare checkout token
CREATE OR REPLACE FUNCTION generate_bundle_checkout_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Genera token casuale di 32 caratteri
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    token := replace(token, '=', '');
    
    -- Verifica unicità
    SELECT EXISTS(SELECT 1 FROM bundles WHERE checkout_token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Funzione per creare checkout URL per bundle
CREATE OR REPLACE FUNCTION create_bundle_checkout_url(
  bundle_id_param UUID,
  base_url_param TEXT DEFAULT 'https://allyoucanleads.com'
)
RETURNS TEXT AS $$
DECLARE
  checkout_token TEXT;
  checkout_url TEXT;
  seller_id UUID;
  referral_code TEXT;
BEGIN
  -- Ottieni seller_user_id
  SELECT seller_user_id INTO seller_id
  FROM bundles
  WHERE id = bundle_id_param;
  
  -- Genera token se non esiste
  SELECT bundles.checkout_token INTO checkout_token
  FROM bundles
  WHERE id = bundle_id_param;
  
  IF checkout_token IS NULL THEN
    checkout_token := generate_bundle_checkout_token();
    
    UPDATE bundles
    SET checkout_token = checkout_token
    WHERE id = bundle_id_param;
  END IF;
  
  -- Ottieni referral code del seller se esiste
  IF seller_id IS NOT NULL THEN
    SELECT referral_code INTO referral_code
    FROM referral_links
    WHERE user_id = seller_id AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Costruisci URL
  checkout_url := base_url_param || '/checkout?bundle=' || checkout_token;
  
  -- Aggiungi referral code se esiste
  IF referral_code IS NOT NULL THEN
    checkout_url := checkout_url || '&ref=' || referral_code;
  END IF;
  
  -- Aggiorna bundle con URL
  UPDATE bundles
  SET checkout_url = checkout_url
  WHERE id = bundle_id_param;
  
  RETURN checkout_url;
END;
$$ LANGUAGE plpgsql;

-- Funzione per scadere bundle automaticamente
CREATE OR REPLACE FUNCTION expire_bundles()
RETURNS void AS $$
BEGIN
  UPDATE bundles
  SET status = 'expired', updated_at = NOW()
  WHERE valid_until < NOW() 
    AND status IN ('active', 'sent')
    AND valid_until IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Commenti
COMMENT ON TABLE bundles IS 'Bundle di prodotti con sconti e configurazione UpSell';
COMMENT ON TABLE bundle_products IS 'Prodotti inclusi nei bundle';
COMMENT ON FUNCTION calculate_bundle_totals(UUID) IS 'Ricalcola subtotale, sconto e totale di un bundle';
COMMENT ON FUNCTION generate_bundle_checkout_token() IS 'Genera token univoco per checkout bundle';
COMMENT ON FUNCTION create_bundle_checkout_url(UUID, TEXT) IS 'Crea URL checkout per bundle con tracking referral';
COMMENT ON FUNCTION expire_bundles() IS 'Scade automaticamente i bundle oltre la data di validità';

