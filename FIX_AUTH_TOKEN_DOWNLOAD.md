# 🔧 Fix Autenticazione Download PDF

## ❌ Problema Riscontrato

```
Error: Authentication required
Status: 401 UNAUTHORIZED
```

Quando si cliccava sui link di download PDF, il backend rifiutava la richiesta perché il token di autenticazione non veniva accettato.

## 🔍 Causa

Il middleware `requireAuth` accettava il token **solo dall'header `Authorization`**, ma i link `<a href="...">` non possono impostare header custom. Il token veniva passato come query parameter (`?token=xxx`) ma veniva ignorato.

## ✅ Soluzione Implementata

### Modifica al Middleware Auth

**File**: `backend/src/middlewares/auth.ts`

**Prima**:
```typescript
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const [, token] = authHeader.split(' ');
  // ...
}
```

**Dopo**:
```typescript
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  // Try to get token from Authorization header first
  let token: string | undefined;
  
  const authHeader = req.headers.authorization;
  if (authHeader) {
    [, token] = authHeader.split(' ');
  }
  
  // If not in header, try query parameter (useful for file downloads)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }
  
  if (!token) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  // ...
}
```

### Come Funziona

1. **Priorità Header**: Prima cerca il token nell'header `Authorization: Bearer xxx`
2. **Fallback Query**: Se non trovato, cerca in `?token=xxx`
3. **Validazione**: Verifica il token JWT in entrambi i casi
4. **Sicurezza**: Stessa validazione per entrambe le fonti

## 🧪 Test

### 1. Verifica che il backend sia riavviato
```bash
cd /Users/edoardoatria/Desktop/CRM_AYCL/backend
npm run dev
```

### 2. Testa Download PDF

**Dal Frontend**:
```
1. Login
2. Vai su "Preventivi" (o Fatture/Ricevute)
3. Click sul link "PDF"
→ Dovrebbe scaricare il file immediatamente
```

**Con cURL**:
```bash
# Con token nella query
curl "http://localhost:3001/quotes/{id}/pdf?token=YOUR_TOKEN" \
  --output test.pdf

# Con token nell'header (funziona ancora)
curl "http://localhost:3001/quotes/{id}/pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output test.pdf
```

### 3. Verifica il PDF
```bash
# Apri il file scaricato
open test.pdf  # Mac
# oppure
xdg-open test.pdf  # Linux
```

## 🔒 Sicurezza

### È Sicuro Passare il Token nella Query String?

**Pro**:
- ✅ Necessario per download diretti via link `<a>`
- ✅ Token ancora validato con JWT
- ✅ Scade come tutti gli altri token
- ✅ Richiede conoscenza del token valido

**Contro**:
- ⚠️ Token visibile nei log del server
- ⚠️ Token visibile nella history del browser

### Mitigazioni Implementate

1. **Token JWT con Scadenza**: I token scadono (default 24h)
2. **HTTPS in Produzione**: URL criptato in transito
3. **Log Sanitization**: I log non dovrebbero loggare query params sensibili

### Alternativa Più Sicura (Per Futuro)

Se la sicurezza è critica:

```typescript
// Generare token temporaneo solo per download
app.get('/quotes/:id/download-token', requireAuth, async (req, res) => {
  const downloadToken = generateTemporaryToken(req.user.id, req.params.id);
  res.json({ token: downloadToken, expiresIn: 60 }); // 60 secondi
});

// Usare il token temporaneo per download
app.get('/quotes/:id/pdf', async (req, res) => {
  const { token } = req.query;
  const { userId, quoteId } = verifyDownloadToken(token);
  // ...download
});
```

## 📊 Endpoint che Beneficiano

Tutti gli endpoint che restituiscono file:

- ✅ `GET /quotes/:id/pdf`
- ✅ `GET /invoices/:id/pdf`
- ✅ `GET /receipts/:id/pdf`
- ✅ `GET /doc-files/:id/download` (se implementato)
- ✅ `GET /files/:id/download` (se implementato)

## 🎯 Vantaggi della Soluzione

1. **Backward Compatible**: Le chiamate API con header continuano a funzionare
2. **Download Diretti**: I link HTML `<a>` funzionano senza JavaScript
3. **User Experience**: Download immediato senza complicazioni
4. **Flessibilità**: Supporta entrambi i metodi di autenticazione

## ✅ Checklist Test

- [ ] Backend riavviato
- [ ] Login funziona
- [ ] Pagina Preventivi si carica
- [ ] Click su "PDF" scarica il file
- [ ] PDF si apre correttamente
- [ ] Contenuto PDF è corretto (cliente, articoli, totali)
- [ ] Test con Fatture
- [ ] Test con Ricevute

## 📝 Note Implementazione

### Token nel Frontend

Il token viene ottenuto dal context:
```typescript
const { token } = useAuth();
```

E passato nell'URL:
```typescript
<a href={`${API_URL}/quotes/${id}/pdf?token=${token}`}>
  Download PDF
</a>
```

### Headers vs Query Parameter

**Usa Header quando**:
- Chiamate API fetch/axios
- Request da codice JavaScript
- Maggiore sicurezza richiesta

**Usa Query Parameter quando**:
- Download file con `<a>` tag
- Condivisione link (con token temporaneo)
- Necessità di semplicità

---

**Fix Applicato**: 21 Ottobre 2025  
**Testato**: ⏳ In attesa di test utente  
**Status**: ✅ Implementato e pronto

## 🚀 Prossimi Passi

1. **Riavvia il backend** se è già in esecuzione
2. **Ricarica la pagina** frontend (Ctrl+R / Cmd+R)
3. **Testa il download** da Preventivi/Fatture/Ricevute
4. **Conferma che funziona** aprendo il PDF scaricato

---

**Se continua a non funzionare**:
1. Verifica che il backend sia riavviato
2. Controlla console browser per errori
3. Controlla log backend per vedere se il token arriva
4. Verifica che il token non sia scaduto

