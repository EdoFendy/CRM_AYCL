# 🛠️ Comandi Utili - CRM AYCL

## 🚀 Avvio Applicazione

### Backend
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm run dev
```
**Porta**: http://localhost:3001

### Frontend
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend
npm run dev
```
**Porta**: http://localhost:5173

---

## 🗄️ Database

### Connessione
```bash
psql postgresql://localhost:5432/crm_aycl
```

### Verificare Stato Tabelle Finance
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
psql postgresql://localhost:5432/crm_aycl -f scripts/checkFinanceStatus.sql
```

### Pulire Dati Finance
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
psql postgresql://localhost:5432/crm_aycl -f scripts/cleanFinanceData.sql
```

### Migrazioni
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm run migrate
```

### Seed Database
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm run seed
```

---

## 🧪 Testing

### Backend Tests
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm test
```

### Frontend Tests
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend
npm test
```

### Build Backend
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm run build
```

### Build Frontend
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend
npm run build
```

---

## 📦 Dipendenze

### Installare Dipendenze Backend
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm install
```

### Installare Dipendenze Frontend
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend
npm install
```

### Aggiungere Nuova Dipendenza Backend
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm install <package-name>
# oppure per dev dependency
npm install -D <package-name>
```

### Aggiungere Nuova Dipendenza Frontend
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend
npm install <package-name>
```

---

## 🔍 Debug

### Logs Backend
Il backend stampa logs in console. Per filtrarli:
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm run dev 2>&1 | grep "ERROR"
```

### Logs Database
```bash
# Query lente
psql postgresql://localhost:5432/crm_aycl -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
"
```

### Verificare Token JWT
```bash
# Dalla console browser
localStorage.getItem('token')
```

---

## 🗑️ Pulizia

### Pulire Node Modules
```bash
# Backend
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend
rm -rf node_modules package-lock.json
npm install
```

### Pulire Build
```bash
# Backend
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
rm -rf dist

# Frontend
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend
rm -rf dist
```

### Pulire Upload Files
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
rm -rf uploads/doc-pack-files/*
rm -rf uploads/files/*
```

---

## 📊 Database Query Utili

### Contare Record per Tabella
```sql
SELECT 
  'quotes' as table_name, COUNT(*) as records FROM quotes
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'receipts', COUNT(*) FROM receipts
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL SELECT 'checkouts', COUNT(*) FROM checkouts
UNION ALL SELECT 'signatures', COUNT(*) FROM signatures;
```

### Vedere Ultimi Record Creati
```sql
-- Ultimi 10 preventivi
SELECT id, status, created_at FROM quotes ORDER BY created_at DESC LIMIT 10;

-- Ultime 10 fatture
SELECT id, number, status, amount, created_at FROM invoices ORDER BY created_at DESC LIMIT 10;

-- Ultimi 10 pagamenti
SELECT id, provider, amount, status, created_at FROM payments ORDER BY created_at DESC LIMIT 10;
```

### Statistiche Finance
```sql
-- Totale fatturato
SELECT 
  SUM(amount) as totale,
  currency,
  COUNT(*) as num_fatture
FROM invoices 
WHERE status = 'paid'
GROUP BY currency;

-- Pagamenti per provider
SELECT 
  provider,
  COUNT(*) as numero,
  SUM(amount) as totale
FROM payments
WHERE status = 'completed'
GROUP BY provider;
```

---

## 🔐 Autenticazione

### Creare Nuovo Utente Admin
```sql
-- Prima crea il team (se non esiste)
INSERT INTO teams (name, type, created_at)
VALUES ('Admin Team', 'internal', NOW())
RETURNING id;

-- Poi crea l'utente (sostituisci <team_id>)
INSERT INTO users (
  code11, email, full_name, role, status, team_id, created_at
)
VALUES (
  'ADM' || LPAD(NEXTVAL('users_seq')::TEXT, 8, '0'),
  'admin@aycl.com',
  'Admin User',
  'admin',
  'active',
  '<team_id>',
  NOW()
)
RETURNING *;
```

### Reset Password (se implementato)
```bash
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@aycl.com"}'
```

---

## 🌐 API Testing

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@aycl.com", "password": "password"}'
```

### Testare Endpoint con Token
```bash
TOKEN="your_token_here"

# Get quotes
curl http://localhost:3001/quotes \
  -H "Authorization: Bearer $TOKEN"

# Get invoices
curl http://localhost:3001/invoices \
  -H "Authorization: Bearer $TOKEN"

# Download PDF
curl "http://localhost:3001/quotes/{id}/pdf?token=$TOKEN" \
  --output quote.pdf
```

---

## 📝 Git

### Status
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL
git status
```

### Commit Modifiche
```bash
git add .
git commit -m "Aggiornate tutte le pagine Finance con stile moderno"
```

### Push
```bash
git push origin main
```

### Vedere Storia Commit
```bash
git log --oneline --graph --all --decorate
```

---

## 🔄 Riavvio Rapido

### Riavviare Tutto
```bash
# Terminal 1 - Backend
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend && npm run dev

# Terminal 2 - Frontend
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend && npm run dev
```

### Riavviare Solo Backend
```bash
# Ctrl+C per fermare
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm run dev
```

---

## 🐛 Troubleshooting

### Porta già in uso
```bash
# Trova processo sulla porta 3001
lsof -i :3001

# Killa il processo
kill -9 <PID>

# Oppure trova e killa in un comando
lsof -ti :3001 | xargs kill -9
```

### Database non risponde
```bash
# Verifica che PostgreSQL sia in esecuzione
brew services list | grep postgresql

# Riavvia PostgreSQL
brew services restart postgresql
```

### TypeScript Errors
```bash
# Ricompila TypeScript
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npx tsc --noEmit

# Frontend
cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend
npx tsc --noEmit
```

---

## 📚 Documentazione

### File di Documentazione Disponibili
```
/Users/edoardoatria/Desktop/CRM_AYCL/
├── README.md                              # Overview generale
├── PDF_DOWNLOAD_COMPLETO.md              # Sistema download PDF
├── FIX_AUTH_TOKEN_DOWNLOAD.md            # Fix autenticazione download
├── FINANCE_PAGES_UPDATED.md              # Aggiornamento pagine Finance
└── COMANDI_UTILI.md                      # Questo file
```

### API Documentation
```bash
# Apri la specifica OpenAPI
open /Users/edoardoatria/Desktop/CRM_AYCL/spec/openapi.yaml
```

---

## ⚡ Shortcuts

### Dev Mode Full Stack
```bash
# In un unico comando (richiede tmux)
tmux new-session -d -s crm 'cd /Users/edoardoatria/Desktop/CRM_AYCL/backend && npm run dev' \; \
  split-window -h 'cd /Users/edoardoatria/Desktop/CRM_AYCL/admin_frontend && npm run dev' \; \
  attach
```

### Stop All
```bash
# Killa tutti i processi node (ATTENZIONE!)
killall node

# Più sicuro: solo le porte specifiche
lsof -ti :3001,:5173 | xargs kill -9
```

---

## 🎯 Quick Wins

### Vedere Statistiche Veloci
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
psql postgresql://localhost:5432/crm_aycl -f scripts/checkFinanceStatus.sql
```

### Pulire e Ricominciare
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
psql postgresql://localhost:5432/crm_aycl -f scripts/cleanFinanceData.sql
```

### Build Completa
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL
(cd backend && npm run build) && (cd admin_frontend && npm run build)
```

---

**Ultimo aggiornamento**: 21 Ottobre 2025  
**Mantieni questo file aggiornato** quando aggiungi nuovi comandi utili!

