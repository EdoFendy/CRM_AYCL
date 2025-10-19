Progettazione CRM AYCL – Admin / Seller /
Reseller
Versione: 1.0
Dominio unico: allyoucanleads.com
Sotto-aree applicative: admin., seller., reseller.
Database: unico (multi-ruolo), con RBAC e audit trail globale
1) Obiettivi & principi
Unico login (auth page) con reindirizzamento verso una sola dashboard attiva
per sessione.
Un solo database con separazione logica per ruoli e permessi (RBAC).
Ispirazione Close.com per pipeline di opportunità, profili lead, timeline attività
e inbox.
Audit completo: ogni azione utente tracciata (chi, cosa, quando, dove) a livello
Admin.
Documenti legali end‑to‑end: proposta → preventivo → contratto → firma →
fattura/receipt.
Scalabilità: query ottimizzate per dashboard/analitiche, code per generazione
documenti.
GDPR & sicurezza: cifratura PII, consenso, diritto all’oblio, log accessi, data
retention.
2) Ruoli & permessi (RBAC)
Ruoli principali: Admin, Seller, Reseller, Customer (solo firma/checkout),
Management (Admin+report ampliati).
Matrice sintetica
Untitled 1
Admin: tutto + gestione utenti/ruoli, report globali, audit, cataloghi, piani,
prezzi.
Seller: contatti, aziende, trattative, offerte, documenti (proposte, preventivi,
fatture), start kit, pagamenti cliente, inbox attività.
Reseller: simile a Seller ma limitato a sottocliente/i e al Reseller Kit (no fatture
interne salvo configurazione).
Customer: accesso ai link sicuri per compilazione dati, firma, checkout, ticket
base.
Regole di visibilità
Aziende/contatti assegnati a: owner + team/linea + Admin.
Trattative visibili a: owner + membri del team + Admin; Reseller vede solo la
propria sfera.
File e attività ereditano i permessi dell’entità padre
(azienda/contratto/opportunità).
3) Mappa funzionale per area
3.1 admin.allyoucanleads.com
Dashboard: KPI globali (fatturato, MRR, contratti firmati/pending, pipeline per
stadio, ARPA, win rate, cicli medi), filtri per
periodo/linea/seller/reseller/industria.
Portfolio clienti: vista elenco e dettaglio (anagrafiche, contratti, pagamenti,
attività, file, ticket).
Sellers Management: anagrafiche seller, performance (incassato, pending,
proposte attive, contatti attivi), assegnazioni, obiettivi.
Reseller Management: anagrafiche reseller, sottoclienti, performance,
commissioni.
AYCL Kit
Scarica pitch deck
Untitled 2
Genera proposta / preventivo / ricevuta / fattura
Genera PVC / PVV / PVR (definire template: Condizioni, Valore Vendita,
Report?)
Start Kit
Gestione contratti (generazione → compilazione → firma)
Gestione pagamenti
Registra nuovo cliente
Utenti: gestione ruoli, reset password, codici alfanumerici, audit accessi.
Report: export per seller/linea/gruppo/totale (CSV/XLSX/PDF), scheduler.
Ticket: inbox richieste supporto arrivate da login page o da customer portal.
Pagamenti / Contratti / Fatture: registri centralizzati con filtri.
Audit log: tutte le azioni utenti (CRUD, login, invii documenti, firme,
pagamenti).
3.2 seller.allyoucanleads.com
Dashboard: pipeline personale, task oggi/settimana, inbox attività/email/call
log, offerte attive, obiettivi.
Contatti: Nome, Cognome, Email, Tel, Ruolo, LinkedIn, Azienda associata.
Aziende (leads): Ragione sociale, sito, LinkedIn, area geografica, industria,
fatturato, referenti collegati, segnalatore (referral), referente attuale.
Trattative: pipeline tipo Close con fasi configurabili; valore, probabilità, next
step, owner.
Seller Kit: pitch deck, genera proposta/preventivo/ricevuta/fattura.
Start Kit: gestione contratti (E2E), pagamenti, registra nuovo cliente.
Dettaglio pagina Azienda
Header: anagrafiche + stati (cliente/lead, priorità, datasheet sintetico).
Contacts: tab con referenti (multi‑ruolo, +tag), email/phone/LinkedIn.
Info di creazione, Task, tracciamento record (timeline).
Untitled 3
Offerte: elenco offerte create, stato (inviata, accettata, scaduta,
rinegoziazione).
Activity (colonna sinistra): appuntamenti, email inviate/ricevute (mailbox),
note, call log, interazioni dal portale, modifiche record.
File: tutti i file associati con filtri (tipo, periodo, owner) e ricerca full‑text.
3.3 reseller.allyoucanleads.com
Home + Dashboard: KPI dei propri sottoclienti/trattative.
Contatti / Aziende / Trattative: come Seller ma con limiti.
Reseller Kit: pitch deck + generatore proposta (no documenti fiscali se non
abilitato).
Start Kit: gestione contratti, pagamenti, registra nuovo cliente.
4) Autenticazione & accesso
Auth page unica (https://allyoucanleads.com/login):
Logo AYCL, campo codice alfanumerico (11 caratteri), password
(reimpostabile), pulsante Login, pulsante Chiedi supporto.
Chiedi supporto: form che include automaticamente il codice, descrizione
problema → crea Ticket in Admin.
Sessione esclusiva: se si entra in una dashboard si esce dalle altre (flag di
sessione e revoca token cross‑area).
Password reset: via email + OTP.
MFA opzionale, policy password, bruteforce protection.
5) Pipeline & trattative (stile Close)
Fasi standard (esempio): New → Qualifying → Discovery → Proposal →
Negotiation → Closed Won/Lost → Onboarding.
Campi trattativa: titolo, azienda, valore, valuta, probabilità, stadio, owner, next
step, data chiusura attesa, sorgente (referral/ads/organico), prodotti/piani,
Untitled 4
note.
Regole: task obbligatorio in cambio stadio, scadenze SLA, reminder
automatici.
Metriche: conversioni per stadio, ciclo medio, win rate, forecast per mese,
pipeline velocity.
6) Workflow contratti (E2E)
1. Generazione contratto (da template + merge dati opportunità/offerta).
2. Invio al cliente (email con link sicuro; tracciamento apertura/visualizzazioni).
3. Cliente conferma condizioni contrattuali (checkbox/accettazione T&C)
4. Link compilazione dati (form sicuro per anagrafica, P.IVA, indirizzi, referenti).
5. Link firma (e‑sign): OTP/SMS, audit trail firma, timestamp.
6. Contratto firmato: stato aggiornato, webhook interni per attivazioni.
7. Post‑firma: generazione fattura/receipt, kickoff onboarding, task automatici.
Stati contratto: Draft → Inviato → Dati in compilazione → Pronto per firma →
Firmato → Annullato/Scaduto.
7) Tracking referral & checkout
Referral per utente: codice o link personale (es. /r/{userId} ) con UTM e cookies
server‑side.
Checkout: ogni pagamento lega referral + opportunità + seller/reseller (prima
interazione o last‑touch configurabile).
Attribution model configurabile (first‑touch, last‑touch, lineare).
8) Struttura dati (ERD logico)
Nodi principali
Untitled 5
users (id, name, email, role_id, reseller_id?, seller_team_id?, code_11,
password_hash, mfa_enabled, status, created_at)
roles (id, name [admin/seller/reseller/customer], permissions JSON)
teams (id, name, type [seller/reseller], parent_id?)
companies (id, legal_name, website, linkedin_url, geo_area, industry,
revenue_range, owner_user_id, account_status, created_at)
contacts (id, company_id, first_name, last_name, email, phone, role_title,
linkedin_url, owner_user_id, created_at)
opportunities (id, company_id, title, value, currency, stage, probability,
owner_user_id, expected_close_date, source, created_at)
offers (id, opportunity_id, version, items JSON, total_amount, currency, status
[draft/sent/accepted/declined/expired], sent_at, accepted_at)
contracts (id, company_id, opportunity_id?, offer_id?, template_id, status,
current_version_id, signed_at)
contract_versions (id, contract_id, data JSON, pdf_url, checksum, created_by,
created_at)
signatures (id, contract_id, signer_type [customer/aycl], signer_name,
signer_email, method [otp/sms], status, signed_at, ip, user_agent)
invoices (id, company_id, contract_id?, number, issue_date, due_date, total,
currency, status [draft/sent/paid/overdue], pdf_url)
receipts (id, company_id, invoice_id?, number, issue_date, total, pdf_url)
payments (id, company_id, amount, currency, method, provider, charge_id,
status [pending/succeeded/failed/refunded], invoice_id?, contract_id?,
referral_id?, created_at)
referrals (id, code, owner_user_id, first_touch_attribution,
last_touch_attribution, notes)
checkouts (id, company_id?, contact_id?, referral_id?, source, session_id,
status, created_at)
activities (id, type [email/call/meeting/note/system], actor_user_id,
company_id?, contact_id?, opportunity_id?, payload JSON, created_at)
Untitled 6
tasks (id, title, due_date, owner_user_id, company_id?, opportunity_id?, status
[open/done], priority)
files (id, owner_user_id, company_id?, opportunity_id?, contract_id?,
invoice_id?, name, mime, size, storage_url, tags[], created_at)
tickets (id, requester_user_code_11?, requester_email?, subject, body, status
[open/pending/solved], priority, assignee_user_id, created_at)
reports (id, name, scope [seller/line/group/global], filters JSON, generated_by,
file_url, created_at)
audit_log (id, user_id, action, entity_type, entity_id, changes JSON
(prima/dopo), ip, user_agent, created_at)
notifications (id, user_id, type, payload JSON, is_read, created_at)
webhooks (id, event, target_url, secret, last_status, created_at)
Indici chiave: per company_id su contatti/opportunità/attività/file/pagamenti; per
stage e owner su opportunità; per created_at su log e attività; full‑text su nome
azienda, contatti, note, file.tags.
9) Inbox & Activity (Seller/Reseller)
Inbox unificata: email (IMAP/SMTP con alias), meeting (calendari), chiamate
(log manuale/API), note rapide.
Timeline attività per azienda/opportunità con filtri (tipo, periodo, utente,
keyword).
Task: vista Kanban/Agenda con reminder e assegnazioni.
10) Documenti & AYCL/Seller/Reseller Kit
Template manager: versioni per Pitch Deck, Proposta, Preventivo, Ricevuta,
Fattura, PVC/PVV/PVR (HTML → PDF).
Merge & rendering: motore template (Handlebars/Liquid) + service di
generazione PDF in coda.
Untitled 7
Archiviazione: S3‑compatibile, versioning, firma hash (checksum), tag
ricerca.
11) Pagamenti
Gateway: Stripe/alternativa; pagine checkout con referral tracking.
Stati: pending → succeeded/failed; webhook riconcilia invoice/receipt.
Valute: configurabili, tassi snapshot per report.
12) Reportistica (Admin)
Filtri: periodo, fatturato, valore contrattuale, industria, geografia, stadio, seller,
reseller, linea, gruppo.
KPI: incassato, pending, proposte attive, contatti attivi, contratti
firmati/pending, MRR, churn, lifetime value.
Export: CSV/XLSX/PDF; report per seller, per linea, per gruppo sellers e
globale. Scheduler e notifiche.
13) API & integrazioni
API REST (JWT scopo app + token servizio interno). Esempi:
POST /auth/login (code_11 + password) → token
GET /me → ruolo, permessi, scope
GET /companies?owner=me&query=
POST /offers/{id}/send
POST /contracts/{id}/request-signature
POST /payments/webhook (provider)
Webhooks in uscita: contract.signed , invoice.paid , offer.accepted , ticket.created.
Email & Calendari: integrazioni standard (o con provider transazionale per invii
documenti).
Untitled 8
E‑sign: DocuSign/HelloSign/Adobe Sign.
14) Sicurezza & compliance
Cifratura: at‑rest (DB/file storage) + in‑transit (TLS).
Least privilege: RBAC + scoping rigido per query.
Audit: tutte le azioni su audit_log immutabile (append‑only).
PII: mascheramento nei log, diritto all’oblio per contatti.
Rate limit su endpoint di auth e invii documenti.
15) Performance & scalabilità
Indice & denormalizzazioni per dashboard (read models per KPI/pipeline).
Code per: generazione PDF, invii email, sync calendari, webhooks.
Caching: risultati report (TTL), settings template.
16) DevOps
Ambienti: dev, staging, prod.
CI/CD: migrazioni DB (Liquibase/Flyway), test, quality gates.
Backup & DR: snapshot giornalieri, restore test mensile.
Observability: metriche app, tracing, error tracking.
17) Roadmap di implementazione (fasi)
Fase 0 – Fondamenta (2–3 sprint)
Auth unica (code_11 + password reset), RBAC, struttura DB con entità core,
audit_log.
CRUD Companies/Contacts, pipeline Opportunità, Activities/Tasks, File
storage.
Fase 1 – Documenti & Kit (2–3 sprint)
Untitled 9
Template manager, generazione Proposta/Preventivo/Contratto/Pitch deck →
PDF.
Workflow contratti fino all’invio.
Fase 2 – Firma & Pagamenti (2 sprint)
E‑sign end‑to‑end, link compilazione dati cliente.
Integrazione pagamenti + fatture/receipts.
Fase 3 – Dashboard & Report (2 sprint)
KPI Admin/Seller/Reseller, filtri, export, scheduler.
Fase 4 – Ticket & Supporto (1–2 sprint)
Portale ticket, form “Chiedi supporto” dal login, routing, SLA.
Fase 5 – Rifiniture & Scalabilità
Ottimizzazioni, ruoli avanzati (Management), team/linee, referral avanzato.
18) UX: linee guida schermate chiave
Login: logo + codice 11 + password + link “Chiedi supporto” (popup form).
Navbar: Contatti | Aziende | Trattative | Kit | Start Kit | (Admin: Portfolio, Users,
Report, Ticket, Pagamenti, Contratti, Fatture).
Dettaglio Azienda: header info; sotto Contacts; a lato Activity; tabs Offerte,
File, Task/Timeline; metadata (creazione, owner, tracking record).
Pipeline: board Kanban con card (valore, next step, giorni nello stadio, ultima
attività).
Admin dashboard: grafici filtro per fatturato, valore contrattuale, contratti
firmati/pending; tab performance Seller/Reseller.
19) Glossario rapide sigle
PVC / PVV / PVR: tipi di documento interni AYCL (definire contenuti standard
in template manager).
Untitled 10
Owner: utente responsabile dell’entità.
Referral: tracciamento segnalazioni e attribuzione checkout.
20) Prossimi deliverable consigliati
Schema SQL iniziale (DDL) delle tabelle principali con indici.
Specificatione API (OpenAPI 3.0) per i moduli core.
Wireframe low‑fi di: Login, Dettaglio Azienda, Pipeline, Admin Dashboard.
Template di esempio per Proposta/Contratto/Fattura.
Untitled 11