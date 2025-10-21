-- Migration 003: Sistema Firma Digitale Completo
-- Creato: 2025-10-21

-- Tabella per signature_requests (link pubblici per firma)
CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- Token pubblico per il link
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, completed, expired, cancelled
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_phone TEXT,
  require_otp BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  signature_data JSONB, -- Dati firma (disegnata o click)
  document_hash TEXT, -- Hash del documento al momento della firma
  certificate_url TEXT, -- URL certificato di completamento
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_signature_requests_token ON signature_requests(token);
CREATE INDEX idx_signature_requests_contract ON signature_requests(contract_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signature_requests_expires ON signature_requests(expires_at);

-- Tabella per OTP codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email', -- email, sms
  sent_to TEXT NOT NULL, -- email o numero telefono
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_otp_codes_signature_request ON otp_codes(signature_request_id);
CREATE INDEX idx_otp_codes_code ON otp_codes(code);

-- Tabella per payment_intents (integrazioni pagamento)
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE SET NULL,
  provider TEXT NOT NULL, -- stripe, paypal, bank_transfer
  provider_intent_id TEXT, -- ID del payment intent nel provider
  amount NUMERIC(15,2) NOT NULL,
  currency CHAR(3) DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed, cancelled
  payment_method TEXT, -- card, sepa_debit, paypal
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_intents_contract ON payment_intents(contract_id);
CREATE INDEX idx_payment_intents_signature_request ON payment_intents(signature_request_id);
CREATE INDEX idx_payment_intents_provider_id ON payment_intents(provider_intent_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);

-- Tabella per subscriptions (abbonamenti ricorrenti)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  customer_type TEXT CHECK (customer_type IN ('contact', 'company')),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  provider TEXT NOT NULL, -- stripe, paypal
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, cancelled, expired
  plan_name TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency CHAR(3) DEFAULT 'EUR',
  interval TEXT NOT NULL, -- monthly, yearly
  interval_count INTEGER DEFAULT 1,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  trial_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_contract ON subscriptions(contract_id);
CREATE INDEX idx_subscriptions_customer ON subscriptions(contact_id, company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);

-- Tabella per contract_timeline (eventi contratto)
CREATE TABLE IF NOT EXISTS contract_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- created, sent_for_signature, signed, payment_received, invoice_issued, etc.
  event_data JSONB DEFAULT '{}',
  description TEXT,
  actor_type TEXT, -- user, system, customer
  actor_id UUID, -- ID utente o cliente
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contract_timeline_contract ON contract_timeline(contract_id);
CREATE INDEX idx_contract_timeline_created ON contract_timeline(created_at);

-- Aggiungi colonne mancanti a contracts se necessario
DO $$ 
BEGIN
  -- Aggiungi pack se non esiste
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='pack') THEN
    ALTER TABLE contracts ADD COLUMN pack TEXT; -- Setup-Fee, Performance, Subscription, Drive Test
  END IF;
  
  -- Aggiungi proposal_file_id se non esiste
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='proposal_file_id') THEN
    ALTER TABLE contracts ADD COLUMN proposal_file_id UUID;
  END IF;
  
  -- Aggiungi document_hash se non esiste
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='document_hash') THEN
    ALTER TABLE contracts ADD COLUMN document_hash TEXT;
  END IF;
  
  -- Aggiungi finalized_at se non esiste
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='finalized_at') THEN
    ALTER TABLE contracts ADD COLUMN finalized_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Aggiungi requires_payment se non esiste
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='requires_payment') THEN
    ALTER TABLE contracts ADD COLUMN requires_payment BOOLEAN DEFAULT false;
  END IF;
  
  -- Aggiungi payment_amount se non esiste
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='payment_amount') THEN
    ALTER TABLE contracts ADD COLUMN payment_amount NUMERIC(15,2);
  END IF;
  
  -- Aggiungi payment_currency se non esiste
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='payment_currency') THEN
    ALTER TABLE contracts ADD COLUMN payment_currency CHAR(3) DEFAULT 'EUR';
  END IF;
  
  -- Aggiungi is_subscription se non esiste
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='is_subscription') THEN
    ALTER TABLE contracts ADD COLUMN is_subscription BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Funzione per pulire OTP scaduti
CREATE OR REPLACE FUNCTION cleanup_expired_otps() RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW() AND verified_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Funzione per pulire signature_requests scaduti
CREATE OR REPLACE FUNCTION cleanup_expired_signature_requests() RETURNS void AS $$
BEGIN
  UPDATE signature_requests 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE signature_requests IS 'Richieste di firma digitale con link pubblici';
COMMENT ON TABLE otp_codes IS 'Codici OTP per verifica firma';
COMMENT ON TABLE payment_intents IS 'Integrazioni pagamento per contratti';
COMMENT ON TABLE subscriptions IS 'Abbonamenti ricorrenti attivi';
COMMENT ON TABLE contract_timeline IS 'Timeline eventi contratto';

