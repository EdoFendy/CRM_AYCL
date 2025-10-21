-- Migration for AYCL Kit feature: doc pack files and quotes

-- Tabella per i file statici dei pack (pitch deck e proposte)
CREATE TABLE doc_pack_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack TEXT NOT NULL CHECK (pack IN ('Setup-Fee', 'Performance', 'Subscription', 'Drive Test')),
  category TEXT NOT NULL CHECK (category IN ('pitch', 'proposal')),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_pack_files_pack ON doc_pack_files(pack);
CREATE INDEX idx_doc_pack_files_category ON doc_pack_files(category);

-- Tabella per i preventivi (quotes)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  
  -- Cliente/Azienda
  customer_type TEXT NOT NULL CHECK (customer_type IN ('contact', 'company')),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Dati cliente (snapshot al momento della creazione)
  customer_data JSONB NOT NULL,
  
  -- Righe documento
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Totali
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  
  -- Extra info
  notes TEXT,
  due_date DATE,
  
  -- Status e conversione
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted')),
  converted_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- PDF
  pdf_url TEXT,
  
  -- Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotes_number ON quotes(number);
CREATE INDEX idx_quotes_contact_id ON quotes(contact_id);
CREATE INDEX idx_quotes_company_id ON quotes(company_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);

-- Estendere invoices per collegare a quotes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_type TEXT CHECK (customer_type IN ('contact', 'company'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_data JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;

-- Estendere receipts
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_type TEXT CHECK (customer_type IN ('contact', 'company'));
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_data JSONB;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS line_items JSONB;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS notes TEXT;

