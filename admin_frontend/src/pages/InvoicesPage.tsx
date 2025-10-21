import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FileText, Download, Eye, Trash2, Send, DollarSign } from 'lucide-react';

interface InvoiceRow {
  id: string;
  number?: string;
  status: string;
  amount: number;
  currency: string;
  issued_at?: string;
  due_date?: string;
  customer_data?: {
    name: string;
    vat?: string;
  };
  created_at: string;
}

export default function InvoicesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', search: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRow | null>(null);
  const [workflowInvoice, setWorkflowInvoice] = useState<InvoiceRow | null>(null);
  const [workflowAction, setWorkflowAction] = useState<'send' | 'paid' | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () =>
      apiClient<{ data: InvoiceRow[] }>('invoices', {
        token,
        searchParams: filters,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`invoices/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeletingId(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient(`invoices/${id}`, {
        method: 'PATCH',
        token,
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setWorkflowInvoice(null);
      setWorkflowAction(null);
    },
  });

  const handleWorkflowAction = () => {
    if (!workflowInvoice || !workflowAction) return;
    const statusMap = { send: 'sent', paid: 'paid' };
    updateStatusMutation.mutate({ id: workflowInvoice.id, status: statusMap[workflowAction] });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Bozza', className: 'bg-gray-100 text-gray-700' },
      pending: { label: 'In Attesa', className: 'bg-yellow-100 text-yellow-700' },
      sent: { label: 'Inviata', className: 'bg-blue-100 text-blue-700' },
      paid: { label: 'Pagata', className: 'bg-green-100 text-green-700' },
      overdue: { label: 'Scaduta', className: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Annullata', className: 'bg-slate-100 text-slate-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const rows = invoicesQuery.data?.data ?? [];
  const totalAmount = rows.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Fatture</h2>
          <p className="text-sm text-slate-500">Gestisci le fatture emesse</p>
        </div>
        <FileText className="h-8 w-8 text-slate-400" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Totale Fatture</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Importo Totale</p>
          <p className="text-2xl font-bold text-slate-900">{formatAmount(totalAmount, 'EUR')}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Pagate</p>
          <p className="text-2xl font-bold text-green-600">
            {rows.filter(i => i.status === 'paid').length}
          </p>
        </div>
      </div>

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Cerca per numero o cliente..."
          value={filters.search ?? ''}
          onChange={(event) => setFilters({ search: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.status ?? ''}
          onChange={(event) => setFilters({ status: event.target.value })}
        >
          <option value="">Tutti gli stati</option>
          <option value="draft">Bozza</option>
          <option value="pending">In Attesa</option>
          <option value="sent">Inviata</option>
          <option value="paid">Pagata</option>
          <option value="overdue">Scaduta</option>
          <option value="cancelled">Annullata</option>
        </select>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          onClick={resetFilters}
        >
          Reset
        </button>
      </FiltersToolbar>

      <DataTable
        data={rows}
        columns={[
          { 
            id: 'number', 
            header: 'Numero', 
            cell: (invoice: InvoiceRow) => (
              <div className="font-medium text-slate-900">{invoice.number || invoice.id.substring(0, 8)}</div>
            )
          },
          { 
            id: 'customer', 
            header: 'Cliente', 
            cell: (invoice: InvoiceRow) => (
              <div>
                <div className="font-medium text-slate-900">
                  {invoice.customer_data?.name || 'Non specificato'}
                </div>
                {invoice.customer_data?.vat && (
                  <div className="text-xs text-slate-500">P.IVA: {invoice.customer_data.vat}</div>
                )}
              </div>
            )
          },
          { 
            id: 'issued', 
            header: 'Data Emissione', 
            cell: (invoice: InvoiceRow) => formatDate(invoice.issued_at)
          },
          { 
            id: 'due', 
            header: 'Scadenza', 
            cell: (invoice: InvoiceRow) => formatDate(invoice.due_date)
          },
          { 
            id: 'status', 
            header: 'Stato', 
            cell: (invoice: InvoiceRow) => getStatusBadge(invoice.status)
          },
          {
            id: 'amount',
            header: 'Importo',
            cell: (invoice: InvoiceRow) => (
              <div className="text-right font-medium">
                {formatAmount(invoice.amount, invoice.currency)}
              </div>
            ),
          },
          {
            id: 'actions',
            header: 'Azioni',
            cell: (invoice: InvoiceRow) => (
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setViewingInvoice(invoice)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  title="Visualizza dettagli"
                >
                  <Eye className="h-4 w-4" />
                  Dettagli
                </button>
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/invoices/${invoice.id}/pdf?token=${token}`}
                  download={`fattura-${invoice.number || invoice.id}.pdf`}
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </a>
                {invoice.status === 'draft' && (
                  <button
                    onClick={() => {
                      setWorkflowInvoice(invoice);
                      setWorkflowAction('send');
                    }}
                    className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                    title="Invia fattura"
                  >
                    <Send className="h-4 w-4" />
                    Invia
                  </button>
                )}
                {invoice.status === 'sent' && (
                  <button
                    onClick={() => {
                      setWorkflowInvoice(invoice);
                      setWorkflowAction('paid');
                    }}
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                    title="Segna come pagata"
                  >
                    <DollarSign className="h-4 w-4" />
                    Pagata
                  </button>
                )}
                <button
                  onClick={() => setDeletingId(invoice.id)}
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                  title="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </button>
              </div>
            ),
          },
        ]}
        emptyState={
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-1">Nessuna fattura trovata</h3>
            <p className="text-sm text-slate-500">Le fatture generate appariranno qui.</p>
          </div>
        }
      />

      {/* Dialog Dettagli Fattura */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Fattura {viewingInvoice.number || viewingInvoice.id.substring(0, 8)}
                </h3>
                <p className="text-sm text-slate-500">
                  Creata il {new Date(viewingInvoice.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => setViewingInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Cliente</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Nome:</strong> {viewingInvoice.customer_data?.name || 'Non specificato'}</div>
                  {viewingInvoice.customer_data?.vat && (
                    <div><strong>P.IVA:</strong> {viewingInvoice.customer_data.vat}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Data Emissione</h4>
                  <div className="text-sm">{formatDate(viewingInvoice.issued_at)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Scadenza</h4>
                  <div className="text-sm">{formatDate(viewingInvoice.due_date)}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Importo</h4>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Totale:</span>
                  <span>{formatAmount(viewingInvoice.amount, viewingInvoice.currency)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Stato</h4>
                {getStatusBadge(viewingInvoice.status)}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setViewingInvoice(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Workflow */}
      <ConfirmDialog
        isOpen={workflowInvoice !== null && workflowAction !== null}
        onClose={() => {
          setWorkflowInvoice(null);
          setWorkflowAction(null);
        }}
        onConfirm={handleWorkflowAction}
        title={workflowAction === 'send' ? 'Invia Fattura' : 'Segna come Pagata'}
        message={`Confermi di voler ${workflowAction === 'send' ? 'inviare' : 'segnare come pagata'} questa fattura?`}
        confirmVariant="primary"
        isLoading={updateStatusMutation.isPending}
      />

      {/* Dialog Conferma Eliminazione */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Elimina Fattura"
        message="Sei sicuro di voler eliminare questa fattura? Questa azione non può essere annullata."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
