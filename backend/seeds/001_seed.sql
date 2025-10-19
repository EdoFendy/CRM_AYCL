INSERT INTO roles (name, description, permissions)
VALUES
  ('admin', 'Platform administrator', '{"scope":"all"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

INSERT INTO teams (id, name, type)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'HQ Sellers', 'seller'),
  ('00000000-0000-0000-0000-000000000201', 'Reseller Alpha', 'reseller')
ON CONFLICT (id) DO NOTHING;

WITH upsert_users AS (
  INSERT INTO users (id, code11, email, password_hash, role, status, full_name, team_id, reseller_team_id)
  VALUES
    ('00000000-0000-0000-0000-000000000001', 'ADM00000001', 'admin@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8/QqXFz3vY9VOGBev5nYeqqwJknhkW', 'admin', 'active', 'Admin Demo', NULL, NULL),
    ('00000000-0000-0000-0000-000000000002', 'SEL00000001', 'seller@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8/QqXFz3vY9VOGBev5nYeqqwJknhkW', 'seller', 'active', 'Seller Demo', '00000000-0000-0000-0000-000000000101', NULL),
    ('00000000-0000-0000-0000-000000000003', 'RES00000001', 'reseller@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8/QqXFz3vY9VOGBev5nYeqqwJknhkW', 'reseller', 'active', 'Reseller Demo', NULL, '00000000-0000-0000-0000-000000000201'),
    ('00000000-0000-0000-0000-000000000004', 'CUS00000001', 'customer@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8/QqXFz3vY9VOGBev5nYeqqwJknhkW', 'customer', 'active', 'Customer Demo', NULL, NULL)
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
SELECT 1;

INSERT INTO companies (id, ragione_sociale, website, linkedin, geo, industry, revenue_range, owner_id)
VALUES
  ('00000000-0000-0000-0000-000000000501', 'AYCL Industries', 'https://aycl.example.com', 'https://linkedin.com/company/aycl', 'IT', 'Technology', '1M-5M', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000502', 'Beta Logistics', 'https://beta-logistics.example.com', 'https://linkedin.com/company/beta', 'EU', 'Logistics', '5M-10M', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000503', 'Gamma Retail', 'https://gamma-retail.example.com', 'https://linkedin.com/company/gamma', 'US', 'Retail', '500k-1M', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contacts (id, company_id, first_name, last_name, email, phone, role, linkedin, owner_id)
VALUES
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000501', 'Laura', 'Bianchi', 'laura.bianchi@aycl.example.com', '+39-010-0001', 'CTO', 'https://linkedin.com/in/laura-bianchi', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000501', 'Marco', 'Verdi', 'marco.verdi@aycl.example.com', '+39-010-0002', 'COO', 'https://linkedin.com/in/marco-verdi', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000502', 'Julia', 'Klein', 'julia.klein@beta-logistics.example.com', '+49-030-0001', 'Operations Lead', 'https://linkedin.com/in/julia-klein', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000503', 'Robert', 'Smith', 'robert.smith@gamma-retail.example.com', '+1-202-0001', 'CFO', 'https://linkedin.com/in/robert-smith', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000605', '00000000-0000-0000-0000-000000000503', 'Emily', 'Johnson', 'emily.johnson@gamma-retail.example.com', '+1-202-0002', 'CEO', 'https://linkedin.com/in/emily-johnson', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO referrals (id, code, owner_user_id)
VALUES
  ('00000000-0000-0000-0000-000000000701', 'REF-ALPHA', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO opportunities (id, company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, referral_id)
VALUES
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000501', 'CRM Enterprise rollout', 50000, 'EUR', 'qualification', 40, '00000000-0000-0000-0000-000000000002', CURRENT_DATE + INTERVAL '30 days', 'inbound', NULL),
  ('00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000502', 'Logistics analytics pilot', 25000, 'EUR', 'proposal', 60, '00000000-0000-0000-0000-000000000002', CURRENT_DATE + INTERVAL '45 days', 'event', '00000000-0000-0000-0000-000000000701'),
  ('00000000-0000-0000-0000-000000000803', '00000000-0000-0000-0000-000000000503', 'Retail omnichannel suite', 80000, 'EUR', 'negotiation', 70, '00000000-0000-0000-0000-000000000003', CURRENT_DATE + INTERVAL '60 days', 'partner', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (id, title, description, due_date, owner_id, opportunity_id, status, priority)
VALUES
  ('00000000-0000-0000-0000-000000000901', 'Prepare proposal', 'Gather requirements and draft proposal', CURRENT_DATE + INTERVAL '3 days', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000801', 'open', 'high')
ON CONFLICT (id) DO NOTHING;

INSERT INTO activities (id, type, actor_id, company_id, contact_id, opportunity_id, content)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 'email', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000801', 'Initial outreach email to Laura Bianchi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doc_templates (id, name, type, description, body, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000b01', 'Default Contract', 'contract', 'Base contract template', '<html><body><h1>Contratto</h1><p>{{company}}</p></body></html>', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
