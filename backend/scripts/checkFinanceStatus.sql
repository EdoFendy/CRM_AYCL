-- Script per verificare lo stato delle tabelle Finance
-- Eseguire con: psql -d crm_aycl -f checkFinanceStatus.sql

\echo '================================================'
\echo 'STATO TABELLE FINANCE - CRM AYCL'
\echo '================================================'
\echo ''

\echo '--- PREVENTIVI (Quotes) ---'
SELECT 
    COUNT(*) as totale,
    COUNT(*) FILTER (WHERE status = 'draft') as bozze,
    COUNT(*) FILTER (WHERE status = 'sent') as inviati,
    COUNT(*) FILTER (WHERE status = 'accepted') as accettati,
    COUNT(*) FILTER (WHERE status = 'rejected') as rifiutati,
    COUNT(*) FILTER (WHERE status = 'converted') as convertiti
FROM quotes;

\echo ''
\echo '--- FATTURE (Invoices) ---'
SELECT 
    COUNT(*) as totale,
    COUNT(*) FILTER (WHERE status = 'draft') as bozze,
    COUNT(*) FILTER (WHERE status = 'sent') as inviate,
    COUNT(*) FILTER (WHERE status = 'paid') as pagate,
    COUNT(*) FILTER (WHERE status = 'overdue') as scadute,
    SUM(amount) FILTER (WHERE status = 'paid') as totale_pagato
FROM invoices;

\echo ''
\echo '--- RICEVUTE (Receipts) ---'
SELECT 
    COUNT(*) as totale,
    COUNT(*) FILTER (WHERE status = 'issued') as emesse,
    COUNT(*) FILTER (WHERE status = 'cancelled') as annullate,
    SUM(amount) as importo_totale
FROM receipts;

\echo ''
\echo '--- PAGAMENTI (Payments) ---'
SELECT 
    COUNT(*) as totale,
    COUNT(*) FILTER (WHERE status = 'completed') as completati,
    COUNT(*) FILTER (WHERE status = 'pending') as in_attesa,
    COUNT(*) FILTER (WHERE status = 'failed') as falliti,
    SUM(amount) FILTER (WHERE status = 'completed') as totale_incassato
FROM payments;

\echo ''
\echo '--- CONTRATTI (Contracts) ---'
SELECT 
    COUNT(*) as totale,
    COUNT(*) FILTER (WHERE status = 'draft') as bozze,
    COUNT(*) FILTER (WHERE status = 'sent') as inviati,
    COUNT(*) FILTER (WHERE status = 'signed') as firmati,
    COUNT(*) FILTER (WHERE status = 'expired') as scaduti
FROM contracts;

\echo ''
\echo '--- CHECKOUTS ---'
SELECT 
    COUNT(*) as totale,
    COUNT(*) FILTER (WHERE status = 'completed') as completati,
    COUNT(*) FILTER (WHERE status = 'pending') as in_attesa,
    COUNT(*) FILTER (WHERE status = 'abandoned') as abbandonati
FROM checkouts;

\echo ''
\echo '--- FIRME ELETTRONICHE (Signatures) ---'
SELECT 
    COUNT(*) as totale,
    COUNT(*) FILTER (WHERE status = 'completed') as completate,
    COUNT(*) FILTER (WHERE status = 'pending') as in_attesa,
    COUNT(*) FILTER (WHERE method = 'otp') as otp,
    COUNT(*) FILTER (WHERE method = 'email') as email,
    COUNT(*) FILTER (WHERE method = 'digital') as digitali
FROM signatures;

\echo ''
\echo '================================================'
\echo 'RIEPILOGO FINANZIARIO'
\echo '================================================'
\echo ''

SELECT 
    'Fatture Pagate' as tipo,
    COALESCE(SUM(amount), 0) as importo,
    'EUR' as valuta
FROM invoices
WHERE status = 'paid'
UNION ALL
SELECT 
    'Ricevute Emesse' as tipo,
    COALESCE(SUM(amount), 0) as importo,
    'EUR' as valuta
FROM receipts
WHERE status = 'issued'
UNION ALL
SELECT 
    'Pagamenti Ricevuti' as tipo,
    COALESCE(SUM(amount), 0) as importo,
    'EUR' as valuta
FROM payments
WHERE status = 'completed';

\echo ''
\echo '================================================'
\echo 'Script completato'
\echo '================================================'

