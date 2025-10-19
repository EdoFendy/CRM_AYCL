# CRM AYCL

CRM AYCL è una piattaforma CRM multi-ruolo ispirata a Close.com e focalizzata sulla gestione end-to-end di opportunità, contratti e pagamenti per l'ecosistema AllYouCanLeads.

## Struttura del repository

- `backend/`: codice sorgente del backend NestJS + Prisma.
- `frontend/`: client React + Vite (in preparazione).
- `docs/`: documentazione architetturale e specifiche API.
- `spec/`: definizioni OpenAPI e risorse condivise.

## Requisiti

- Node.js 18+
- npm 9+ (oppure pnpm/yarn con configurazione compatibile workspaces)
- PostgreSQL 14+
- Redis 7+ (per BullMQ e caching, opzionale in questa fase)

## Setup rapido

1. Copiare `.env.example` in `.env` e valorizzare le variabili richieste.
2. Installare le dipendenze monorepo: `npm install`.
3. Generare il client Prisma: `npm run prisma:generate --workspace @crm-aycl/backend`.
4. Avviare il backend in modalità watch: `npm run dev:backend`.

## Script principali

| Comando | Descrizione |
|---------|-------------|
| `npm run dev:backend` | Avvio del backend NestJS con reload automatico. |
| `npm run build:backend` | Compilazione del backend in `dist/`. |
| `npm run lint:backend` | Linting TypeScript/ESLint per il backend. |
| `npm run test:backend` | Esecuzione test Jest del backend. |

## Configurazione backend

Il backend utilizza `ConfigModule` con validazione Zod. Le variabili minime richieste sono documentate in `.env.example`. Il logger centralizzato (`AppLogger`) applica automaticamente il `correlationId` propagato da interceptor globali e verrà esteso per integrazioni APM e mascheramento PII.

## Documentazione

- `TASKS.md`: stato attività operative.
- `CHANGELOG.md`: cronologia modifiche secondo Keep a Changelog.
- `docs/architecture.md`: panoramica architetturale.
- `docs/decisions/`: ADR registrate (es. `ADR-0001` per bootstrap backend).

// CRITIC PASS: Documentazione ancora parziale per pipeline frontend, setup DB/Redis e flow CI/CD; TODO aggiungere guide step-by-step e diagrammi aggiornati quando disponibili.
