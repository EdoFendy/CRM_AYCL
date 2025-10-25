# 📊 Analisi Flusso Starter Kit - Gap Analysis

## 🎯 Flusso Completo dal Diagramma

```
Start Kit → Chiudere un cliente → [6 funzionalità principali]
```

---

## 📋 Funzionalità Identificate

### ✅ **GIÀ IMPLEMENTATE** (Verde nel diagramma)

1. **Generazione Carrelli** ✅
   - Form per creare carrelli personalizzati
   - Selezione prodotti dal catalogo
   - Calcolo totale automatico
   - Generazione PDF

2. **Configura Drive Test** ✅
   - Form per Drive Test personalizzato
   - Campi: azienda, email, settori, prezzo, validità
   - Generazione PDF preventivo

3. **Creazione Prodotti Personalizzati** ✅
   - Form per creare nuovi prodotti WooCommerce
   - Campi: nome, prezzo, valuta, SKU, descrizione
   - Integrazione con catalogo

4. **I settori partono con Tutti i settori** ✅
   - Logica già presente (campo "sectors" opzionale)

---

## ❌ **FUNZIONALITÀ MANCANTI** (Rosso nel diagramma)

### 1. 🔴 **Chiudere un Cliente** (PRIORITÀ ALTA)
**Status**: ❌ Non implementato

**Descrizione**:
- Primo step del flusso
- Selezione/creazione cliente prima di procedere
- Collegamento tra cliente e tutte le operazioni successive

**Implementazione Necessaria**:
```typescript
// Componente ClientSelector
- Ricerca clienti esistenti (companies/contacts)
- Creazione nuovo cliente rapido
- Selezione cliente attivo per sessione
- Display cliente selezionato in header
```

**Endpoint Backend**:
- ✅ `GET /companies` (già esistente)
- ✅ `GET /contacts` (già esistente)
- ✅ `POST /companies` (già esistente)
- ✅ `POST /contacts` (già esistente)

---

### 2. 🔴 **Genera Contratto Associato al Carrello x4** (PRIORITÀ ALTA)
**Status**: ❌ Non implementato

**Descrizione**:
- Ogni carrello genera 4 contratti associati
- Contratti collegati al cliente selezionato
- Tracking della relazione carrello → contratti

**Implementazione Necessaria**:
```typescript
// CartBuilderSection - modifiche
- Dopo generazione carrello, creare 4 contratti
- Contratti con pack diversi o varianti
- Salvare relazione nel DB
- Mostrare contratti generati
```

**Endpoint Backend**:
- ✅ `POST /contracts` (già esistente)
- ❌ Modificare logica per supportare batch creation
- ❌ Aggiungere campo `quote_id` o `cart_id` per collegamento

**Database Schema Necessario**:
```sql
ALTER TABLE contracts ADD COLUMN quote_id UUID REFERENCES quotes(id);
ALTER TABLE contracts ADD COLUMN cart_reference TEXT;
```

---

### 3. 🔴 **Carrello Drive Test Personalizzato** (PRIORITÀ MEDIA)
**Status**: ⚠️ Parzialmente implementato

**Descrizione**:
- Drive Test deve avere listino quotazione personalizzata
- Scade in 7 giorni
- Solo 1 per cliente

**Implementazione Necessaria**:
```typescript
// DriveTestSection - modifiche
- Aggiungere validazione: 1 solo Drive Test attivo per cliente
- Aggiungere scadenza automatica (7 giorni)
- Generare listino quotazione dettagliato
- Collegare a cliente selezionato
```

**Logica Business**:
- Verificare Drive Test esistenti per cliente
- Bloccare creazione se già presente uno attivo
- Auto-scadenza dopo 7 giorni
- Notifica al seller quando scade

---

### 4. 🔴 **Generazione PropSell e UpSell** (PRIORITÀ ALTA)
**Status**: ❌ Non implementato

**Descrizione**:
- Generazione offerte PropSell (cross-sell)
- Generazione offerte UpSell (upgrade)
- Basate su opportunità esistenti o nuove

**Implementazione Necessaria**:
```typescript
// Nuova sezione: PropSellUpSellSection
- Form per PropSell
- Form per UpSell
- Selezione opportunità di riferimento
- Generazione PDF offerta
- Salvataggio in DB come offer
```

**Endpoint Backend**:
- ✅ `POST /offers` (già esistente)
- ❌ Aggiungere campo `offer_type` ('propsell' | 'upsell' | 'standard')
- ❌ Logica per calcolare pricing basato su offerta originale

**Database Schema Necessario**:
```sql
ALTER TABLE offers ADD COLUMN offer_type TEXT DEFAULT 'standard' 
  CHECK (offer_type IN ('standard', 'propsell', 'upsell'));
ALTER TABLE offers ADD COLUMN parent_offer_id UUID REFERENCES offers(id);
```

---

