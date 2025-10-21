import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Receipt, Download, Eye, Trash2 } from 'lucide-react';

interface ReceiptRow {
  id: string;
  number?: string;
  invoice_id: string | null;
  status: string;
  provider: string | null;
  amount: number;
  currency: string;
  date?: string;
  issued_at: string | null;
  customer_data?: {
    name: string;
    vat?: string;
  };
  created_at: string;
}

export default function ReceiptsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', search: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptRow | null>(null);

  const receiptsQuery = useQuery({
    queryKey: ['receipts', filters],
    queryFn: () =>
      apiClient<{ data: ReceiptRow[] }>('receipts', {
        token,
        searchParams: filters,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`receipts/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setDeletingId(null);
    },
  });

  const formatDate = (dateString?: string | null) => {
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
      issued: { label: 'Emessa', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Annullata', className: 'bg-red-100 text-red-700' },
      pending: { label: 'In Attesa', className: 'bg-yellow-100 text-yellow-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const rows = receiptsQuery.data?.data ?? [];
  const totalAmount = rows.reduce((sum, receipt) => sum + receipt.amount, 0);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Ricevute</h2>
          <p className="text-sm text-slate-500">Gestisci le ricevute emesse</p>
        </div>
        <Receipt className="h-8 w-8 text-slate-400" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Totale Ricevute</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Importo Totale</p>
          <p className="text-2xl font-bold text-slate-900">{formatAmount(totalAmount, 'EUR')}</p>
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
          <option value="issued">Emessa</option>
          <option value="pending">In Attesa</option>
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
            cell: (receipt: ReceiptRow) => (
              <div className="font-medium text-slate-900">
                {receipt.number || receipt.id.substring(0, 8)}
              </div>
            )
          },
          { 
            id: 'customer', 
            header: 'Cliente', 
            cell: (receipt: ReceiptRow) => (
              <div>
                <div className="font-medium text-slate-900">
                  {receipt.customer_data?.name || 'Non specificato'}
                </div>
                {receipt.customer_data?.vat && (
                  <div className="text-xs text-slate-500">P.IVA: {receipt.customer_data.vat}</div>
                )}
              </div>
            )
          },
          { 
            id: 'date', 
            header: 'Data', 
            cell: (receipt: ReceiptRow) => formatDate(receipt.date || receipt.issued_at)
          },
          { 
            id: 'status', 
            header: 'Stato', 
            cell: (receipt: ReceiptRow) => getStatusBadge(receipt.status)
          },
          {
            id: 'amount',
            header: 'Importo',
            cell: (receipt: ReceiptRow) => (
              <div className="text-right font-medium">
                {formatAmount(receipt.amount, receipt.currency)}
              </div>
            ),
          },
          {
            id: 'actions',
            header: 'Azioni',
            cell: (receipt: ReceiptRow) => (
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setViewingReceipt(receipt)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  title="Visualizza dettagli"
                >
                  <Eye className="h-4 w-4" />
                  Dettagli
                </button>
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/receipts/${receipt.id}/pdf?token=${token}`}
                  download={`ricevuta-${receipt.number || receipt.id}.pdf`}
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </a>
                <button
                  onClick={() => setDeletingId(receipt.id)}
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
            <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-1">Nessuna ricevuta trovata</h3>
            <p className="text-sm text-slate-500">Le ricevute generate appariranno qui.</p>
          </div>
        }
      />

      {/* Dialog Dettagli Ricevuta */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Ricevuta {viewingReceipt.number || viewingReceipt.id.substring(0, 8)}
                </h3>
                <p className="text-sm text-slate-500">
                  Creata il {new Date(viewingReceipt.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
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
                  <div><strong>Nome:</strong> {viewingReceipt.customer_data?.name || 'Non specificato'}</div>
                  {viewingReceipt.customer_data?.vat && (
                    <div><strong>P.IVA:</strong> {viewingReceipt.customer_data.vat}</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Data Emissione</h4>
                <div className="text-sm">{formatDate(viewingReceipt.date || viewingReceipt.issued_at)}</div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Importo</h4>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Totale:</span>
                  <span>{formatAmount(viewingReceipt.amount, viewingReceipt.currency)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Stato</h4>
                {getStatusBadge(viewingReceipt.status)}
              </div>

              {viewingReceipt.provider && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Provider</h4>
                  <div className="text-sm">{viewingReceipt.provider}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setViewingReceipt(null)}
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
        title="Elimina Ricevuta"
        message="Sei sicuro di voler eliminare questa ricevuta? Questa azione non può essere annullata."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
