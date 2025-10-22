# 🎯 NUOVO SISTEMA PDF TEMPLATES

## Sistema Completamente Rivisto per Generazione Contratti PDF

### 📋 COMPONENTI IMPLEMENTATI

#### Backend (✅ Completato)
1. **Router** (`backend/src/modules/pdfTemplates/pdfTemplates.router.ts`)
   - `POST /api/pdf-templates/upload` - Carica template PDF
   - `GET /api/pdf-templates/:id/fields` - Legge campi AcroForm
   - `POST /api/pdf-templates/:id/mapping` - Salva mappatura
   - `GET /api/pdf-templates/:id/mapping` - Recupera mappatura
   - `POST /api/pdf-templates/generate` - Genera PDF compilato
   - `GET /api/pdf-templates` - Lista template
   - `GET /api/pdf-templates/:id/download` - Download template

2. **Service** (`backend/src/modules/pdfTemplates/pdfTemplates.service.ts`)
   - Usa `pdf-lib` per manipolazione PDF
   - Supporto AcroForm automatico
   - Disegno campi custom con coordinate normalizzate
   - Flatten automatico dei form

3. **Database** (`backend/migrations/005_pdf_templates.sql`)
   - Tabella `pdf_templates`
   - Tabella `generated_pdfs` per storico
   - Indici ottimizzati

4. **Registrazione** (`backend/src/routes/index.ts`)
   - Router registrato come `/api/pdf-templates`

#### Frontend (🚧 In Corso)
1. **PDFTemplatesPage** - Lista e gestione template
2. **PDFTemplateUpload** - Upload template (DA CREARE)
3. **PDFTemplateEditor** - Editor mappatura campi (DA CREARE)
4. **PDFViewer** - Viewer con PDF.js (DA CREARE)
5. **FieldOverlay** - Overlay per posizionamento campi (DA CREARE)

---

## 🔧 COME FUNZIONA

### 1. Upload Template
```typescript
// Utente carica un PDF
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('name', 'Contratto Performance');
formData.append('type', 'contract');

await fetch('/api/pdf-templates/upload', {
  method: 'POST',
  body: formData,
  headers: { Authorization: `Bearer ${token}` }
});
```

### 2. Rilevamento Campi AcroForm
```typescript
// Il sistema legge automaticamente i campi AcroForm
const { fields } = await fetch(`/api/pdf-templates/${templateId}/fields`);
// Restituisce: [{ name: 'company_name', type: 'text' }, ...]
```

### 3. Mappatura Campi
```typescript
// Due modalità:
// A) Se AcroForm: associa dataKey a pdfFieldName
// B) Se NO AcroForm: disegna campi con coordinate normalizzate (0-1)

const mapping = [
  {
    id: uuid(),
    type: 'text',
    dataKey: 'company_name',
    pdfFieldName: 'CompanyName', // Se AcroForm
    page: 0,
    x: 0.1,  // 10% dalla sinistra
    y: 0.2,  // 20% dall'alto
    width: 0.4,
    height: 0.03,
    fontSize: 12,
    align: 'left'
  }
];

await fetch(`/api/pdf-templates/${templateId}/mapping`, {
  method: 'POST',
  body: JSON.stringify({ fields: mapping })
});
```

### 4. Preview con Dati
```typescript
// Preview lato client: sovrapposizione valori sui campi
const testData = {
  company_name: 'Test Company SRL',
  company_tax_id: '12345678901',
  contract_date: '21/10/2025'
};

// Il viewer mostra "ghost values" sulle coordinate mappate
```

### 5. Generazione PDF Finale
```typescript
const response = await fetch('/api/pdf-templates/generate', {
  method: 'POST',
  body: JSON.stringify({
    templateId: 'uuid-template',
    data: {
      company_name: 'AYCL Industries',
      company_address: 'Via Roma 123',
      // ... tutti i dati
    }
  })
});

const pdfBlob = await response.blob();
// Download automatico
```

---

## 🎨 VANTAGGI NUOVO SISTEMA

### ✅ Vs Sistema Precedente
| Vecchio | Nuovo |
|---------|-------|
| HTML → Screenshot → PDF | Template PDF nativo |
| Stili CSS inaffidabili | PDF professionale garantito |
| Tagli a metà riga | Mai più tagli (pdf-lib gestisce) |
| Un template hardcoded | Template multipli riutilizzabili |
| Nessuna mappatura | Mappatura visuale interattiva |

### 🚀 Caratteristiche Chiave
1. **Supporto AcroForm automatico** - Se il PDF ha campi, li usa
2. **Disegno custom** - Altrimenti disegna alle coordinate
3. **Coordinate normalizzate** - 0-1, funziona su ogni PDF
4. **Flatten automatico** - PDF non editabili dopo generazione
5. **Storico generazioni** - Traccia chi ha generato cosa e quando
6. **Multi-template** - Un template per ogni tipo documento

---

## 📦 PROSSIMI STEP

### Frontend da Completare
1. **PDFTemplateUpload Component**
   - Drag & drop per PDF
   - Form nome/descrizione/tipo
   - Progress upload

2. **PDFViewer Component**
   - PDF.js per rendering
   - Navigazione pagine
   - Zoom in/out

3. **FieldOverlay Component**
   - Click per aggiungere campo
   - Drag per ridimensionare
   - Pannello proprietà (type, dataKey, fontSize, align)

4. **PDFTemplateEditor Component**
   - Sidebar: lista campi mappati
   - Canvas: viewer + overlay
   - Preview mode con dati test
   - Salva/Annulla

5. **Integrazione ContractsPage**
   - Dropdown selezione template
   - Auto-popolamento dati da contract
   - Generazione con un click

---

## 🔐 SICUREZZA

- ✅ Upload limitato a 10MB
- ✅ Solo PDF accettati (validazione con pdf-lib)
- ✅ Autenticazione richiesta su tutti endpoint
- ✅ File salvati fuori web root
- ✅ Nessun dato sensibile nei log
- ✅ Storico con audit trail

---

## 📚 DIPENDENZE BACKEND

```json
{
  "pdf-lib": "^1.17.1",  // Manipolazione PDF
  "multer": "^1.4.5-lts.1"  // Upload file
}
```

### Installazione
```bash
cd backend
npm install pdf-lib multer
npm install --save-dev @types/multer
```

---

## 🧪 TESTING

### 1. Testare Upload
```bash
curl -X POST http://localhost:3000/api/pdf-templates/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@contratto.pdf" \
  -F "name=Contratto Performance" \
  -F "type=contract"
```

### 2. Testare Generazione
```bash
curl -X POST http://localhost:3000/api/pdf-templates/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "uuid",
    "data": {
      "company_name": "Test SRL",
      "contract_date": "21/10/2025"
    }
  }' \
  --output generated.pdf
```

---

## ✅ TODO LIST

- [x] Backend: Router e Service
- [x] Backend: Migration database
- [x] Backend: Registrazione routes
- [ ] Backend: Installare dipendenze
- [ ] Backend: Eseguire migration
- [ ] Frontend: PDFTemplateUpload
- [ ] Frontend: PDFViewer con PDF.js
- [ ] Frontend: FieldOverlay editor
- [ ] Frontend: PDFTemplateEditor completo
- [ ] Frontend: Integrazione ContractsPage
- [ ] Testing end-to-end
- [ ] Documentazione utente

---

## 🎉 RISULTATO FINALE

Un sistema **professionale**, **flessibile** e **riutilizzabile** per la generazione di PDF da template con mappatura campi dinamica, che risolve DEFINITIVAMENTE tutti i problemi del vecchio sistema HTML→PDF.

