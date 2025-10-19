# Roadmap esecutiva

| ID | Titolo | Categoria | Output | Dipendenze | Criteri di accettazione | Stato | Note |
|----|--------|-----------|--------|-------------|-------------------------|-------|------|
| T0 | Bootstrap repository | Fondamenta | Config iniziali (.editorconfig, .gitignore, package.json, docs) | Nessuna | File base creati e versionati, placeholder CI | ☑ | Completato in questo commit |
| T1 | Definizione OpenAPI | Architettura | `spec/openapi.yaml` completo | T0 | Specifica copre moduli core, sicurezza, esempi | ☑ | Completato in questo commit |
| T2 | Schema database e migrazione iniziale | Backend | `backend/prisma/schema.prisma`, `backend/prisma/migrations/0001_init.sql` | T1 | Schema coerente con requisiti, indici | ☑ | Completato in questo commit |
| T3 | Bootstrap backend NestJS | Backend | Struttura NestJS, config, common utilities | T2 | App avviabile, lint/test placeholder | ☑ | Workspace backend creato, provider globali configurati |
| T4 | Modulo Auth/Users/Roles | Backend | Controller/service/repo/test | T3 | CRUD con RBAC e audit | ☐ | |
| T5 | Modulo Companies & Contacts | Backend | CRUD API + test | T4 | Validazioni Zod, RBAC, paginazione | ☐ | |
| T6 | Modulo Opportunities & Pipeline | Backend | API e logica pipeline | T5 | Stage, SLA, metriche base | ☐ | |
| T7 | Modulo Offers & Documents | Backend | API offerte, generazione | T6 | Workflow end-to-end | ☐ | |
| T8 | Modulo Contracts & Signatures | Backend | API contratti, firma | T7 | Stato contratto e webhook | ☐ | |
| T9 | Modulo Invoices & Payments | Backend | API fatture/pagamenti | T8 | Stripe integrazione mock | ☐ | |
| T10 | Modulo Files & Storage | Backend | Upload/download S3 | T3 | Permessi ereditati, checksum | ☐ | |
| T11 | Modulo Activities & Tasks | Backend | Timeline attività | T5 | Filtri e paginazione | ☐ | |
| T12 | Modulo Tickets & Supporto | Backend | API ticketing | T3 | Creazione da login supporto | ☐ | |
| T13 | Modulo Reports & Dashboard API | Backend | Endpoint KPI | T9 | Metriche e caching | ☐ | |
| T14 | Modulo Referrals & Checkout | Backend | API tracking referral | T9 | Attribution configurabile | ☐ | |
| T15 | Modulo Webhooks | Backend | Gestione webhook in/out | T8 | Sicurezza token e retry | ☐ | |
| T16 | Motore documenti & job queue | Backend | Rendering PDF, BullMQ | T7 | Code e storage integrati | ☐ | |
| T17 | Frontend bootstrap | Frontend | Setup Vite, Tailwind, shadcn/ui | T3 | Build e lint funzionanti | ☐ | |
| T18 | UI Login & Support Ticket | Frontend | Pagina login + form supporto | T17 | Connessione API ticket | ☐ | |
| T19 | UI Pipeline stile Close | Frontend | Kanban opportunità | T17 | Drag&drop, filtri | ☐ | |
| T20 | UI Dettaglio Azienda | Frontend | Tabs contatti/attività/offerte | T19 | Activity sticky, i18n | ☐ | |
| T21 | UI Dashboard Admin | Frontend | KPI, grafici, filtri | T17 | Report query e permessi | ☐ | |
| T22 | UI Dashboard Seller | Frontend | KPI personali, tasks | T17 | Dati pipeline e tasks | ☐ | |
| T23 | UI Dashboard Reseller | Frontend | KPI sottoclienti | T17 | Scope reseller limitato | ☐ | |
| T24 | Integrazione Stripe & E-sign adapter | Backend | SDK, webhook, mocks | T9 | Pagamenti riconciliati | ☐ | |
| T25 | Test & CI | Qualità | Suite test, coverage 85%, husky | T3 | Script CI e badge | ☐ | |
| T26 | Documentazione avanzata | Docs | Aggiornamento README, ADR, architettura | T3 | Documenti aggiornati e versionati | ☐ | |

// CRITIC PASS: Pianificazione iniziale priva di stime temporali e assegnazioni risorse; TODO aggiungere milestone dettagliate e dipendenze incrociate per integrazioni esterne.