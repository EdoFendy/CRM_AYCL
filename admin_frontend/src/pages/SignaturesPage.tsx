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
import { PenTool, Eye, Trash2, ExternalLink, CheckCircle, Clock } from 'lucide-react';

interface SignatureRow {
  id: string;
  contract_id: string;
  contract_company?: string;
  signer_name: string;
  signer_email: string;
  method: string | null;
  status: string;
  signed_at: string | null;
  ip: string | null;
  created_at: string;
}

export default function SignaturesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', search: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingSignature, setViewingSignature] = useState<SignatureRow | null>(null);

  const signaturesQuery = useQuery({
    queryKey: ['signatures', filters],
    queryFn: () =>
      apiClient<{ data: SignatureRow[] }>('signatures', {
        token,
        searchParams: filters,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`signatures/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      setDeletingId(null);
    },
  });

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      completed: { label: 'Completata', className: 'bg-green-100 text-green-700', icon: CheckCircle },
      pending: { label: 'In Attesa', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
      sent: { label: 'Inviata', className: 'bg-blue-100 text-blue-700', icon: Clock },
      expired: { label: 'Scaduta', className: 'bg-red-100 text-red-700', icon: Clock },
      rejected: { label: 'Rifiutata', className: 'bg-slate-100 text-slate-700', icon: Clock },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700', icon: Clock };
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const getMethodBadge = (method: string | null) => {
    if (!method) return <span className="text-slate-400">—</span>;
    
    const methodConfig: Record<string, { label: string; className: string }> = {
      otp: { label: 'OTP', className: 'bg-blue-100 text-blue-700' },
      email: { label: 'Email', className: 'bg-purple-100 text-purple-700' },
      digital: { label: 'Digitale', className: 'bg-green-100 text-green-700' },
      manual: { label: 'Manuale', className: 'bg-slate-100 text-slate-700' },
    };
    const config = methodConfig[method] || { label: method, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const rows = signaturesQuery.data?.data ?? [];
  const completedCount = rows.filter(sig => sig.status === 'completed').length;
  const pendingCount = rows.filter(sig => sig.status === 'pending' || sig.status === 'sent').length;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Firme Elettroniche</h2>
          <p className="text-sm text-slate-500">Gestisci le firme elettroniche</p>
        </div>
        <PenTool className="h-8 w-8 text-slate-400" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Totale Firme</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Completate</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">In Attesa</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
      </div>

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Cerca per nome o email..."
          value={filters.search ?? ''}
          onChange={(event) => setFilters({ search: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.status ?? ''}
          onChange={(event) => setFilters({ status: event.target.value })}
        >
          <option value="">Tutti gli stati</option>
          <option value="completed">Completata</option>
          <option value="pending">In Attesa</option>
          <option value="sent">Inviata</option>
          <option value="expired">Scaduta</option>
          <option value="rejected">Rifiutata</option>
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
            id: 'signer', 
            header: 'Firmatario', 
            cell: (sig: SignatureRow) => (
              <div>
                <p className="font-medium text-slate-900">{sig.signer_name}</p>
                <p className="text-xs text-slate-500">{sig.signer_email}</p>
              </div>
            )
          },
          { 
            id: 'contract', 
            header: 'Contratto', 
            cell: (sig: SignatureRow) => (
              <div>
                <Link
                  to={`/contracts?id=${sig.contract_id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                  {sig.contract_id.substring(0, 8)}
                </Link>
                {sig.contract_company && (
                  <p className="text-xs text-slate-500 mt-1">{sig.contract_company}</p>
                )}
              </div>
            )
          },
          { 
            id: 'method', 
            header: 'Metodo', 
            cell: (sig: SignatureRow) => getMethodBadge(sig.method)
          },
          { 
            id: 'status', 
            header: 'Stato', 
            cell: (sig: SignatureRow) => getStatusBadge(sig.status)
          },
          { 
            id: 'signed', 
            header: 'Data Firma', 
            cell: (sig: SignatureRow) => (
              <div className="text-sm text-slate-600">{formatDate(sig.signed_at)}</div>
            )
          },
          {
            id: 'actions',
            header: 'Azioni',
            cell: (sig: SignatureRow) => (
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setViewingSignature(sig)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  title="Visualizza dettagli"
                >
                  <Eye className="h-4 w-4" />
                  Dettagli
                </button>
                <button
                  onClick={() => setDeletingId(sig.id)}
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
            <PenTool className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-1">Nessuna firma trovata</h3>
            <p className="text-sm text-slate-500">Le firme elettroniche appariranno qui.</p>
          </div>
        }
      />

      {/* Dialog Dettagli Firma */}
      {viewingSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Firma {viewingSignature.id.substring(0, 8)}
                </h3>
                <p className="text-sm text-slate-500">
                  Richiesta il {new Date(viewingSignature.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => setViewingSignature(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Firmatario</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Nome:</strong> {viewingSignature.signer_name}</div>
                  <div><strong>Email:</strong> {viewingSignature.signer_email}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Contratto</h4>
                <Link
                  to={`/contracts?id=${viewingSignature.contract_id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Vedi contratto {viewingSignature.contract_id.substring(0, 8)}
                </Link>
                {viewingSignature.contract_company && (
                  <p className="text-xs text-slate-500 mt-2">{viewingSignature.contract_company}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Metodo</h4>
                  {getMethodBadge(viewingSignature.method)}
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Stato</h4>
                  {getStatusBadge(viewingSignature.status)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Data Firma</h4>
                <div className="text-sm">{formatDate(viewingSignature.signed_at)}</div>
              </div>

              {viewingSignature.ip && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Indirizzo IP</h4>
                  <div className="text-sm font-mono text-slate-600">{viewingSignature.ip}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setViewingSignature(null)}
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
        title="Elimina Firma"
        message="Sei sicuro di voler eliminare questa firma? Questa azione non può essere annullata."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
