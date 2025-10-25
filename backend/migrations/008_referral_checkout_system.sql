-- Migration 008: Referral Checkout System

-- Add referral tracking to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_link TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS checkout_base_url TEXT DEFAULT 'https://allyoucanleads.com';

-- Create referral_links table for tracking
CREATE TABLE referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  checkout_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_links_user_id ON referral_links(user_id);
CREATE INDEX idx_referral_links_referral_code ON referral_links(referral_code);
CREATE INDEX idx_referral_links_is_active ON referral_links(is_active);

-- Create checkout_requests table for drive test requests
CREATE TABLE checkout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  company_name TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('drive_test', 'custom', 'bundle')),
  product_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ,
  seller_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkout_requests_referral_code ON checkout_requests(referral_code);
CREATE INDEX idx_checkout_requests_seller_id ON checkout_requests(seller_id);
CREATE INDEX idx_checkout_requests_status ON checkout_requests(status);
CREATE INDEX idx_checkout_requests_expires_at ON checkout_requests(expires_at);

-- Create checkout_sessions table for active checkout processes
CREATE TABLE checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES checkout_requests(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  checkout_url TEXT NOT NULL,
  woo_product_id INTEGER,
  woo_payment_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkout_sessions_request_id ON checkout_sessions(request_id);
CREATE INDEX idx_checkout_sessions_session_token ON checkout_sessions(session_token);
CREATE INDEX idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_expires_at ON checkout_sessions(expires_at);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_count 
    FROM referral_links 
    WHERE referral_code = code;
    
    -- Exit loop if code is unique
    EXIT WHEN exists_count = 0;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to create referral link for user
CREATE OR REPLACE FUNCTION create_user_referral_link(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  referral_code TEXT;
  checkout_url TEXT;
  base_url TEXT;
BEGIN
  -- Get user's checkout base URL or use default
  SELECT checkout_base_url INTO base_url 
  FROM users 
  WHERE id = user_id_param;
  
  IF base_url IS NULL THEN
    base_url := 'https://allyoucanleads.com';
  END IF;
  
  -- Generate unique referral code
  referral_code := generate_referral_code();
  
  -- Create checkout URL
  checkout_url := base_url || '/checkout?ref=' || referral_code;
  
  -- Insert referral link
  INSERT INTO referral_links (user_id, referral_code, checkout_url)
  VALUES (user_id_param, referral_code, checkout_url);
  
  -- Update user with referral code and link
  UPDATE users 
  SET referral_code = referral_code, 
      referral_link = checkout_url
  WHERE id = user_id_param;
  
  RETURN checkout_url;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire checkout requests
CREATE OR REPLACE FUNCTION expire_checkout_requests()
RETURNS void AS $$
BEGIN
  UPDATE checkout_requests
  SET status = 'expired'
  WHERE expires_at < NOW() AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire checkout sessions
CREATE OR REPLACE FUNCTION expire_checkout_sessions()
RETURNS void AS $$
BEGIN
  UPDATE checkout_sessions
  SET status = 'expired'
  WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE referral_links IS 'Referral links for sellers to track their checkout generation';
COMMENT ON TABLE checkout_requests IS 'Customer requests for drive tests and custom checkouts';
COMMENT ON TABLE checkout_sessions IS 'Active checkout sessions with WooCommerce integration';
COMMENT ON FUNCTION generate_referral_code() IS 'Generates unique 8-character referral codes';
COMMENT ON FUNCTION create_user_referral_link(UUID) IS 'Creates referral link for user and returns checkout URL';
