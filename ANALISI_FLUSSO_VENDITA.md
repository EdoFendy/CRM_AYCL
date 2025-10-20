# Analisi Flusso di Vendita CRM AYCL

## 🎯 Obiettivo Business
**AYCL (All You Can Leads)** è un CRM per la **vendita di leads B2B**. Il flusso principale è:

1. **Acquisire aziende** (Companies) interessate all'acquisto di leads
2. **Identificare decision makers** (Contacts) nelle aziende
3. **Creare opportunità** (Opportunities) per vendere pacchetti di leads
4. **Inviare offerte** (Offers) con prezzi e specifiche
5. **Firmare contratti** (Contracts) quando l'offerta è accettata
6. **Emettere fatture** (Invoices) per il pagamento
7. **Ricevere pagamenti** (Payments)
8. **Fornire i leads** tramite i prodotti (AYCL Kit/Start Kit)

## 📊 Flusso Principale

```
┌─────────────┐
│   COMPANY   │ ← Azienda cliente (es. TechFlow SaaS)
└──────┬──────┘
       │ has many
       ├─────────────────┐
       │                 │
┌──────▼──────┐   ┌──────▼──────┐
│  CONTACTS   │   │OPPORTUNITIES│ ← Trattativa per vendere leads
└─────────────┘   └──────┬──────┘
                         │ has many
                         │
                  ┌──────▼──────┐
                  │   OFFERS    │ ← Proposta commerciale
                  └──────┬──────┘
                         │ accepted
                         │
                  ┌──────▼──────┐
                  │  CONTRACTS  │ ← Contratto firmato
                  └──────┬──────┘
                         │ has many
                         │
                  ┌──────▼──────┐
                  │  INVOICES   │ ← Fattura emessa
                  └──────┬──────┘
                         │ has one
                         │
                  ┌──────▼──────┐
                  │  PAYMENTS   │ ← Pagamento ricevuto
                  └─────────────┘
```

## 🔄 Stage Opportunity

1. **new** - Nuova opportunità identificata
2. **qualifying** - Qualificazione budget e esigenze
3. **discovery** - Discovery call per capire necessità
4. **proposal** - Proposta inviata (Offer created)
5. **negotiation** - Negoziazione termini e prezzi
6. **closed_won** - Vinta! (Contract signed)
7. **closed_lost** - Persa

## 📋 Funzionalità Richieste per Ogni Pagina

### 1. **OpportunitiesPage** (PRIORITÀ ALTA)
**Scopo**: Gestire il sales pipeline visivamente

**Funzionalità**:
- ✅ Vista Kanban con drag&drop tra stage
- ✅ Filtri: owner, company, stage, value range
- ✅ Create: Form modale con company_id, title, value, owner_id, expected_close_date
- ✅ Edit: Click su card -> modal con edit
- ✅ Delete: Conferma prima di eliminare
- ✅ Link: Click su company name -> vai a Portfolio Detail
- ✅ Actions: "Create Offer" button quando stage >= proposal
- ✅ Timeline: Mostra activities della opportunity

**Flow utente**:
1. Crea opportunity per una company
2. Muovi tra stage con drag&drop
3. Quando arriva a "proposal" -> Crea Offer
4. Quando offer accepted -> Passa a "negotiation"
5. Firma contratto -> Passa a "closed_won"

### 2. **PortfolioDetailPage** (PRIORITÀ ALTA)
**Scopo**: Vista 360° dell'azienda cliente

**Funzionalità**:
- ✅ Header: Nome company, industry, geo, revenue, owner
- ✅ Tabs:
  - **Overview**: Info generale + quick stats
  - **Opportunities**: Lista opportunities di questa company (con link)
  - **Contacts**: Lista contacts con CRUD inline
  - **Tasks**: Tasks legati a questa company
  - **Activities**: Timeline attività
  - **Files**: Documenti caricati
  - **Contracts**: Contratti firmati
- ✅ Quick Actions: "New Opportunity", "New Contact", "Upload File"

### 3. **OffersPage** (PRIORITÀ ALTA)
**Scopo**: Gestire le proposte commerciali

