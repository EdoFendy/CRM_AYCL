import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CreditCard, Eye, Trash2, ExternalLink } from 'lucide-react';

interface PaymentRow {
  id: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  invoice_id?: string;
  transaction_id?: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
}

export default function PaymentsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', provider: '', search: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingPayment, setViewingPayment] = useState<PaymentRow | null>(null);

  const paymentsQuery = useQuery({
    queryKey: ['payments', filters],
    queryFn: () =>
      apiClient<{ data: PaymentRow[] }>('payments', {
        token,
        searchParams: filters,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`payments/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setDeletingId(null);
    },
  });

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
      completed: { label: 'Completato', className: 'bg-green-100 text-green-700' },
      pending: { label: 'In Attesa', className: 'bg-yellow-100 text-yellow-700' },
      failed: { label: 'Fallito', className: 'bg-red-100 text-red-700' },
      refunded: { label: 'Rimborsato', className: 'bg-blue-100 text-blue-700' },
      cancelled: { label: 'Annullato', className: 'bg-slate-100 text-slate-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getProviderBadge = (provider: string) => {
    const providerConfig: Record<string, { label: string; className: string }> = {
      stripe: { label: 'Stripe', className: 'bg-purple-100 text-purple-700' },
      paypal: { label: 'PayPal', className: 'bg-blue-100 text-blue-700' },
      bank_transfer: { label: 'Bonifico', className: 'bg-slate-100 text-slate-700' },
      cash: { label: 'Contanti', className: 'bg-green-100 text-green-700' },
    };
    const config = providerConfig[provider] || { label: provider, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const rows = paymentsQuery.data?.data ?? [];
  const totalAmount = rows.filter(p => p.status === 'completed').reduce((sum, payment) => sum + payment.amount, 0);
  const completedCount = rows.filter(p => p.status === 'completed').length;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Pagamenti</h2>
          <p className="text-sm text-slate-500">Gestisci i pagamenti ricevuti</p>
        </div>
        <CreditCard className="h-8 w-8 text-slate-400" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Totale Pagamenti</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Completati</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Importo Incassato</p>
          <p className="text-2xl font-bold text-slate-900">{formatAmount(totalAmount, 'EUR')}</p>
        </div>
      </div>

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Cerca per ID transazione..."
          value={filters.search ?? ''}
          onChange={(event) => setFilters({ search: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.status ?? ''}
          onChange={(event) => setFilters({ status: event.target.value })}
        >
          <option value="">Tutti gli stati</option>
          <option value="completed">Completato</option>
          <option value="pending">In Attesa</option>
          <option value="failed">Fallito</option>
          <option value="refunded">Rimborsato</option>
          <option value="cancelled">Annullato</option>
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.provider ?? ''}
          onChange={(event) => setFilters({ provider: event.target.value })}
        >
          <option value="">Tutti i provider</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
          <option value="bank_transfer">Bonifico</option>
          <option value="cash">Contanti</option>
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
            id: 'id', 
            header: 'ID', 
            cell: (payment: PaymentRow) => (
              <div className="font-mono text-xs text-slate-600">
                {payment.id.substring(0, 8)}
              </div>
            )
          },
          { 
            id: 'transaction', 
            header: 'Transazione', 
            cell: (payment: PaymentRow) => (
              <div className="font-mono text-xs text-slate-600">
                {payment.transaction_id || '—'}
              </div>
            )
          },
          { 
            id: 'provider', 
            header: 'Provider', 
            cell: (payment: PaymentRow) => getProviderBadge(payment.provider)
          },
          { 
            id: 'date', 
            header: 'Data', 
            cell: (payment: PaymentRow) => formatDate(payment.payment_date || payment.created_at)
          },
          { 
            id: 'status', 
            header: 'Stato', 
            cell: (payment: PaymentRow) => getStatusBadge(payment.status)
          },
          {
            id: 'amount',
            header: 'Importo',
            cell: (payment: PaymentRow) => (
              <div className="text-right font-medium">
                {formatAmount(payment.amount, payment.currency)}
              </div>
            ),
          },
          {
            id: 'invoice',
            header: 'Fattura',
            cell: (payment: PaymentRow) =>
              payment.invoice_id ? (
                <Link 
                  to={`/invoices?id=${payment.invoice_id}`} 
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                  {payment.invoice_id.substring(0, 8)}
                </Link>
              ) : (
                <span className="text-slate-400">—</span>
              ),
          },
          {
            id: 'actions',
            header: 'Azioni',
            cell: (payment: PaymentRow) => (
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setViewingPayment(payment)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  title="Visualizza dettagli"
                >
                  <Eye className="h-4 w-4" />
                  Dettagli
                </button>
                <button
                  onClick={() => setDeletingId(payment.id)}
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
            <CreditCard className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-1">Nessun pagamento trovato</h3>
            <p className="text-sm text-slate-500">I pagamenti ricevuti appariranno qui.</p>
          </div>
        }
      />

      {/* Dialog Dettagli Pagamento */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Pagamento {viewingPayment.id.substring(0, 8)}
                </h3>
                <p className="text-sm text-slate-500">
                  Creato il {new Date(viewingPayment.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => setViewingPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Provider</h4>
                  {getProviderBadge(viewingPayment.provider)}
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Stato</h4>
                  {getStatusBadge(viewingPayment.status)}
                </div>
              </div>

              {viewingPayment.transaction_id && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">ID Transazione</h4>
                  <div className="text-sm font-mono text-slate-600">{viewingPayment.transaction_id}</div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Data Pagamento</h4>
                <div className="text-sm">{formatDate(viewingPayment.payment_date || viewingPayment.created_at)}</div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Importo</h4>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Totale:</span>
                  <span>{formatAmount(viewingPayment.amount, viewingPayment.currency)}</span>
                </div>
              </div>

              {viewingPayment.invoice_id && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Fattura Collegata</h4>
                  <Link 
                    to={`/invoices?id=${viewingPayment.invoice_id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Vedi fattura {viewingPayment.invoice_id.substring(0, 8)}
                  </Link>
                </div>
              )}

              {viewingPayment.notes && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Note</h4>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap">{viewingPayment.notes}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setViewingPayment(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Conferma Eliminazione */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Elimina Pagamento"
        message="Sei sicuro di voler eliminare questo pagamento? Questa azione non può essere annullata."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
