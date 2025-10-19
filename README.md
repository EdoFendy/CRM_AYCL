# CRM AYCL

CRM AYCL è una piattaforma CRM multi-ruolo ispirata a Close.com e focalizzata sulla gestione end-to-end di opportunità, contratti e pagamenti per l'ecosistema AllYouCanLeads.

## Struttura del repository

- `backend/`: codice sorgente del backend NestJS + Prisma.
- `frontend/`: client React + Vite.
- `docs/`: documentazione architetturale e specifiche API.
- `spec/`: definizioni OpenAPI e risorse condivise.

## Requisiti

- Node.js 18+
- pnpm 8+, npm 9+ oppure yarn 1.22+
- PostgreSQL 14+

## Script principali

Gli script verranno definiti progressivamente nei rispettivi `package.json`.

## Ambiente di sviluppo

1. Copiare `.env.example` in `.env` e valorizzare le variabili richieste.
2. Installare le dipendenze con il package manager scelto.
3. Avviare i servizi backend e frontend.

// CRITIC PASS: Mancano dettagli sugli script e setup specifici finché backend/frontend non sono implementati; TODO documentare pipeline CI/CD e processi di deploy.
