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
import { ShoppingCart, Eye, Trash2, ExternalLink } from 'lucide-react';

interface CheckoutRow {
  id: string;
  session: string;
  referral_id: string | null;
  referral_code?: string;
  opportunity_id: string | null;
  opportunity_title?: string;
  status: string;
  metadata: any;
  created_at: string;
}

export default function CheckoutsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', search: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingCheckout, setViewingCheckout] = useState<CheckoutRow | null>(null);

  const checkoutsQuery = useQuery({
    queryKey: ['checkouts', filters],
    queryFn: () =>
      apiClient<{ data: CheckoutRow[] }>('checkouts', {
        token,
        searchParams: filters,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`checkouts/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
      setDeletingId(null);
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      completed: { label: 'Completato', className: 'bg-green-100 text-green-700' },
      pending: { label: 'In Attesa', className: 'bg-yellow-100 text-yellow-700' },
      abandoned: { label: 'Abbandonato', className: 'bg-red-100 text-red-700' },
      expired: { label: 'Scaduto', className: 'bg-slate-100 text-slate-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const rows = checkoutsQuery.data?.data ?? [];
  const completedCount = rows.filter(c => c.status === 'completed').length;
  const abandonedCount = rows.filter(c => c.status === 'abandoned').length;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Checkouts</h2>
          <p className="text-sm text-slate-500">Gestisci le sessioni di checkout</p>
        </div>
        <ShoppingCart className="h-8 w-8 text-slate-400" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Totale Checkouts</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Completati</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Abbandonati</p>
          <p className="text-2xl font-bold text-red-600">{abandonedCount}</p>
        </div>
      </div>

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Cerca per session o referral..."
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
          <option value="abandoned">Abbandonato</option>
          <option value="expired">Scaduto</option>
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
            id: 'session', 
            header: 'Session ID', 
            cell: (checkout: CheckoutRow) => (
              <div className="font-mono text-xs text-slate-600">
                {checkout.session.substring(0, 16)}...
              </div>
            )
          },
          { 
            id: 'referral', 
            header: 'Referral', 
            cell: (checkout: CheckoutRow) => 
              checkout.referral_id ? (
                <Link
                  to={`/referrals?id=${checkout.referral_id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                  {checkout.referral_code || checkout.referral_id.substring(0, 8)}
                </Link>
              ) : (
                <span className="text-slate-400">—</span>
              )
          },
          { 
            id: 'opportunity', 
            header: 'Opportunità', 
            cell: (checkout: CheckoutRow) => 
              checkout.opportunity_id ? (
                <Link
                  to={`/opportunities?id=${checkout.opportunity_id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                  {checkout.opportunity_title || checkout.opportunity_id.substring(0, 8)}
                </Link>
              ) : (
                <span className="text-slate-400">—</span>
              )
          },
          { 
            id: 'created', 
            header: 'Data Creazione', 
            cell: (checkout: CheckoutRow) => (
              <div className="text-sm text-slate-600">{formatDate(checkout.created_at)}</div>
            )
          },
          { 
            id: 'status', 
            header: 'Stato', 
            cell: (checkout: CheckoutRow) => getStatusBadge(checkout.status)
          },
          {
            id: 'actions',
            header: 'Azioni',
            cell: (checkout: CheckoutRow) => (
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setViewingCheckout(checkout)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  title="Visualizza dettagli"
                >
                  <Eye className="h-4 w-4" />
                  Dettagli
                </button>
                <button
                  onClick={() => setDeletingId(checkout.id)}
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
            <ShoppingCart className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-1">Nessun checkout trovato</h3>
            <p className="text-sm text-slate-500">Le sessioni di checkout appariranno qui.</p>
          </div>
        }
      />

      {/* Dialog Dettagli Checkout */}
      {viewingCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Checkout {viewingCheckout.id.substring(0, 8)}
                </h3>
                <p className="text-sm text-slate-500">
                  Creato il {new Date(viewingCheckout.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => setViewingCheckout(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Session ID</h4>
                <div className="text-sm font-mono text-slate-600 break-all">{viewingCheckout.session}</div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Stato</h4>
                {getStatusBadge(viewingCheckout.status)}
              </div>

              {viewingCheckout.referral_id && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Referral</h4>
                  <Link
                    to={`/referrals?id=${viewingCheckout.referral_id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {viewingCheckout.referral_code || viewingCheckout.referral_id}
                  </Link>
                </div>
              )}

              {viewingCheckout.opportunity_id && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Opportunità</h4>
                  <Link
                    to={`/opportunities?id=${viewingCheckout.opportunity_id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {viewingCheckout.opportunity_title || viewingCheckout.opportunity_id}
                  </Link>
                </div>
              )}

              {viewingCheckout.metadata && Object.keys(viewingCheckout.metadata).length > 0 && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Metadata</h4>
                  <pre className="text-xs text-slate-600 bg-slate-50 p-2 rounded overflow-auto max-h-48">
                    {JSON.stringify(viewingCheckout.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setViewingCheckout(null)}
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
        title="Elimina Checkout"
        message="Sei sicuro di voler eliminare questo checkout? Questa azione non può essere annullata."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