**Funzionalità**:
- ✅ Lista con: Opportunity, Company, Items, Total, Status, Created
- ✅ Filtri: status (draft/sent/accepted/declined), opportunity
- ✅ Create: Form con opportunity_id, items (array), total
- ✅ Edit: Modifica items e total
- ✅ Actions:
  - "Send" (draft -> sent)
  - "Accept" (sent -> accepted) -> Trigger: Create Contract
  - "Decline" (sent -> declined)
  - "Generate PDF" -> Download proposta
- ✅ Link: Click opportunity -> OpportunitiesPage con filtro

### 4. **ContractsPage** (PRIORITÀ ALTA)
**Scopo**: Gestire contratti e firme

**Funzionalità**:
- ✅ Lista: Company, Opportunity, Offer, Status, Signed Date, External Ref
- ✅ Filtri: status (draft/sent/signed/cancelled), company
- ✅ Create: Form con offer_id, company_id
- ✅ Status workflow:
  - draft -> sent (invia per firma)
  - sent -> signed (firmato)
  - signed -> cancelled (annulla)
- ✅ Versioning: Mostra versioni contratto
- ✅ Signatures: Gestisci firme elettroniche
- ✅ Generate Invoice: Button quando signed -> Crea Invoice

### 5. **InvoicesPage** (PRIORITÀ ALTA)
**Scopo**: Gestire fatturazione

**Funzionalità**:
- ✅ Lista: Number, Contract, Company, Amount, Status, Due Date, Issued
- ✅ Filtri: status (draft/sent/paid/overdue), company, date range
- ✅ Create: Form con contract_id, amount, due_date
- ✅ Status workflow:
  - draft -> sent (invia fattura)
  - sent -> paid (pagamento ricevuto) -> Trigger: Create Payment
  - sent -> overdue (scaduta)
- ✅ Actions:
  - "Send Email" (invia per email)
  - "Generate PDF"
  - "Mark as Paid" -> Create Payment
  - "Send Reminder" (se overdue)

### 6. **ContactsPage** (PRIORITÀ MEDIA)
**Scopo**: Database decision makers

**Funzionalità**:
- ✅ Lista: Name, Email, Phone, Role, Company, LinkedIn
- ✅ Filtri: company, role, owner
- ✅ CRUD completo inline o modal
- ✅ Import: CSV upload
- ✅ Export: CSV download
- ✅ Link: Click company -> Portfolio Detail

### 7. **TasksPage** (PRIORITÀ MEDIA)
**Scopo**: Task management per sales team

**Funzionalità**:
- ✅ Vista Kanban: Open, In Progress, Done
- ✅ Lista alternativa con filtri
- ✅ Filtri: owner, status, priority, due_date, company, opportunity
- ✅ CRUD: Title, description, due_date, owner_id, priority, company_id, opportunity_id
- ✅ Drag&drop tra status
- ✅ Overdue indicators
- ✅ Link: Click company/opportunity -> respective pages

### 8. **TicketsPage** (PRIORITÀ MEDIA)
**Scopo**: Support clienti

**Funzionalità**:
- ✅ Lista: Subject, Requester, Status, Priority, Assignee, Created
- ✅ Filtri: status, priority, assignee
- ✅ CRUD con form
- ✅ Dettaglio: Mostra messaggi del ticket
- ✅ Reply: Form per rispondere
- ✅ Status: open -> pending -> solved -> closed
- ✅ Assign: Assegna a user

### 9. **PaymentsPage** (PRIORITÀ BASSA)
**Scopo**: Tracking pagamenti ricevuti

**Funzionalità**:
- ✅ Lista read-only: Invoice, Contract, Amount, Status, Provider, Received Date
- ✅ Filtri: status, provider, date range, company
- ✅ Link: Click invoice -> InvoicesPage
- ✅ Export: CSV per accounting

### 10. **FilesPage** (PRIORITÀ MEDIA)
**Scopo**: Repository documenti centralizz

ato

