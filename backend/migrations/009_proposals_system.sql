-- Migration for Proposals System
-- Gestione proposte commerciali generate dai seller

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Cliente/Azienda
  customer_type TEXT NOT NULL CHECK (customer_type IN ('contact', 'company')),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Dati cliente (snapshot al momento della creazione)
  customer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Servizi proposti
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Formato: [{ name: string, description: string, price: number }]
  
  -- Totali
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  
  -- Extra info
  title TEXT DEFAULT 'Proposta Commerciale',
  introduction TEXT,
  notes TEXT,
  terms TEXT,
  valid_until DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- PDF e Template
  pdf_url TEXT,
  template_id UUID REFERENCES pdf_templates(id) ON DELETE SET NULL,
  
  -- Tracking
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  -- Conversione
  converted_to_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  converted_to_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  
  -- Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_proposals_number ON proposals(number);
CREATE INDEX idx_proposals_contact_id ON proposals(contact_id);
CREATE INDEX idx_proposals_company_id ON proposals(company_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_by ON proposals(created_by);
CREATE INDEX idx_proposals_date ON proposals(date DESC);
CREATE INDEX idx_proposals_valid_until ON proposals(valid_until);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION update_proposals_updated_at();

-- Function per auto-expire proposte
CREATE OR REPLACE FUNCTION expire_proposals()
RETURNS void AS $$
BEGIN
  UPDATE proposals
  SET status = 'expired'
  WHERE valid_until < CURRENT_DATE 
    AND status IN ('draft', 'sent');
END;
$$ LANGUAGE plpgsql;

-- Aggiungi campo approval_status a invoices per gestione seller
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approval_status TEXT 
  CHECK (approval_status IN ('approved', 'pending', 'rejected', NULL));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_approval_status ON invoices(approval_status);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);

-- Comments
COMMENT ON TABLE proposals IS 'Proposte commerciali generate dai seller';
COMMENT ON COLUMN proposals.services IS 'Array di servizi proposti con nome, descrizione e prezzo';
COMMENT ON COLUMN proposals.customer_data IS 'Snapshot dati cliente al momento della creazione';
COMMENT ON COLUMN proposals.view_count IS 'Numero di volte che la proposta è stata visualizzata';
COMMENT ON COLUMN invoices.approval_status IS 'Status approvazione per fatture seller senza prova pagamento';
COMMENT ON COLUMN invoices.payment_proof_url IS 'URL prova di pagamento caricata dal seller';


