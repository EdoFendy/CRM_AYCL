import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient, PaginatedResponse } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { useCursorPagination } from '../hooks/useCursorPagination';
import { PaginationControls } from '../components/navigation/PaginationControls';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import ContractGenerator from '../components/ContractGenerator';
import { 
  FileText, 
  Send, 
  Shield, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Download,
  Copy,
  ExternalLink,
  Users,
  Building,
  Euro,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';

interface Contract {
  id: string;
  number: string;
  status: string;
  pack: string;
  company_id: string;
  requires_payment: boolean;
  payment_amount: number;
  payment_currency: string;
  is_subscription: boolean;
  created_at: string;
  signed_at?: string;
  company_name?: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
  email: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  created_at: string;
  created_by_name?: string;
}

interface SignatureRequest {
  id: string;
  token: string;
  signer_name: string;
  signer_email: string;
  status: string;
  expires_at: string;
  public_url: string;
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_url?: string;
}

const PACKS = [
  { id: 'Setup-Fee', name: 'Setup Fee', description: 'Configurazione iniziale', price: 500 },
  { id: 'Performance', name: 'Performance', description: 'Servizi di performance', price: 1200 },
  { id: 'Subscription', name: 'Subscription', description: 'Abbonamento mensile', price: 300 },
  { id: 'Drive Test', name: 'Drive Test', description: 'Test di guida', price: 800 },
] as const;

type Pack = typeof PACKS[number]['id'];

const contractSchema = z.object({
  company_id: z.string().uuid(),
  pack: z.enum(['Setup-Fee', 'Performance', 'Subscription', 'Drive Test']),
  requires_payment: z.boolean().default(true),
  payment_amount: z.number().positive(),
  payment_currency: z.string().default('EUR'),
  is_subscription: z.boolean().default(false),
  notes: z.string().optional(),
});

const signatureSchema = z.object({
  signer_name: z.string().min(1),
  signer_email: z.string().email(),
  signer_phone: z.string().optional(),
  require_otp: z.boolean().default(false),
  expires_in_hours: z.number().int().min(1).max(720).default(72),
});

type ContractFormValues = z.infer<typeof contractSchema>;
type SignatureFormValues = z.infer<typeof signatureSchema>;

export default function StartKitPage() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const pagination = useCursorPagination();
  const { filters, setFilters, resetFilters } = usePersistentFilters({
    query: '',
    status: '',
    pack: '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [activeTab, setActiveTab] = useState<'contracts' | 'timeline' | 'generator'>('contracts');

  const queryKey = useMemo(
    () => ['contracts', filters, pagination.cursor, pagination.limit],
    [filters, pagination.cursor, pagination.limit]
  );

  const contractsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<PaginatedResponse<Contract>>('contracts', {
          token,
          searchParams: {
            ...filters,
            limit: pagination.limit,
            cursor: pagination.cursor,
          },
        });
      } catch (err: any) {
        setError(err.message || 'Errore nel caricamento dei contratti');
        throw err;
      }
    },
  });

  // Fetch companies for form
  const { data: companiesResponse } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiClient<{ data: Company[] }>('companies', { 
      token,
      searchParams: { limit: 1000 }
    }),
  });
  
  const companies = companiesResponse?.data ?? [];

  // Fetch timeline for selected contract
  const { data: timeline = [] } = useQuery({
    queryKey: ['contract-timeline', selectedContract?.id],
    queryFn: () => apiClient<TimelineEvent[]>(`contracts/${selectedContract?.id}/timeline`, { token }),
    enabled: !!selectedContract?.id,
  });

  const createForm = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      requires_payment: true,
      payment_currency: 'EUR',
      is_subscription: false,
    },
  });

  const signatureForm = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureSchema),
    defaultValues: {
      require_otp: false,
      expires_in_hours: 72,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ContractFormValues) =>
      apiClient<Contract>('contracts', {
        method: 'POST',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowCreateForm(false);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<ContractFormValues> & { id: string }) =>
      apiClient<Contract>(`contracts/${id}`, {
        method: 'PATCH',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowEditModal(false);
      setEditingContract(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`contracts/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setDeletingId(null);
    },
  });

  const sendForSignatureMutation = useMutation({
    mutationFn: (data: SignatureFormValues) =>
      apiClient<SignatureRequest>(`contracts/${selectedContract?.id}/send-for-signature`, {
        method: 'POST',
        token,
        body: data,
      }),
    onSuccess: (data) => {
      setSignatureRequest(data);
      setShowSignatureModal(false);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; currency: string; payment_method: string }) =>
      apiClient<PaymentIntent>('payments', {
        method: 'POST',
        token,
        body: {
          contract_id: selectedContract?.id,
          ...data,
        },
      }),
    onSuccess: (data) => {
      setPaymentIntent(data);
      setShowPaymentModal(false);
    },
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: () =>
      apiClient<{ payment_url: string; expires_at: string }>(`payments/${paymentIntent?.id}/create-link`, {
        method: 'POST',
        token,
        body: {
          return_url: `${window.location.origin}/contracts`,
          cancel_url: `${window.location.origin}/start-kit`,
        },
      }),
    onSuccess: (data) => {
      setPaymentIntent(prev => prev ? { ...prev, payment_url: data.payment_url } : null);
    },
  });

  const handleCreate = (data: ContractFormValues) => {
    createMutation.mutate(data);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    createForm.reset({
      company_id: contract.company_id,
      pack: contract.pack as Pack,
      requires_payment: contract.requires_payment,
      payment_amount: contract.payment_amount || 0,
      payment_currency: contract.payment_currency || 'EUR',
      is_subscription: contract.is_subscription,
    });
    setShowEditModal(true);
  };

  const handleUpdate = (data: ContractFormValues) => {
    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, ...data });
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const handleSendForSignature = (contract: Contract) => {
    setSelectedContract(contract);
    setShowSignatureModal(true);
  };

  const handleCreatePayment = (contract: Contract) => {
    setSelectedContract(contract);
    setShowPaymentModal(true);
  };

  const handleSignatureSubmit = (data: SignatureFormValues) => {
    sendForSignatureMutation.mutate(data);
  };

  const handlePaymentSubmit = (data: { amount: number; currency: string; payment_method: string }) => {
    createPaymentMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleGenerateContract = (contractType: 'performance' | 'setupfee', data: any) => {
    console.log(`Generating ${contractType} contract with data:`, data);
    // Here you would implement the contract generation logic
    // For now, we'll just show a success message
    alert(`Contratto ${contractType} generato con successo!`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'signed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'signed': return <Shield className="h-4 w-4" />;
      case 'paid': return <CreditCard className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const columns = [
    {
      key: 'number',
      label: 'Numero',
      render: (contract: Contract) => (
        <div className="font-medium text-slate-900">{contract.number}</div>
      ),
    },
    {
      key: 'company_name',
      label: 'Cliente',
      render: (contract: Contract) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-slate-400" />
          <span>{contract.company_name || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'pack',
      label: 'Pack',
      render: (contract: Contract) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {contract.pack}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Stato',
      render: (contract: Contract) => (
        <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
          {getStatusIcon(contract.status)}
          {contract.status.toUpperCase()}
        </div>
      ),
    },
    {
      key: 'payment_amount',
      label: 'Importo',
      render: (contract: Contract) => (
        <div className="flex items-center gap-1">
          <Euro className="h-4 w-4 text-slate-400" />
          <span>{contract.payment_amount || 0} {contract.payment_currency}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Creato',
      render: (contract: Contract) => (
        <span className="text-slate-600">
          {new Date(contract.created_at).toLocaleDateString('it-IT')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Azioni',
      render: (contract: Contract) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedContract(contract)}
            className="p-1 text-slate-400 hover:text-slate-600"
            title="Visualizza dettagli"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEdit(contract)}
            className="p-1 text-slate-400 hover:text-blue-600"
            title="Modifica"
          >
            <Edit className="h-4 w-4" />
          </button>
          {contract.status === 'draft' && (
            <button
              onClick={() => handleSendForSignature(contract)}
              className="p-1 text-slate-400 hover:text-green-600"
              title="Invia per firma"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
          {contract.status === 'signed' && contract.requires_payment && (
            <button
              onClick={() => handleCreatePayment(contract)}
              className="p-1 text-slate-400 hover:text-green-600"
              title="Crea pagamento"
            >
              <CreditCard className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleDelete(contract.id)}
            className="p-1 text-slate-400 hover:text-red-600"
            title="Elimina"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Start Kit - Gestione Contratti</h1>
          <p className="text-slate-600">Workflow completo: creazione, firma, pagamento e monitoraggio</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuovo Contratto
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contracts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Contratti
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generator'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Generatore Contratti
          </button>
          {selectedContract && (
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeline'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Timeline
            </button>
          )}
        </nav>
      </div>

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <>
          {/* Filters */}
          <FiltersToolbar
            filters={filters}
            onFiltersChange={setFilters}
            onReset={resetFilters}
            filterConfigs={[
              {
                key: 'query',
                label: 'Cerca',
                type: 'search',
                placeholder: 'Numero, cliente...',
              },
              {
                key: 'status',
                label: 'Stato',
                type: 'select',
                options: [
                  { value: '', label: 'Tutti gli stati' },
                  { value: 'draft', label: 'Bozza' },
                  { value: 'sent', label: 'Inviato' },
                  { value: 'signed', label: 'Firmato' },
                  { value: 'paid', label: 'Pagato' },
                  { value: 'completed', label: 'Completato' },
                ],
              },
              {
                key: 'pack',
                label: 'Pack',
                type: 'select',
                options: [
                  { value: '', label: 'Tutti i pack' },
                  { value: 'Setup-Fee', label: 'Setup Fee' },
                  { value: 'Performance', label: 'Performance' },
                  { value: 'Subscription', label: 'Subscription' },
                  { value: 'Drive Test', label: 'Drive Test' },
                ],
              },
            ]}
          />

          {/* Data Table */}
          <DataTable
            data={contractsQuery.data?.data || []}
            columns={columns}
            loading={contractsQuery.isLoading}
            error={error}
            emptyMessage="Nessun contratto trovato"
          />

          {/* Pagination */}
          {contractsQuery.data && (
            <PaginationControls
              pagination={pagination}
              hasNextPage={contractsQuery.data.hasNextPage}
              hasPrevPage={contractsQuery.data.hasPrevPage}
              onNextPage={pagination.nextPage}
              onPrevPage={pagination.prevPage}
            />
          )}
        </>
      )}

      {/* Contract Generator Tab */}
      {activeTab === 'generator' && (
        <ContractGenerator onGenerateContract={handleGenerateContract} />
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && selectedContract && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Timeline Contratto</h3>
            <div className="text-sm text-slate-600">
              {selectedContract.number}
            </div>
          </div>
          <div className="space-y-4">
            {timeline.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{event.title}</div>
                  {event.description && (
                    <div className="text-sm text-slate-600 mt-1">{event.description}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-2">
                    {new Date(event.created_at).toLocaleString('it-IT')}
                    {event.created_by_name && ` • ${event.created_by_name}`}
                  </div>
                </div>
              </div>
            ))}
            {timeline.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Nessun evento nella timeline
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Nuovo Contratto"
      >
        <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cliente *
            </label>
            <select
              {...createForm.register('company_id')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seleziona un cliente...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.ragione_sociale}
                </option>
              ))}
            </select>
            {createForm.formState.errors.company_id && (
              <p className="text-red-600 text-sm mt-1">
                {createForm.formState.errors.company_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pack *
            </label>
            <select
              {...createForm.register('pack')}
              onChange={(e) => {
                const pack = e.target.value as Pack;
                const packData = PACKS.find(p => p.id === pack);
                if (packData) {
                  createForm.setValue('payment_amount', packData.price);
                  createForm.setValue('is_subscription', pack === 'Subscription');
                }
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seleziona un pack...</option>
              {PACKS.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.name} - €{pack.price}
                </option>
              ))}
            </select>
            {createForm.formState.errors.pack && (
              <p className="text-red-600 text-sm mt-1">
                {createForm.formState.errors.pack.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Importo *
              </label>
              <input
                type="number"
                step="0.01"
                {...createForm.register('payment_amount', { valueAsNumber: true })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {createForm.formState.errors.payment_amount && (
                <p className="text-red-600 text-sm mt-1">
                  {createForm.formState.errors.payment_amount.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Valuta
              </label>
              <select
                {...createForm.register('payment_currency')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...createForm.register('requires_payment')}
                className="text-blue-600"
              />
              <span className="text-sm text-slate-700">Richiede pagamento</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...createForm.register('is_subscription')}
                className="text-blue-600"
              />
              <span className="text-sm text-slate-700">Abbonamento</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note (opzionale)
            </label>
            <textarea
              {...createForm.register('notes')}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Note aggiuntive..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creazione...' : 'Crea Contratto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Contract Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifica Contratto"
      >
        <form onSubmit={createForm.handleSubmit(handleUpdate)} className="space-y-4">
          {/* Same form fields as create */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Signature Modal */}
      <Modal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title="Invia per Firma"
      >
        <form onSubmit={signatureForm.handleSubmit(handleSignatureSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome Firmatario *
            </label>
            <input
              type="text"
              {...signatureForm.register('signer_name')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Mario Rossi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Firmatario *
            </label>
            <input
              type="email"
              {...signatureForm.register('signer_email')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="mario.rossi@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Telefono (opzionale)
            </label>
            <input
              type="tel"
              {...signatureForm.register('signer_phone')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="+39 123 456 7890"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...signatureForm.register('require_otp')}
                className="text-blue-600"
              />
              <span className="text-sm text-slate-700">Richiedi OTP</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Scadenza (ore)
              </label>
              <input
                type="number"
                {...signatureForm.register('expires_in_hours', { valueAsNumber: true })}
                className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
                min="1"
                max="720"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSignatureModal(false)}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={sendForSignatureMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {sendForSignatureMutation.isPending ? 'Invio...' : 'Invia per Firma'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Crea Pagamento"
      >
        {selectedContract && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-slate-600">Importo</div>
              <div className="text-lg font-semibold">
                €{selectedContract.payment_amount} {selectedContract.payment_currency}
              </div>
            </div>
            <button
              onClick={() => handlePaymentSubmit({
                amount: selectedContract.payment_amount || 0,
                currency: selectedContract.payment_currency || 'EUR',
                payment_method: 'card'
              })}
              disabled={createPaymentMutation.isPending}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {createPaymentMutation.isPending ? 'Creazione...' : 'Crea Pagamento'}
            </button>
          </div>
        )}
      </Modal>

      {/* Signature Request Success */}
      {signatureRequest && (
        <Modal
          isOpen={!!signatureRequest}
          onClose={() => setSignatureRequest(null)}
          title="Richiesta Firma Creata"
        >
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-800">
                Link di firma creato con successo!
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Firmatario</label>
                <div className="text-sm text-slate-600">{signatureRequest.signer_name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <div className="text-sm text-slate-600">{signatureRequest.signer_email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Scadenza</label>
                <div className="text-sm text-slate-600">
                  {new Date(signatureRequest.expires_at).toLocaleString('it-IT')}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(signatureRequest.public_url)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Copy className="h-4 w-4" />
                Copia Link
              </button>
              <a
                href={signatureRequest.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <ExternalLink className="h-4 w-4" />
                Apri Link
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Intent Success */}
      {paymentIntent && (
        <Modal
          isOpen={!!paymentIntent}
          onClose={() => setPaymentIntent(null)}
          title="Pagamento Creato"
        >
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-800">
                Payment intent creato con successo!
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Importo</label>
                <div className="text-sm text-slate-600">
                  €{paymentIntent.amount} {paymentIntent.currency}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Stato</label>
                <div className="text-sm text-slate-600">{paymentIntent.status}</div>
              </div>
            </div>
            {!paymentIntent.payment_url && (
              <button
                onClick={() => createPaymentLinkMutation.mutate()}
                disabled={createPaymentLinkMutation.isPending}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {createPaymentLinkMutation.isPending ? 'Creazione...' : 'Crea Link Pagamento'}
              </button>
            )}
            {paymentIntent.payment_url && (
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(paymentIntent.payment_url)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Copy className="h-4 w-4" />
                  Copia Link
                </button>
                <a
                  href={paymentIntent.payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apri Link
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Elimina Contratto"
        message="Sei sicuro di voler eliminare questo contratto? Questa azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
      />
    </div>
  );
}