# AYCL Admin Frontend

Interfaccia di amministrazione per il CRM AYCL. L’applicazione è basata su Vite + React + TypeScript e utilizza React Query per il data fetching e un livello API dedicato per comunicare con il backend AYCL.

## Requisiti

- Node.js 20+
- npm 10+

## Setup

```bash
cd admin_frontend
npm install
npm run dev
```

Imposta la variabile `VITE_API_URL` in un file `.env.local` per puntare all’istanza del backend (es. `http://localhost:3000`).

## Struttura principali cartelle

- `src/App.tsx` – definizione del router protetto e layout
- `src/context` – provider per autenticazione e i18n
- `src/components` – componenti riutilizzabili (layout, tabelle, form)
- `src/pages` – viste principali (dashboard, portfolio, sellers, ecc.)
- `src/utils/apiClient.ts` – wrapper `ky` con gestione errori e correlationId

## Testing

```bash
npm run test
```

## TODO

- Collegare i TODO presenti nelle viste (es. selezione template Start Kit, caricamento file AYCL Kit) non appena le API saranno definitive.
- Integrare un sistema di notifiche visive al posto dell’uso di `console.info`.
- Coprire con test E2E i flussi critici (login, creazione utente, generazione documenti).
