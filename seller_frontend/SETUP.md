# Seller Frontend Setup Guide

## Installation

Per completare l'installazione, esegui:

```bash
cd seller_frontend
npm install jspdf html2canvas qrcode lucide-react
npm install --save-dev @types/qrcode
```

## Dependencies Required

### PDF Generation
- `jspdf` - PDF generation library  
- `html2canvas` - HTML to canvas conversion for PDF

### QR Code Generation
- `qrcode` - QR code generation library
- `@types/qrcode` - TypeScript definitions

### Icons
- `lucide-react` - Icon library for UI components

### Already Installed
- All other dependencies are already in package.json

## Configuration

### Environment Variables

Crea un file `.env` nella root del progetto con:

```env
VITE_API_URL=http://localhost:3001
VITE_CHECKOUT_BASE_URL=https://allyoucanleads.com
VITE_APP_URL=http://localhost:5174
```

### Path Aliases

I path aliases sono già configurati in:
- `tsconfig.paths.json`
- `vite.config.ts`

## Running the Application

```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:5174`

## Troubleshooting

### Error: Failed to resolve import "@types/contracts"

Se ricevi questo errore, verifica che:
1. Il file `src/types/contracts.ts` esista
2. Il path alias `@types` sia configurato in `vite.config.ts` e `tsconfig.paths.json`
3. Riavvia il server di sviluppo

### Error: Failed to resolve import "jspdf"

Questo significa che le dipendenze PDF non sono installate. Esegui:
```bash
npm install jspdf html2canvas
```

### Error: PDF libraries not installed

Questo errore apparirà quando provi a generare un PDF senza aver installato le dipendenze. 
Installa le dipendenze come indicato sopra.

## Notes

- La generazione PDF usa dynamic imports, quindi le librerie vengono caricate solo quando necessario
- Se non installi le dipendenze PDF, la generazione contratti mostrerà un messaggio di errore chiaro
- Tutti gli altri componenti funzioneranno normalmente anche senza le dipendenze PDF
