# Sistema Contratti Semplificato - Come i Preventivi

## Strategia
1. **Backend**: Salva solo i dati del contratto (come i preventivi)
2. **Frontend**: Genera PDF al volo quando serve scaricare
3. **Database**: Salva PDF generato come file allegato

## Flusso
1. Utente compila form → Click "Genera Contratto"
2. Backend crea record in `contracts` con dati in `notes` (JSON)
3. Frontend genera PDF immediatamente e lo salva come file
4. Dalla pagina Contratti: scarica PDF salvato (se esiste) o rigeneralo

## Vantaggi
- ✅ Semplice come i preventivi
- ✅ Backend non deve gestire HTML complessi
- ✅ PDF sempre aggiornato
- ✅ Dati sempre salvati anche se PDF fallisce

