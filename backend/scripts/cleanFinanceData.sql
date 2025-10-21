-- Script per pulire i dati fake dalle tabelle Finance
-- Eseguire con: psql -d crm_aycl -f cleanFinanceData.sql

-- Elimina tutte le ricevute
DELETE FROM receipts;
ALTER SEQUENCE IF EXISTS receipts_id_seq RESTART WITH 1;

-- Elimina tutte le fatture
DELETE FROM invoices;
ALTER SEQUENCE IF EXISTS invoices_id_seq RESTART WITH 1;

-- Elimina tutti i preventivi
DELETE FROM quotes;
ALTER SEQUENCE IF EXISTS quotes_id_seq RESTART WITH 1;

-- Elimina tutti i pagamenti
DELETE FROM payments;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;

-- Elimina tutti i contratti
DELETE FROM contracts;
ALTER SEQUENCE IF EXISTS contracts_id_seq RESTART WITH 1;

-- Elimina tutti i checkouts
DELETE FROM checkouts;
ALTER SEQUENCE IF EXISTS checkouts_id_seq RESTART WITH 1;

-- Elimina tutte le firme
DELETE FROM signatures;
ALTER SEQUENCE IF EXISTS signatures_id_seq RESTART WITH 1;

-- Conferma
SELECT 
    'quotes' as table_name, COUNT(*) as remaining_records FROM quotes
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'receipts', COUNT(*) FROM receipts
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'checkouts', COUNT(*) FROM checkouts
UNION ALL
SELECT 'signatures', COUNT(*) FROM signatures;

