-- Insert test companies
INSERT INTO companies (id, ragione_sociale, website, geo, industry, revenue_range, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Test Company 1', 'https://test1.com', 'Italy', 'Technology', '1M-10M', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'Test Company 2', 'https://test2.com', 'Italy', 'Finance', '10M-50M', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'Test Company 3', 'https://test3.com', 'Italy', 'Healthcare', '50M-100M', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