### 5. 🔴 **Creazione Codici Sconto** (PRIORITÀ ALTA)
**Status**: ❌ Non implementato

**Descrizione**:
- Creazione codici sconto personalizzati
- Scadenza configurabile
- Applicabili a prodotti/bundle specifici

**Implementazione Necessaria**:
```typescript
// Nuova sezione: DiscountCodesSection
- Form creazione codice sconto
- Campi:
  - Codice (es: SUMMER2024)
  - Tipo sconto (percentuale/fisso)
  - Valore sconto
  - Data scadenza
  - Prodotti applicabili
  - Limite utilizzi
```

**Endpoint Backend** (DA CREARE):
```typescript
POST /discount-codes
GET /discount-codes
PATCH /discount-codes/:id
DELETE /discount-codes/:id
```

**Database Schema Necessario**:
```sql
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  applicable_products JSONB, -- array di product IDs
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 6. 🔴 **Configura Bundle** (PRIORITÀ ALTA)
**Status**: ❌ Non implementato

**Descrizione**:
- Inclusione di più pacchetti con sconto sul totale
- Tempo di validità selezionabile
- UpSell incluso nel bundle

**Implementazione Necessaria**:
```typescript
// Nuova sezione: BundleConfigSection
- Selezione multipla prodotti/pacchetti
- Calcolo prezzo totale
- Applicazione sconto bundle
- Validità temporale
- Opzione UpSell incluso
- Generazione PDF bundle
```

**Endpoint Backend** (DA CREARE):
```typescript
POST /bundles
GET /bundles
PATCH /bundles/:id
DELETE /bundles/:id
POST /bundles/:id/generate-pdf
```

**Database Schema Necessario**:
```sql
CREATE TABLE bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  products JSONB NOT NULL, -- array di {product_id, quantity, price}
  subtotal DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  includes_upsell BOOLEAN DEFAULT false,
  upsell_details JSONB,
  created_by UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🔄 Flusso Completo Corretto

```
1. Start Kit
   ↓
2. Chiudere un Cliente (SELEZIONA/CREA CLIENTE) ❌ MANCANTE
   ↓
   ├─→ Generazione Carrelli ✅
   │   └─→ Genera contratto associato al carrello x4 ❌ MANCANTE
   │
   ├─→ Configura Drive Test ✅
   │   ├─→ Carrello Drive test personalizzato ⚠️ PARZIALE
   │   │   └─→ Deve avere listino quotazione personalizzata
   │   ├─→ scade in 7g ❌ MANCANTE
   │   └─→ 1 solo per cliente ❌ MANCANTE
   │
   ├─→ generazione PropSell e UpSell ❌ MANCANTE
   │
   ├─→ Creazione prodotti personalizzati ✅
   │
   ├─→ Creazione codici sconto ❌ MANCANTE
   │   └─→ A scadenza ❌ MANCANTE
   │
   └─→ Configura Bundle ❌ MANCANTE
       └─→ Inclusione di più pacchetti con uno sconto sul totale
           con tempo di validità selezionabile + Upsell ❌ MANCANTE
```

---

## 📊 Statistiche Implementazione

### Funzionalità Principali
- ✅ **Implementate**: 4/10 (40%)
- ⚠️ **Parziali**: 1/10 (10%)
- ❌ **Mancanti**: 5/10 (50%)

### Priorità
- 🔴 **Alta**: 5 funzionalità
- 🟡 **Media**: 1 funzionalità
- 🟢 **Bassa**: 0 funzionalità

---

## 🎯 Piano di Implementazione Consigliato

### **FASE 1: Foundation** (Priorità Critica)
1. ✅ **Chiudere un Cliente**
   - Componente ClientSelector
   - Context per cliente selezionato
   - UI per selezione/creazione rapida

2. ✅ **Database Schema Updates**
   - Tabella discount_codes
   - Tabella bundles
   - Modifiche a contracts (quote_id, cart_reference)
   - Modifiche a offers (offer_type, parent_offer_id)

### **FASE 2: Core Features** (Priorità Alta)
3. ✅ **Genera Contratto x4 per Carrello**
   - Logica batch creation contratti
   - UI per visualizzare contratti generati
   - Collegamento carrello → contratti

4. ✅ **PropSell e UpSell**
   - Nuova sezione UI
   - Form per entrambi i tipi
   - Integrazione con offers
   - Generazione PDF

5. ✅ **Codici Sconto**
   - Backend endpoints completi
   - UI per creazione/gestione
   - Validazione e scadenza
   - Applicazione a checkout

6. ✅ **Configura Bundle**
   - Backend endpoints completi
   - UI builder bundle
   - Calcolo sconti
   - Generazione PDF

### **FASE 3: Enhancements** (Priorità Media)
7. ✅ **Drive Test Migliorato**
   - Validazione 1 per cliente
   - Auto-scadenza 7 giorni
   - Listino quotazione personalizzato
   - Notifiche scadenza

---

