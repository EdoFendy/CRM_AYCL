-- Payment System Migration
-- Crea tabelle per gestione pagamenti, abbonamenti e timeline

-- Payment Intents (intenti di pagamento)
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    stripe_payment_intent_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment Links (link pubblici per pagamenti)
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(48) UNIQUE NOT NULL,
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE CASCADE,
    return_url TEXT,
    cancel_url TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions (abbonamenti ricorrenti)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    interval_type VARCHAR(20) NOT NULL DEFAULT 'month' CHECK (interval_type IN ('day', 'week', 'month', 'year')),
    interval_count INTEGER NOT NULL DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription Payments (pagamenti ricorrenti)
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    payment_intent_id UUID REFERENCES payment_intents(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timeline Events (eventi timeline per contratti)
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_contract_id ON payment_intents(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_token ON payment_links(token);
CREATE INDEX IF NOT EXISTS idx_payment_links_expires_at ON payment_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_contract_id ON subscriptions(contract_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_due_date ON subscription_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_timeline_events_contract_id ON timeline_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_created_at ON timeline_events(created_at);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- I trigger vengono creati dopo le tabelle

-- Estendi tabella contracts con campi per pagamenti
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3) DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS document_hash VARCHAR(64);

-- Estendi tabella invoices con campi per pagamenti
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_intent_id UUID REFERENCES payment_intents(id),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Estendi tabella receipts con campi per pagamenti  
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS payment_intent_id UUID REFERENCES payment_intents(id),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Crea trigger dopo aver creato tutte le tabelle
CREATE TRIGGER update_payment_intents_updated_at 
    BEFORE UPDATE ON payment_intents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at 
    BEFORE UPDATE ON subscription_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE payment_intents IS 'Intenti di pagamento per contratti';
COMMENT ON TABLE payment_links IS 'Link pubblici per pagamenti sicuri';
COMMENT ON TABLE subscriptions IS 'Abbonamenti ricorrenti per contratti';
COMMENT ON TABLE subscription_payments IS 'Pagamenti ricorrenti per abbonamenti';
COMMENT ON TABLE timeline_events IS 'Eventi timeline per contratti';

COMMENT ON COLUMN payment_intents.amount IS 'Importo in centesimi';
COMMENT ON COLUMN payment_intents.status IS 'Stato del pagamento';
COMMENT ON COLUMN payment_intents.stripe_payment_intent_id IS 'ID Stripe per integrazione';
COMMENT ON COLUMN payment_links.token IS 'Token univoco per link pubblico';
COMMENT ON COLUMN subscriptions.interval_type IS 'Tipo di intervallo per ricorrenza';
COMMENT ON COLUMN subscriptions.interval_count IS 'Numero di intervalli';
COMMENT ON COLUMN timeline_events.event_type IS 'Tipo di evento (created, signed, paid, etc.)';
