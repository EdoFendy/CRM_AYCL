# 🎯 SELLER KIT - Architettura Professionale

## 📋 ANALISI SISTEMA ESISTENTE

### Database Tables (✅ Esistenti)
- `quotes` - Preventivi con line_items, totali, PDF
- `invoices` - Fatture collegate a contratti/quote
- `contracts` - Contratti con versioni e firme
- `doc_pack_files` - File statici (Pitch Deck, Proposte) per pack
- `pdf_templates` - Template PDF con mappatura campi
- `bundles` - Bundle prodotti con sconti
- `discount_codes` - Codici sconto
- `contacts` - Contatti con owner_id
- `companies` - Aziende con owner_id

### Backend APIs (✅ Esistenti)
- `/api/pdf-templates/*` - Gestione template PDF
- `/api/docs/generate` - Genera quote/invoice/receipt
- `/api/quotes/*` - CRUD preventivi
- `/api/contracts/*` - CRUD contratti
- `/api/bundles/*` - CRUD bundle
- `/api/doc-pack-files/*` - Gestione file statici pack
- `/api/woocommerce/products` - Lista prodotti
- `/api/checkout/encrypt` - Encryption checkout order

### Admin Features (✅ Esistenti)
- PDFTemplatesPage - Upload e gestione template PDF
- DocPackFilesPage - Upload Pitch Deck e Proposte per pack
- Template editor con mappatura campi dinamica

---

## 🏗️ ARCHITETTURA SELLER KIT

### 1. 📄 PITCH DECK & RISORSE

**Flow:**
1. Admin carica file in `doc_pack_files` per ogni pack (Setup-Fee, Performance, etc.)
2. Seller seleziona cliente
3. Seller vede lista risorse disponibili
4. Seller può:
   - Scaricare direttamente
   - Inviare via email al cliente (con API backend)

**API Necessarie:**
```typescript
// Backend
POST /api/doc-pack-files/:id/send-email
{
  recipient_email: string,
  recipient_name: string,
  message?: string,
  contact_id?: uuid,
  company_id?: uuid
}
```

**Database:** ✅ Già esistente (`doc_pack_files`)

---

### 2. 📝 GENERA PROPOSTA

**Flow:**
1. Seller seleziona cliente (contact o company)
2. Sistema pre-compila dati da database:
   - Nome azienda/contatto
   - Email, telefono
   - Dati fiscali se disponibili
3. Seller aggiunge:
   - Servizi/prodotti (da lista WooCommerce)
   - Descrizioni personalizzate
   - Prezzi
4. Sistema genera PDF usando template admin
5. PDF salvato e inviato via email

**API Necessarie:**
```typescript
// Backend
POST /api/proposals/generate
{
  customer_type: 'contact' | 'company',
  customer_id: uuid,
  services: Array<{
    name: string,
    description: string,
    price: number
  }>,
  template_id: uuid,
  notes?: string,
  valid_until: date
}

// Response
{
  proposal_id: uuid,
  pdf_url: string,
  number: string
}
```

