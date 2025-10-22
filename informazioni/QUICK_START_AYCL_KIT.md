# ⚡ Quick Start - AYCL Kit

## 🚀 Setup Rapido (5 minuti)

### 1. Aggiungi credenziali WooCommerce

Apri `/backend/.env` e aggiungi:

```env
WC_URL=https://checkout.allyoucanleads.com
WC_KEY=ck_your_consumer_key_here
WC_SECRET=cs_your_consumer_secret_here
```

### 2. Avvia il Backend

```bash
cd backend
npm run dev
```

Il server parte su `http://localhost:3001`

### 3. Avvia il Frontend

```bash
cd admin_frontend
npm run dev
```

L'app parte su `http://localhost:5173`

---

## 🎯 Test Rapido della Funzionalità

### 1. Accedi alla Dashboard
- Vai su `http://localhost:5173`
- Login con le tue credenziali
- Naviga verso **AYCL Kit** nel menu

### 2. Carica un File Pack (Pitch/Proposal)
1. Seleziona un pack (es. "Setup-Fee")
2. Nella sezione "Pitch deck" o "Proposta", clicca **"Carica file"**
3. Seleziona un PDF o PPT
4. Il file viene caricato e appare nella lista

### 3. Genera un Preventivo
1. Seleziona tab **"Preventivo"**
2. Compila:
   - Numero: `PRV-2025-001` (opzionale)
   - Data: Oggi
3. **Seleziona Cliente**:
   - Click su "Contatto" o "Azienda"
   - Cerca (es. "Mario")
   - Click sul risultato per selezionarlo
4. **Aggiungi Prodotti**:
   - Cerca prodotto WooCommerce (es. "setup")
   - Click sul prodotto per aggiungerlo
   - OPPURE click "Nuovo prodotto" per crearne uno
5. Verifica totali nel riepilogo a destra
6. Click **"Genera Preventivo"**

### 4. Verifica Database

```sql
-- In psql o DBeaver
SELECT * FROM quotes ORDER BY created_at DESC LIMIT 5;
SELECT * FROM doc_pack_files ORDER BY uploaded_at DESC LIMIT 5;
```

---

## 🔍 Troubleshooting

### Errore "WooCommerce connection failed"
- Verifica credenziali in `.env`
- Testa manualmente: `curl https://checkout.allyoucanleads.com/wp-json/wc/v3/products?consumer_key=YOUR_KEY&consumer_secret=YOUR_SECRET`

### Errore upload file
- Verifica permessi cartella: `chmod 755 backend/uploads`
- Controlla dimensione file (max 50MB)

### Non vedo contatti/aziende
- Verifica che ci siano dati nel DB: `SELECT COUNT(*) FROM contacts;`
- Esegui seed se vuoto: `npm run seed`

---

## 📋 Endpoint Principali

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/doc-files` | GET | Lista file pack |
| `/doc-files/upload` | POST | Upload file |
| `/woocommerce/products` | GET | Lista prodotti WooCommerce |
| `/woocommerce/products` | POST | Crea prodotto |
| `/docs/generate` | POST | Genera preventivo/fattura/ricevuta |
| `/contacts` | GET | Lista contatti |
| `/companies` | GET | Lista aziende |

Tutti richiedono `Authorization: Bearer TOKEN`

---

## 💡 Tips

- **Preventivo → Fattura**: Salva l'ID del preventivo, poi quando crei fattura collegala
- **Prodotti Ricorrenti**: Salvali su WooCommerce per riutilizzarli
- **Template Documenti**: Crea preventivi "template" con prodotti standard
- **Backup File**: Gli upload sono in `backend/uploads/doc-pack-files/`

---

## ✅ Checklist Pre-Produzione

- [ ] Configurare storage cloud (S3) per upload
- [ ] Integrare provider PDF per generazione documenti
- [ ] Configurare CORS correttamente
- [ ] Testare con dati reali
- [ ] Setup backup automatico cartella uploads
- [ ] Aggiungere rate limiting su upload endpoint

---

**Pronto!** 🎉 Ora puoi usare AYCL Kit per gestire i tuoi pack e generare documenti.

