-- Prisma migration placeholder generated manually to bootstrap schema.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  permissions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teams_parent_fk FOREIGN KEY (parent_id) REFERENCES teams(id)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  role_id UUID NULL UNIQUE,
  reseller_id UUID NULL,
  code11 CHAR(11) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teams_users (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX idx_users_role ON users(role);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name TEXT NOT NULL,
  website TEXT NULL,
  linkedin_url TEXT NULL,
  geo_area TEXT NULL,
  industry TEXT NULL,
  revenue_range TEXT NULL,
  owner_user_id UUID NULL REFERENCES users(id),
  account_status TEXT NOT NULL DEFAULT 'lead',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_owner ON companies(owner_user_id);
CREATE INDEX idx_companies_status ON companies(account_status);
CREATE INDEX idx_companies_legal_name ON companies(legal_name);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NULL,
  role_title TEXT NULL,
  linkedin_url TEXT NULL,
  owner_user_id UUID NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_owner ON contacts(owner_user_id);
CREATE INDEX idx_contacts_email ON contacts(email);

CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value NUMERIC(16,2) NOT NULL,
  currency TEXT NOT NULL,
  stage TEXT NOT NULL,
  probability INT NOT NULL,
  owner_user_id UUID NULL REFERENCES users(id),
  expected_close_date DATE NULL,
  source TEXT NULL,
  products JSONB NULL,
  next_step TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_owner ON opportunities(owner_user_id);
CREATE INDEX idx_opportunities_expected_close ON opportunities(expected_close_date);

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  items JSONB NOT NULL,
  total_amount NUMERIC(16,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ NULL,
  accepted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offers_opportunity ON offers(opportunity_id);
CREATE INDEX idx_offers_status ON offers(status);

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID NULL REFERENCES opportunities(id),
  offer_id UUID NULL REFERENCES offers(id),
  template_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  current_version_id UUID NULL,
  signed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_contracts_status ON contracts(status);

CREATE TABLE contract_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  pdf_url TEXT NULL,
  checksum TEXT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_versions_contract ON contract_versions(contract_id);

CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMPTZ NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signatures_contract ON signatures(contract_id);
CREATE INDEX idx_signatures_email ON signatures(signer_email);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID NULL REFERENCES contracts(id),
  number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total NUMERIC(16,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  pdf_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NULL REFERENCES invoices(id),
  number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  total NUMERIC(16,2) NOT NULL,
  pdf_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receipts_company ON receipts(company_id);
CREATE INDEX idx_receipts_invoice ON receipts(invoice_id);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  first_touch_attribution TEXT NULL,
  last_touch_attribution TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_owner ON referrals(owner_user_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount NUMERIC(16,2) NOT NULL,
  currency TEXT NOT NULL,
  method TEXT NOT NULL,
  provider TEXT NOT NULL,
  charge_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invoice_id UUID NULL REFERENCES invoices(id),
  contract_id UUID NULL REFERENCES contracts(id),
  referral_id UUID NULL REFERENCES referrals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_company ON payments(company_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_contract ON payments(contract_id);

CREATE TABLE checkouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NULL REFERENCES companies(id),
  contact_id UUID NULL REFERENCES contacts(id),
  referral_id UUID NULL REFERENCES referrals(id),
  source TEXT NULL,
  session_id TEXT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkouts_company ON checkouts(company_id);
CREATE INDEX idx_checkouts_referral ON checkouts(referral_id);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  actor_user_id UUID NULL REFERENCES users(id),
  company_id UUID NULL REFERENCES companies(id),
  contact_id UUID NULL REFERENCES contacts(id),
  opportunity_id UUID NULL REFERENCES opportunities(id),
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_company ON activities(company_id);
CREATE INDEX idx_activities_opportunity ON activities(opportunity_id);
CREATE INDEX idx_activities_actor ON activities(actor_user_id);
CREATE INDEX idx_activities_created ON activities(created_at);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ NULL,
  owner_user_id UUID NULL REFERENCES users(id),
  company_id UUID NULL REFERENCES companies(id),
  opportunity_id UUID NULL REFERENCES opportunities(id),
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_owner ON tasks(owner_user_id);
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_opportunity ON tasks(opportunity_id);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NULL REFERENCES users(id),
  company_id UUID NULL REFERENCES companies(id),
  opportunity_id UUID NULL REFERENCES opportunities(id),
  contract_id UUID NULL REFERENCES contracts(id),
  invoice_id UUID NULL REFERENCES invoices(id),
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size BIGINT NOT NULL,
  storage_url TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  checksum TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_company ON files(company_id);
CREATE INDEX idx_files_opportunity ON files(opportunity_id);
CREATE INDEX idx_files_contract ON files(contract_id);
CREATE INDEX idx_files_invoice ON files(invoice_id);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_code11 CHAR(11) NOT NULL,
  requester_email TEXT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_user_id UUID NULL REFERENCES users(id),
  company_id UUID NULL REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_user_id);
CREATE INDEX idx_tickets_company ON tickets(company_id);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  filters JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT NULL,
  generated_by UUID NULL REFERENCES users(id),
  company_id UUID NULL REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_scope ON reports(scope);
CREATE INDEX idx_reports_status ON reports(status);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  changes JSONB NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event TEXT NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NULL,
  last_status TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_event ON webhooks(event);

-- CRITIC PASS: Migrazione manuale senza trigger audit e policy RLS; TODO integrare funzioni per aggiornare automaticamente updated_at e proteggere dati sensibili.