## 🛠️ Modifiche Tecniche Necessarie

### Backend

#### Nuovi Moduli
```
backend/src/modules/
├── discount-codes/
│   ├── discount-codes.router.ts
│   ├── discount-codes.service.ts
│   └── discount-codes.types.ts
└── bundles/
    ├── bundles.router.ts
    ├── bundles.service.ts
    └── bundles.types.ts
```

#### Nuove Migrazioni
```sql
-- 007_discount_codes.sql
-- 008_bundles.sql
-- 009_enhanced_offers.sql
-- 010_enhanced_contracts.sql
```

### Frontend (Seller)

#### Nuovi Componenti
```
seller_frontend/src/
├── components/
│   └── kit/
│       ├── ClientSelector.tsx
│       ├── PropSellUpSellForm.tsx
│       ├── DiscountCodeForm.tsx
│       └── BundleBuilder.tsx
├── context/
│   └── SelectedClientContext.tsx
└── pages/
    └── SellerKitPage.tsx (MAJOR REFACTOR)
```

#### Nuove Sezioni SellerKitPage
```typescript
type Section = 
  | 'client'           // NUOVO
  | 'referral'
  | 'cart'
  | 'drive'
  | 'propsell-upsell'  // NUOVO
  | 'products'
  | 'discount-codes'   // NUOVO
  | 'bundles'          // NUOVO
  | 'resources'
  | 'checkouts';
```

---

## 🎨 UI/UX Improvements

### Header con Cliente Selezionato
```
┌─────────────────────────────────────────────────┐
│ 🎯 Starter Kit                                  │
│                                                 │
│ 👤 Cliente: Acme Corp                    [×]   │
│    📧 contact@acme.com                          │
└─────────────────────────────────────────────────┘
```

### Nuove Tab Navigation
```
[👤 Cliente] [🔗 Referral] [🛒 Carrelli] [🚗 Drive Test] 
[📈 PropSell/UpSell] [📦 Prodotti] [🎟️ Codici Sconto] 
[📦 Bundle] [📚 Risorse] [💳 Checkouts]
```

---

## 📝 Note Implementative

### Logica Business Critica

1. **Cliente Obbligatorio**
   - Tutte le operazioni (tranne visualizzazione referral) richiedono cliente selezionato
   - Mostrare warning se nessun cliente selezionato
   - Disabilitare form senza cliente

2. **Drive Test Unico**
   - Query per verificare Drive Test attivi per cliente
   - Bloccare creazione se esiste uno attivo (non scaduto)
   - Mostrare Drive Test esistente con countdown scadenza

3. **Contratti da Carrello**
   - Generare 4 contratti con pack diversi:
     - Setup-Fee
     - Performance (3 varianti o durate diverse)
   - Collegare tutti al carrello originale
   - Mostrare lista contratti generati

4. **Bundle Pricing**
   - Calcolare subtotal da prodotti selezionati
   - Applicare sconto percentuale o fisso
   - Mostrare risparmio in evidenza
   - Validare date validità

5. **Discount Codes**
   - Codice univoco (validazione backend)
   - Tracking utilizzi vs limite
   - Auto-disabilitazione alla scadenza
   - Applicabilità a prodotti specifici

---

## 🚀 Deliverables

### Milestone 1: Foundation (1-2 giorni)
- [ ] ClientSelector component
- [ ] SelectedClientContext
- [ ] Database migrations
- [ ] Backend endpoints discount-codes
- [ ] Backend endpoints bundles

### Milestone 2: Core Features (3-4 giorni)
- [ ] Contratti x4 da carrello
- [ ] PropSell/UpSell section
- [ ] Discount Codes section
- [ ] Bundle Builder section

### Milestone 3: Polish (1-2 giorni)
- [ ] Drive Test enhancements
- [ ] UI/UX improvements
- [ ] Testing completo
- [ ] Documentazione

---

## 🎯 Obiettivo Finale

Un **Starter Kit completo e professionale** che permette al seller di:

1. ✅ Selezionare/creare un cliente
2. ✅ Generare carrelli con contratti associati
3. ✅ Configurare Drive Test personalizzati con scadenza
4. ✅ Creare offerte PropSell e UpSell
5. ✅ Gestire prodotti personalizzati
6. ✅ Creare codici sconto con scadenza
7. ✅ Configurare bundle complessi con UpSell
8. ✅ Monitorare tutte le attività tramite checkouts

**Tutto collegato al cliente selezionato e tracciato nel sistema.**

---

## 📊 Impatto Stimato

- **Linee di Codice**: ~3000-4000 LOC
- **Nuovi File**: ~15-20 files
- **Database Tables**: 2 nuove tabelle + 4 modifiche
- **API Endpoints**: ~12 nuovi endpoints
- **Tempo Sviluppo**: 6-8 giorni
- **Complessità**: 🔴 Alta

---

**Status**: 📋 **Analisi Completata - Pronto per Implementazione**

