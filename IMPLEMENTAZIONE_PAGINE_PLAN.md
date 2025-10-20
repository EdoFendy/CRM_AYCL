# Piano Implementazione Pagine CRM - CRUD Completo

## 🎯 Obiettivo
Implementare funzionalità CRUD complete su tutte le pagine admin con UX ottimale.

## 📝 Strategia Implementazione

### Componenti Comuni da Creare (Priority 1)
Prima di modificare le pagine, creo componenti riutilizzabili:

1. **`ConfirmDialog.tsx`** - Dialog conferma delete
2. **`Modal.tsx`** - Modal generico per form/details
3. **`StatusBadge.tsx`** - Badge per stati con colori consistenti
4. **`ActionMenu.tsx`** - Dropdown menu con azioni (Edit, Delete, View)
5. **`LoadingButton.tsx`** - Button con loading state

### Pagine da Implementare (Ordine Priorità)

#### FASE 1: Core Sales (Priority CRITICA)
**Tempo stimato: 6-8 ore**

1. **OpportunitiesPage** ✨
   - [x] Lista/Kanban view
   - [ ] Edit modal con form completo
   - [ ] Delete con conferma
   - [ ] Cambio stage con API (dropdown o drag&drop)
   - [ ] Details modal con tabs (Info, Activities, Files, Tasks)
   - [ ] "Create Offer" button (visible se stage >= proposal)
   - [ ] Link a company detail

2. **PortfolioDetailPage** ✨
   - [ ] Tabs: Overview, Opportunities, Contacts, Tasks, Files, Activities, Contracts
   - [ ] Edit company info inline
   - [ ] Quick actions: New Opportunity, New Contact, Upload File
   - [ ] CRUD Contacts inline nella tab
   - [ ] Lista opportunities con link
   - [ ] Timeline activities

3. **OffersPage** ✨
   - [ ] Lista offers con filtri
   - [ ] Create con form items (array di prodotti)
   - [ ] Edit items e total
   - [ ] Status workflow: draft -> sent -> accepted/declined
   - [ ] "Accept" -> Trigger create contract
   - [ ] "Generate PDF" button
   - [ ] Link a opportunity

4. **ContractsPage** ✨
   - [ ] Lista contracts con filtri
   - [ ] Create da offer
   - [ ] Status workflow: draft -> sent -> signed
   - [ ] Versioning (lista versioni)
   - [ ] Signatures management
   - [ ] "Generate Invoice" button (visible se signed)
   - [ ] Link a offer e company

#### FASE 2: Finance (Priority ALTA)
**Tempo stimato: 4-5 ore**

5. **InvoicesPage** ✨
   - [ ] Lista invoices con filtri
   - [ ] Create da contract
   - [ ] Edit amount, due_date
   - [ ] Status workflow: draft -> sent -> paid/overdue
   - [ ] "Mark as Paid" -> Create payment
   - [ ] "Send Email" action
   - [ ] "Generate PDF" button
   - [ ] "Send Reminder" se overdue

6. **PaymentsPage** 📋
   - [ ] Lista read-only
   - [ ] Filtri: status, provider, date range
   - [ ] Link a invoice e contract
   - [ ] Export CSV

#### FASE 3: Operations (Priority MEDIA)
**Tempo stimato: 5-6 ore**

7. **ContactsPage** ✨
   - [ ] Lista con filtri
   - [ ] CRUD completo (modal o inline)
   - [ ] Import CSV
   - [ ] Export CSV
   - [ ] Link a company

8. **TasksPage** ✨
   - [ ] Kanban: Open, In Progress, Done
   - [ ] Create con form completo
   - [ ] Edit inline
   - [ ] Delete con conferma
   - [ ] Drag&drop cambio status
   - [ ] Assegnazione owner
   - [ ] Overdue indicators
   - [ ] Link a company/opportunity

9. **TicketsPage** ✨
   - [ ] Lista tickets
   - [ ] Create ticket
   - [ ] Details modal con messages
   - [ ] Reply form
   - [ ] Status workflow
   - [ ] Assign to user
   - [ ] Priority badges

10. **FilesPage** ✨
    - [ ] Lista files
    - [ ] Upload (drag&drop o picker)
    - [ ] Download
    - [ ] Delete
    - [ ] Tags management
    - [ ] Filtri: type, company, opportunity, contract
    - [ ] Preview PDF/images

#### FASE 4: System & Admin (Priority BASSA)
**Tempo stimato: 3-4 ore**

11. **UsersPage** ✨
    - [ ] Lista users
    - [ ] CRUD completo
    - [ ] Assign team
    - [ ] Change role
    - [ ] Status: active/inactive
    - [ ] Reset password

12. **ReportsPage** 📋
    - [ ] Lista reports
    - [ ] Create con filtri
    - [ ] Generate (async job)
    - [ ] Download PDF
    - [ ] Status indicators

13. **AuditPage** 📋
    - [ ] Lista read-only
    - [ ] Filtri avanzati
    - [ ] Search full-text
    - [ ] Export CSV

## 🛠️ Pattern Implementazione

### Modal Edit Pattern
```tsx
const [editingItem, setEditingItem] = useState<Item | null>(null);
const [showEditModal, setShowEditModal] = useState(false);

// Click Edit
const handleEdit = (item: Item) => {
  setEditingItem(item);
  setShowEditModal(true);
  form.reset(item); // Pre-fill form
};

// Modal
{showEditModal && (
  <Modal onClose={() => setShowEditModal(false)}>
    <form onSubmit={handleSubmit}>
      {/* fields */}
    </form>
  </Modal>
)}
```

### Delete Pattern
```tsx
const deleteMutation = useMutation({
  mutationFn: (id: string) => apiClient(`resource/${id}`, { method: 'DELETE', token }),
  onSuccess: () => {
    queryClient.invalidateQueries(['resource']);
    setShowConfirm(false);
  },
});

const handleDelete = (id: string) => {
  if (confirm('Are you sure?')) {
    deleteMutation.mutate(id);
  }
};
```

### Status Change Pattern
```tsx
const updateStatusMutation = useMutation({
  mutationFn: ({ id, status }: { id: string; status: string }) =>
    apiClient(`resource/${id}`, { method: 'PATCH', token, body: { status } }),
  onSuccess: () => queryClient.invalidateQueries(['resource']),
});
```

### Link Pattern
```tsx
import { Link } from 'react-router-dom';

<Link to={`/portfolio/${companyId}`} className="text-primary hover:underline">
  {companyName}
</Link>
```

## 📦 Componenti da Creare

### 1. Modal.tsx
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

### 2. ConfirmDialog.tsx
```tsx
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
}
```

### 3. StatusBadge.tsx
```tsx
interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}
```

### 4. ActionMenu.tsx
```tsx
interface Action {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  actions: Action[];
}
```

## ⏱️ Timeline Stima

- **Componenti comuni**: 2-3 ore
- **FASE 1 (Core Sales)**: 6-8 ore
- **FASE 2 (Finance)**: 4-5 ore
- **FASE 3 (Operations)**: 5-6 ore
- **FASE 4 (System)**: 3-4 ore

**TOTALE: ~20-26 ore** di lavoro

## 🚀 Approccio

1. Creo i componenti comuni (Modal, ConfirmDialog, etc.)
2. Implemento OpportunitiesPage completa come reference
3. Uso OpportunitiesPage come template per le altre pagine
4. Procedo in ordine di priorità

---

**Prossimo Step**: Creare i componenti comuni e poi iniziare con OpportunitiesPage migliorata.

