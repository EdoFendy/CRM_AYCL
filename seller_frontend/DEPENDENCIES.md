# Additional Dependencies Required

## Installation

Per completare l'implementazione, installa le seguenti dipendenze:

```bash
cd seller_frontend
npm install jspdf html2canvas qrcode lucide-react
npm install --save-dev @types/qrcode
```

## Dependencies

### For PDF Generation (Contracts)
- `jspdf` - PDF generation library
- `html2canvas` - HTML to canvas conversion for PDF

### For QR Code Generation (Referral Page)
- `qrcode` - QR code generation library
- `@types/qrcode` - TypeScript definitions

### For Icons (Seller Kit Unified)
- `lucide-react` - Icon library with 400+ icons

### Already Installed
- All other dependencies are already in package.json

## Post-Installation

After installing, the contract PDF generation will work properly.

## Alternative Approach

If you prefer not to install these dependencies, you can:
1. Use the backend API to generate PDFs server-side
2. Call the `/contracts/:id/pdf` endpoint instead of client-side generation

The current implementation uses client-side PDF generation for better user experience (immediate download without waiting for server processing).