**Funzionalità**:
- ✅ Lista: Name, Type, Size, Company, Opportunity, Contract, Tags, Uploaded
- ✅ Filtri: type (pdf/xlsx/doc), company, opportunity, contract, tags
- ✅ Upload: Drag&drop o file picker, assign to company/opportunity/contract
- ✅ Download: Click per scaricare
- ✅ Tags: Aggiungi tags per categorizzare
- ✅ Preview: Per PDF/immagini

### 11. **UsersPage** (PRIORITÀ MEDIA)
**Scopo**: Gestione utenti e permessi

**Funzionalità**:
- ✅ Lista: Name, Email, Role, Team, Status, Created
- ✅ Filtri: role, status, team
- ✅ CRUD: email, password, role, team_id, reseller_team_id, full_name, status
- ✅ Status: active/inactive/suspended
- ✅ Reset Password: Invia email reset
- ✅ Assign Team: Dropdown teams

### 12. **ReportsPage** (PRIORITÀ BASSA)
**Scopo**: Generazione report

**Funzionalità**:
- ✅ Lista: Scope, Filters, Status, File, Created
- ✅ Create: Form con scope (sales/pipeline/revenue/activities), filters (date range, team, owner)
- ✅ Generate: Async job che crea PDF
- ✅ Download: Link al PDF quando ready
- ✅ Schedule: Cron per report automatici (future)

### 13. **AuditPage** (PRIORITÀ BASSA)
**Scopo**: Compliance e tracking modifiche

**Funzionalità**:
- ✅ Lista read-only: Actor, Entity, Action, Before/After, IP, Created
- ✅ Filtri: entity, action, actor, date range
- ✅ Search: Full-text search su changes
- ✅ Export: CSV per compliance

## 🎨 Pattern UI Comuni

### DataTable Component
Tutte le liste dovrebbero usare un componente comune con:
- Sortable columns
- Pagination
- Row actions (Edit, Delete, View)
- Bulk actions (Delete selected, Export)
- Loading states
- Empty states

### Form Pattern
- Validazione con Zod
- Error handling
- Success toast
- Loading state durante submit
- Cancel button

### Modal Pattern
- Form in modal per Create/Edit
- Overlay backdrop
- ESC to close
- Confirm before close se form dirty

### Status Badge
Colori consistenti per status:
- draft: gray
- sent: blue
- pending: yellow
- active: green
- paid: green
- overdue: red
- cancelled: red
- closed_lost: red
- closed_won: green

## 🔗 Collegamenti Tra Pagine

1. **Dashboard** -> Click "Top Opportunity" -> OpportunitiesPage (filtered)
2. **OpportunitiesPage** -> Click Company -> PortfolioDetailPage
3. **OpportunitiesPage** -> Click "Create Offer" -> OffersPage (pre-filled)
4. **PortfolioDetailPage** -> Tab "Opportunities" -> Click -> OpportunitiesPage (filtered)
5. **OffersPage** -> Click "Accept" -> Create Contract -> ContractsPage
6. **ContractsPage** -> Click "Generate Invoice" -> InvoicesPage (pre-filled)
7. **InvoicesPage** -> Click "Mark as Paid" -> Create Payment -> PaymentsPage
8. **TasksPage** -> Click Opportunity -> OpportunitiesPage (filtered)
9. **ContactsPage** -> Click Company -> PortfolioDetailPage

## ✅ Priorità Implementazione

### FASE 1 (Core Sales Flow)
1. OpportunitiesPage - CRUD + Kanban + Workflow
2. PortfolioDetailPage - Vista 360° company
3. OffersPage - CRUD + Workflow
4. ContractsPage - CRUD + Workflow

### FASE 2 (Finance)
5. InvoicesPage - CRUD + Workflow
6. PaymentsPage - Read-only tracking

### FASE 3 (Operations)
7. ContactsPage - CRUD + Import/Export
8. TasksPage - CRUD + Kanban
9. TicketsPage - CRUD + Messages

### FASE 4 (System)
10. FilesPage - Upload/Download/Preview
11. UsersPage - CRUD + Permissions
12. ReportsPage - Generate/Download
13. AuditPage - Read-only + Filters

---

**Prossimo Step**: Implementare OpportunitiesPage con tutte le funzionalità CRUD e workflow.

