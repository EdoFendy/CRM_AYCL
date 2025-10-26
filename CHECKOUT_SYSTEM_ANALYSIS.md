# Analisi Sistema Checkout e Drive Test

## 📊 Drive Test Calculator - Logica di Pricing

### Coefficienti Base (Italia)
```typescript
const BASE_ITALIA = [
  { id: "band_100k",       label: "< €100K",         min: 80,  max: 80  },
  { id: "band_100k_500k",  label: "€100K – €500K",   min: 90,  max: 95  },
  { id: "band_500k_1m",    label: "€500K – €1M",     min: 100, max: 120 },
  { id: "band_1m_5m",      label: "€1M – €5M",       min: 120, max: 140 },
  { id: "band_5m_10m",     label: "€5M – €10M",      min: 140, max: 160 },
  { id: "band_10m_20m",    label: "€10M – €20M",     min: 160, max: 180 },
  { id: "band_20m_50m",    label: "€20M – €50M",     min: 180, max: 220 },
  { id: "band_50m_plus",   label: "€50M+",           min: 220, max: 300 }
]
```

### Coefficienti Geografici
```typescript
const COEFF_GEO = [
  { id: "geo_default",   label: "Predefinito",                    min: 1.0,  max: 1.0 },
  { id: "geo_italia",    label: "Italia",                        min: 1.0,  max: 1.0 },
  { id: "geo_sp_po",     label: "Spagna / Portogallo",           min: 1.1,  max: 1.1 },
  { id: "geo_fr_de_be",  label: "Francia / Germania / Benelux",  min: 1.2,  max: 1.3 },
  { id: "geo_uk_ie",     label: "UK / Irlanda",                  min: 1.25, max: 1.35 },
  { id: "geo_est",       label: "Est Europa",                     min: 1.2,  max: 1.4 },
  { id: "geo_nordics",   label: "Nordics (SE/NO/DK/FI)",         min: 1.2,  max: 1.3 },
  { id: "geo_us_ca",     label: "USA / Canada",                  min: 1.5,  max: 1.6 },
  { id: "geo_latam",     label: "LATAM",                          min: 1.1,  max: 1.2 },
  { id: "geo_me",        label: "Middle East",                    min: 1.3,  max: 1.6 },
  { id: "geo_africa",    label: "Africa",                         min: 1.2,  max: 1.3 },
  { id: "geo_asia",      label: "Asia (SG/HK/JP)",                min: 1.4,  max: 1.6 }
]
```

### Coefficienti Settoriali
```typescript
const COEFF_SAAS = { min: 1.0826, max: 1.115078 }
const COEFF_SERVICES = { min: 1.093426, max: 1.223338 }
const COEFF_MANUFACTURING = { min: 1.277468, max: 1.429032 }
const COEFF_AUTOMOTIVE = { min: 1.288294, max: 1.439858 }
const COEFF_BANKING = { min: 1.602248, max: 2.208504 }
const COEFF_INSURANCE = { min: 1.6239, max: 2.230156 }
const COEFF_FINTECH = { min: 1.51564, max: 1.667204 }
const COEFF_ASSET_MANAGEMENT = { min: 1.6239, max: 2.230156 }
const COEFF_HEALTHCARE = { min: 1.504814, max: 1.67803 }
const COEFF_REAL_ESTATE = { min: 1.331598, max: 1.483162 }
const COEFF_RETAIL = { min: 1.212512, max: 1.364076 }
const COEFF_ECOMMERCE = { min: 1.13673, max: 1.266642 }
const COEFF_ENERGY = { min: 2.230156, max: 2.403372 }
```

### Formula di Calcolo

```typescript
// Prezzo unitario = media(min,max) di base e geo * coefficiente massimo settore; arrotondato a 5
const unitPrice = () => {
  const baseAvg = (selectedBand.min + selectedBand.max) / 2
  const geoAvg = (selectedGeo.min + selectedGeo.max) / 2
  const sectorMultiplier = selectedSectorOption?.max ?? 1
  return round5(baseAvg * geoAvg * sectorMultiplier)
}

// Range di prezzo modificabile dal seller
const priceRange = () => {
  const sectorMultiplier = selectedSectorOption?.max ?? 1
  const min = round5(selectedBand.min * selectedGeo.min * sectorMultiplier)
  const max = round5(selectedBand.max * selectedGeo.max * sectorMultiplier)
  return { min, max }
}

// Totale
const total = unitPrice * quantity

// Arrotondamento a multipli di 5
function round5(value: number): number {
  return Math.round(value / 5) * 5
}
```

### Regole
- **Quantità**: Min 5, Max 20 lead
- **High Revenue**: Aziende ≥ €10M NON possono fare Drive Test
- **Seller Flexibility**: Il seller può modificare il prezzo entro il range min-max

