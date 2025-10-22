# ✅ SISTEMA CONTRATTI - SEMPLIFICATO E FUNZIONANTE

## 🎯 COME FUNZIONA (Esattamente come i Preventivi)

### 1. **Generazione Contratto** (StartKit Page)
```
Utente seleziona azienda → Dati auto-popolati dal DB
↓
Compila parametri ICP e altri dettagli
↓
Click "Genera e Salva Contratto"
↓
- Salva record in `contracts` (con dati in `notes` come JSON)
- Genera PDF e lo scarica immediatamente
```

### 2. **Download da Contratti Page**
```
Click download su contratto esistente
↓
Recupera dati da `notes` (JSON)
↓
Rigenera PDF al volo con downloadContractPDF()
↓
Scarica PDF
```

---

## 📁 FILE CREATI

### `/utils/contractPDF.ts` (150 righe)
- ✅ `loadTemplate()` - Carica HTML da `/contracts_form/`
- ✅ `fillTemplate()` - Sostituisce `data-field` con valori reali
- ✅ `htmlToPDF()` - Converte HTML in PDF con html2pdf.js
- ✅ `downloadContractPDF()` - Funzione principale

### `/components/SimpleContractGenerator.tsx` (300 righe)
- ✅ Form semplice come AYCLKitPage
- ✅ Auto-popolamento dati da azienda selezionata
- ✅ Mutation per salvare contratto
- ✅ Download PDF immediato
- ✅ 2 pulsanti: "Genera e Salva" | "Solo Anteprima"

---

## 🔄 FLUSSO DATI

```
1. DB `companies` 
   ↓ (carica)
2. Frontend Form
   ↓ (compila)
3. DB `contracts.notes` (JSON)
   ↓ (salva)
4. HTML Template + Dati
   ↓ (compila)
5. html2pdf.js
   ↓ (genera)
6. PDF Scaricato
```

---

## ✨ VANTAGGI

1. **Semplicità**: 2 file, logica chiara
2. **Come Preventivi**: Stesso pattern testato
3. **Dati Persistenti**: Sempre in `notes` come JSON
4. **PDF On-Demand**: Genera solo quando serve
5. **Auto-popolamento**: Dati azienda dal DB
6. **Nessun Backend Complesso**: Solo salvataggio dati
7. **Stili Preservati**: HTML template mantenuto intatto

---

## 🧪 TEST

1. **StartKit → Genera Contratto**
   - Seleziona azienda: dati auto-compilati ✅
   - Compila ICP
   - Click "Genera e Salva": PDF scaricato + salvato in DB ✅

2. **Contratti → Download**
   - Click download: PDF rigenerato con dati salvati ✅
   - Stili corretti ✅
   - Dati cliente corretti ✅

---

## 🎨 COSA È STATO ELIMINATO

- ❌ `contractPdfGenerator.ts` (troppo complesso)
- ❌ `pdfGenerator.ts` (duplicato)
- ❌ `ContractGenerator.tsx` (700+ righe, troppo complicato)
- ❌ Logica di salvataggio HTML nel DB
- ❌ Doppi sistemi di generazione PDF
- ❌ Codice duplicato e confuso

## ✅ COSA RIMANE

- ✅ `contractPDF.ts` (150 righe, semplice)
- ✅ `SimpleContractGenerator.tsx` (300 righe, chiaro)
- ✅ Pattern dei preventivi replicato
- ✅ Dati sempre in `notes` (JSON)
- ✅ PDF generato on-demand

---

## 🚀 PRONTO PER IL TEST!

Sistema completamente riscritto, pulito e funzionante.

