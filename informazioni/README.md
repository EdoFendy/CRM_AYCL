# CRM AYCL Backend

Backend Node.js/TypeScript per la piattaforma CRM AYCL. Implementa API REST con Express, autenticazione JWT, RBAC di base e strutture dati per le principali entità CRM.

## Requisiti

- Node.js >= 18
- PostgreSQL >= 14

## Setup

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

### Script

- `npm run migrate` esegue le migrazioni SQL in `backend/migrations`.
- `npm run seed` popola il database con dati demo.
- `npm run dev` avvia il server in modalità sviluppo con reload.
- `npm run build` compila il codice TypeScript.
- `npm run start` avvia il server compilato.

## Struttura progetto

- `backend/src/app` configurazione Express.
- `backend/src/modules` moduli verticali (auth, users, companies, ...).
- `backend/src/db` gestisce pool PostgreSQL e runner migrazioni/seed.
- `backend/migrations` SQL per schema database.
- `backend/seeds` SQL per dati demo.
- `spec/openapi.yaml` documentazione OpenAPI (TODO completare esempi dettagliati).

## Autenticazione

Login via `/auth/login` con codice alfanumerico a 11 caratteri (`code11`) e password. Il flusso restituisce access token JWT e refresh token. Sono disponibili endpoint per refresh, logout e reset password.

## TODO principali

- Implementare cursore reale per paginazione.
- Completare logiche business complesse (es. webhooks outbound, generazione PDF, riconciliazione pagamenti).
- Integrare provider e-signature e sistemi di notifica/email.
- Copertura test automatica con Vitest.
- Completare documentazione OpenAPI con esempi e descrizioni.