## 🔐 Sistema di Encryption

### Flusso Encryption
1. **Seller Frontend**: Crea ordine Drive Test/Bundle
2. **API Call**: POST `/api/checkout/order` con ordine
3. **Backend**: Cripta ordine con AES-256-GCM
4. **Response**: Token encrypted
5. **Redirect**: `/checkout?order={token}&ref={referralCode}`

### Struttura DriveTestOrder
```typescript
interface DriveTestOrder {
  package: string;              // "Drive Test"
  currency: string;             // "EUR"
  unitPrice: number;            // Prezzo per lead
  quantity: number;             // Numero di lead (5-20)
  total: number;                // unitPrice * quantity
  priceRange: {
    min: number;                // Prezzo minimo modificabile
    max: number;                // Prezzo massimo modificabile
  };
  selections: {
    revenueBand: { id: string; label: string; };
    geography: { id: string; label: string; };
    sector: { id: string; label: string; };
    riskProfile: number;        // Default 50
  };
  metadata: {
    locale: string;             // "it-IT"
    generatedAt: string;        // ISO timestamp
    productName?: string;
    basePrice?: string;         // Prezzo listino (se scontato)
    discountFromPrice?: string; // Prezzo scontato
    macroSectorId?: string;
    macroSectorLabel?: string;
    sectorLevel?: "macro" | "granular";
    sellerId?: string;          // ID seller CRM
    referralCode?: string;      // Codice referral seller
    clientId?: string;          // ID cliente CRM
  };
}
```

## 🎯 Sistema Referral

### Database Schema
```sql
-- Tabella users (sellers)
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN referral_link TEXT;
ALTER TABLE users ADD COLUMN checkout_base_url TEXT DEFAULT 'https://allyoucanleads.com';

-- Tabella referral_links
CREATE TABLE referral_links (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  referral_code TEXT UNIQUE NOT NULL,
  checkout_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella checkout_requests (richieste da homepage)
CREATE TABLE checkout_requests (
  id UUID PRIMARY KEY,
  referral_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  request_type TEXT CHECK (request_type IN ('drive_test', 'custom', 'bundle')),
  product_data JSONB DEFAULT '{}'::jsonb,
  pricing_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  seller_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella checkouts (checkout completati)
CREATE TABLE checkouts (
  id UUID PRIMARY KEY,
  seller_user_id UUID REFERENCES users(id),
  referral_code TEXT,
  referral_link TEXT,
  order_data JSONB,
  amount NUMERIC(15,2),
  currency CHAR(3) DEFAULT 'EUR',
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Flusso Referral
1. **Seller genera link**: `/api/referral/me` → ottiene referral_code
2. **Link condiviso**: `https://allyoucanleads.com/checkout?ref={referralCode}`
3. **Cliente accede**: Homepage valida referral via `/api/referral/validate/{code}`
4. **Checkout**: Token order + ref parameter
5. **Tracking**: Checkout associato a seller_user_id nel CRM

## 📦 Bundle System

### Struttura Bundle
```typescript
interface BundleCheckoutOrder {
  type: 'bundle';
  bundle_id?: string;
  bundle_name: string;
  products: Array<{
    product_id: number;
    name: string;
    quantity: number;
    base_price: number;
    discount_type: 'percentage' | 'fixed' | 'none';
    discount_value: number;
    final_price: number;
  }>;
  discount_type: 'percentage' | 'fixed' | 'none';  // Sconto globale carrello
  discount_value: number;                           // Valore sconto globale
  subtotal: number;                                 // Somma prodotti
  discount_amount: number;                          // Totale sconti
  total: number;                                    // Finale
  currency: string;
  metadata: {
    locale: string;
    generatedAt: string;
    seller_referral_code?: string;
    sellerId?: string;
    clientId?: string;
  };
}
```

### Calcolo Sconti Bundle
```typescript
// 1. Calcola subtotale prodotti
const subtotal = products.reduce((sum, p) => sum + p.final_price, 0);

// 2. Applica sconto prodotto singolo
product.final_price = product.base_price * product.quantity;
if (product.discount_type === 'percentage') {
  product.final_price -= product.final_price * (product.discount_value / 100);
} else if (product.discount_type === 'fixed') {
  product.final_price -= product.discount_value;
}

// 3. Applica sconto globale carrello
let total = subtotal;
if (globalDiscountType === 'percentage') {
  total -= total * (globalDiscountValue / 100);
} else if (globalDiscountType === 'fixed') {
  total -= globalDiscountValue;
}

total = Math.max(0, total); // Non negativo
```

## 🔄 Checkout Flow Completo

