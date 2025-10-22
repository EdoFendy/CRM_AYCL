-- Migration: PDF Templates System
-- Sistema per template PDF con mappatura campi dinamica

CREATE TABLE IF NOT EXISTS pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'contract', -- contract, invoice, receipt, etc.
  filename VARCHAR(255) NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 1,
  field_mapping JSONB, -- Array di FieldMapping
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pdf_templates_type ON pdf_templates(type);
CREATE INDEX idx_pdf_templates_created_by ON pdf_templates(created_by);

-- Tabella per storico PDF generati
CREATE TABLE IF NOT EXISTS generated_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES pdf_templates(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  data_used JSONB, -- Dati usati per la generazione
  pdf_url TEXT, -- URL file generato
  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_generated_pdfs_template ON generated_pdfs(template_id);
CREATE INDEX idx_generated_pdfs_contract ON generated_pdfs(contract_id);
CREATE INDEX idx_generated_pdfs_generated_at ON generated_pdfs(generated_at);

COMMENT ON TABLE pdf_templates IS 'Template PDF con mappatura campi dinamica';
COMMENT ON COLUMN pdf_templates.field_mapping IS 'Array JSON di FieldMapping con coordinate normalizzate';
COMMENT ON TABLE generated_pdfs IS 'Storico PDF generati da template';