**Database:** Nuova tabella `proposals`
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('contact', 'company')),
  contact_id UUID REFERENCES contacts(id),
  company_id UUID REFERENCES companies(id),
  customer_data JSONB NOT NULL,
  services JSONB NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  currency CHAR(3) DEFAULT 'EUR',
  notes TEXT,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  pdf_url TEXT,
  template_id UUID REFERENCES pdf_templates(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3. 💰 GENERA PREVENTIVO

**Flow:**
1. Seller seleziona cliente
2. Sistema pre-compila dati cliente
3. Seller aggiunge line items:
   - Descrizione
   - Quantità
   - Prezzo unitario
   - IVA
4. Sistema calcola totali automaticamente
5. Genera PDF usando template admin
6. Salva in tabella `quotes` (✅ già esistente)
7. Invia via email

**API:** ✅ Già esistente (`POST /api/docs/generate` con kind='quote')

**Miglioramenti Necessari:**
- Pre-compilazione automatica dati cliente
- Invio email automatico
- Selezione template PDF

---

### 4. 🚗 CONFIGURA DRIVE TEST

**Flow:**
1. Seller seleziona cliente
2. Sistema mostra form configurazione:
   - Revenue band
   - Geografia
   - Settore
3. Sistema calcola prezzo (min/max)
4. Seller può modificare prezzo entro range
5. Sistema genera checkout order encrypted
6. Genera link checkout con referral code

**API:** ✅ Già implementato
- Encryption: `/api/checkout/encrypt`
- Referral: `/api/referral/me`

**Database:** Usa `quotes` con `quote_type='drive_test'`

---

### 5. 📦 CREA BUNDLE

**Flow:**
1. Seller seleziona cliente
2. Seller aggiunge prodotti da WooCommerce
3. Per ogni prodotto:
   - Quantità
   - Sconto individuale (% o fisso)
4. Sconto globale opzionale
5. Sistema calcola totali
6. Salva bundle in database
7. Genera checkout link encrypted

**API Necessarie:**
```typescript
// Backend
POST /api/bundles
{
  name: string,
  description?: string,
  customer_type: 'contact' | 'company',
  customer_id: uuid,
  products: Array<{
    product_id: number,
    quantity: number,
    discount_type: 'percentage' | 'fixed',
    discount_value: number
  }>,
  global_discount?: {
    type: 'percentage' | 'fixed',
    value: number
  },
  seller_id: uuid
}

// Response
{
  bundle_id: uuid,
  checkout_url: string,
  total: number
}
```

**Database:** ✅ Già esistente (`bundles`)

---

### 6. 📋 GENERA CONTRATTO

**Flow:**
1. Seller seleziona cliente
2. Seller sceglie tipo contratto:
   - Performance (revenue share)
   - Setup Fee
3. Sistema pre-compila dati cliente
4. Seller compila campi specifici:
   - Performance: % revenue share, durata
   - Setup Fee: importo fee
5. Sistema genera PDF da template admin
6. Salva in `contracts`
7. Invia per firma elettronica

**API:** ✅ Parzialmente esistente
- Migliorare `/api/contracts` per supportare seller workflow
- Aggiungere invio automatico firma

---

### 7. 💵 GESTISCI FATTURE

**Flow:**
1. Seller seleziona contratto di riferimento
2. Seller carica prova pagamento (immagine/PDF)
3. Seller inserisce importo
4. Se NO prova pagamento:
   - Richiesta approvazione admin
   - Status = 'pending_approval'
5. Se SI prova pagamento:
   - Genera fattura automaticamente
   - Status = 'paid'

**API Necessarie:**
```typescript
// Backend
POST /api/invoices/seller-request
{
  contract_id: uuid,
  amount: number,
  payment_proof?: File,
  notes?: string,
  requires_approval: boolean
}
```

**Database:** ✅ Usa `invoices` esistente
- Aggiungere campo `approval_status`

---

## 🔄 WORKFLOW INTEGRATO

### Admin Responsibilities
1. ✅ Upload template PDF per ogni tipo documento
2. ✅ Mappa campi dinamici nei template
3. ✅ Upload Pitch Deck e risorse per pack
4. ✅ Assegna contatti/aziende ai seller
5. ✅ Approva fatture senza prova pagamento

### Seller Responsibilities
1. Seleziona cliente dal portfolio
2. Usa strumenti kit per:
   - Inviare risorse
   - Generare proposte/preventivi
   - Configurare Drive Test
   - Creare bundle
   - Generare contratti
   - Richiedere fatture
3. Tutti i dati salvati nel database
4. Tutto tracciato e auditabile

---

## 📊 DATI AUTOMATICI

### Pre-compilazione Cliente
Quando seller seleziona cliente, sistema recupera:
- Nome/Ragione sociale
- Email
- Telefono
- Indirizzo
- P.IVA / Codice Fiscale
- PEC
- Contatti associati (se azienda)

### Numerazione Automatica
- Proposte: `PROP-YYYY-NNNNNN`
- Preventivi: `QUOT-YYYY-NNNNNN`
- Contratti: `CONT-YYYY-NNNNNN`
- Fatture: `INV-YYYY-NNNNNN`

### Email Automatiche
- Invio proposta → Email con PDF allegato
- Invio preventivo → Email con PDF allegato
- Invio contratto → Email con link firma
- Fattura generata → Email con PDF allegato

---

## 🚀 IMPLEMENTAZIONE PRIORITÀ

### Phase 1 (Immediate)
1. ✅ Pitch Deck download/send
2. ✅ Drive Test configurator
3. ✅ Bundle builder

### Phase 2 (Next)
4. Genera Preventivo (migliora esistente)
5. Genera Proposta (nuovo)
6. Gestisci Fatture (nuovo)

### Phase 3 (Later)
7. Genera Contratto (migliora esistente)
8. Sistema firma elettronica integrato

---

## 🔒 SICUREZZA & VALIDAZIONE

- Seller può vedere solo clienti assegnati (owner_id)
- Tutti i documenti tracciati in audit_log
- PDF generati salvati in storage sicuro
- Email inviate tramite backend (no client-side)
- Checkout links encrypted server-side
- Validazione prezzi Drive Test (min/max)
- Validazione sconti bundle

---

## 📈 METRICHE & TRACKING

Ogni azione seller tracciata:
- Proposte generate
- Preventivi inviati
- Drive Test configurati
- Bundle creati
- Contratti generati
- Fatture richieste

Dashboard seller mostra:
- Conversione proposte → contratti
- Revenue generato
- Clienti attivi
- Performance mensile