### 1. Seller Frontend (CRM)
```
┌─────────────────────────────────────────┐
│ Seller configura Drive Test/Bundle     │
│ - Seleziona cliente                     │
│ - Configura prodotto                    │
│ - Personalizza prezzo (entro range)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Genera Checkout Link                    │
│ POST /api/checkout/encrypt              │
│ → Cripta ordine                         │
│ → Genera token                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Link Generato                           │
│ https://allyoucanleads.com/checkout?    │
│   order={encrypted_token}               │
│   &ref={seller_referral_code}           │
└─────────────────────────────────────────┘
```

### 2. Homepage Checkout (allyoucanleads.com)
```
┌─────────────────────────────────────────┐
│ Cliente accede al link                  │
│ /checkout?order={token}&ref={code}      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Decripta Ordine                         │
│ - Valida token                          │
│ - Estrae dati ordine                    │
│ - Valida referral code                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Mostra Checkout Page                    │
│ - Dettagli prodotto                     │
│ - Prezzo e quantità                     │
│ - Info seller (se referral)             │
│ - Payment Gateway                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Cliente Paga                            │
│ - Klarna / Credit Card / PayPal        │
│ - Webhook payment success              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ CRM Backend Notificato                  │
│ - Crea checkout record                  │
│ - Associa a seller_user_id              │
│ - Aggiorna metriche seller              │
└─────────────────────────────────────────┘
```

## 🎨 Seller Frontend - Struttura Completa

### Navbar Sections
```
Dashboard
├── Overview (metriche seller)

CRM
├── Contatti
├── Aziende
├── Trattative
└── Smart View

Portfolio Clienti
└── Clienti Assegnati

Seller Kit
├── Drive Test
├── Bundle Builder
├── Proposte
├── Preventivi
├── Contratti
├── Fatture
└── Risorse (Pitch Deck)

Start Kit
├── Cart Builder
├── Codici Sconto
├── Referral Analytics
└── Checkouts
```

### Implementazione Prioritaria

#### 1. Drive Test Page ✅ FATTO
- Calcolatore embedded con tutti i coefficienti
- Modifica prezzo entro range min-max
- Genera link checkout con encryption
- Integrazione referral

#### 2. Bundle Builder ✅ FATTO
- Selezione prodotti WooCommerce
- Sconti multi-livello (prodotto + carrello)
- Calcolo totale con sconti
- Genera link checkout

#### 3. Proposte & Preventivi ✅ FATTO
- Form con dati cliente
- Generazione PDF
- Invio email

#### 4. Contratti ✅ FATTO
- Template selection
- Form personalizzazione
- PDF generation
- Workflow firma

#### 5. Fatture ✅ FATTO
- Upload prova pagamento
- Richiesta approvazione admin
- Generazione PDF fattura

#### 6. Risorse ✅ FATTO
- Download Pitch Deck
- Invio email con allegati

#### 7. Portfolio ✅ FATTO
- Visualizzazione clienti assegnati
- Selezione rapida cliente

## 🔧 API Endpoints Required

### CRM Backend
```
POST   /api/checkout/encrypt          - Cripta ordine
GET    /api/referral/me               - Ottieni referral seller
GET    /api/referral/validate/:code   - Valida referral
POST   /api/quotes                     - Crea preventivo
POST   /api/quotes/drive-test         - Crea preventivo Drive Test
POST   /api/contracts                  - Crea contratto
POST   /api/invoices                   - Crea fattura
GET    /api/woocommerce/products       - Lista prodotti
POST   /api/bundles                    - Crea bundle
GET    /api/discount-codes             - Lista codici sconto
POST   /api/discount-codes/validate   - Valida codice
GET    /api/contacts?owner_id={id}     - Contatti assegnati
GET    /api/companies?owner_id={id}    - Aziende assegnate
```

### Homepage (allyoucanleads.com)
```
POST   /api/checkout/order             - Cripta ordine (fallback)
GET    /api/referral/validate/:code    - Valida referral (proxy)
POST   /api/klarna/order               - Crea ordine Klarna
POST   /api/checkout-requests          - Richiesta Drive Test custom
```

## ✅ Status Implementazione

- [x] Drive Test Calculator con pricing completo
- [x] Bundle Builder con sconti multi-livello
- [x] Sistema encryption/decryption
- [x] Referral tracking
- [x] Proposte e Preventivi
- [x] Contratti
- [x] Fatture con workflow approvazione
- [x] Risorse e Pitch Deck
- [x] Portfolio clienti assegnati
- [x] Codici sconto
- [x] Navbar ristrutturata
- [x] Admin: Assegnazione seller

## 🚀 Next Steps

1. Installare dipendenze PDF: `npm install jspdf html2canvas`
2. Configurare variabili ambiente
3. Testare flusso completo Drive Test
4. Testare flusso completo Bundle
5. Verificare tracking referral
6. Testare generazione PDF
7. Implementare Dashboard con metriche

