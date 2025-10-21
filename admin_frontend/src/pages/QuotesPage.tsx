import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FileText, Download, Eye, Trash2, CheckCircle, Loader2 } from 'lucide-react';

interface QuoteRow {
  id: string;
  number: string;
  date: string;
  customer_type?: 'contact' | 'company';
  contact_id?: string;
  company_id?: string;
  customer_data: {
    name: string;
    address?: string;
    vat?: string;
  };
  total: number;
  currency: string;
  status: string;
  pdf_url?: string;
  created_at: string;
}

interface ConfirmFormData {
  invoiceNumber: string;
  invoiceDueDate: string;
  receiptNumber: string;
  receiptProvider: string;
  paymentDate: string;
}

export default function QuotesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', search: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingQuote, setConfirmingQuote] = useState<QuoteRow | null>(null);
  const [viewingQuote, setViewingQuote] = useState<QuoteRow | null>(null);
  const [confirmForm, setConfirmForm] = useState<ConfirmFormData>({
    invoiceNumber: '',
    invoiceDueDate: '',
    receiptNumber: '',
    receiptProvider: 'AYCL',
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  const quotesQuery = useQuery({
    queryKey: ['quotes', filters],
    queryFn: () =>
      apiClient<{ data: QuoteRow[] }>('quotes', {
        token,
        searchParams: filters,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`quotes/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setDeletingId(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmFormData }) =>
      apiClient<{ success: boolean; invoice_id: string; receipt_id: string; message: string }>(
        `quotes/${id}/confirm`,
        {
          method: 'POST',
          token,
          body: data,
        }
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      alert(res.message || 'Preventivo confermato con successo!');
      setConfirmingQuote(null);
      // Reset form
      setConfirmForm({
        invoiceNumber: '',
        invoiceDueDate: '',
        receiptNumber: '',
        receiptProvider: 'AYCL',
        paymentDate: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (error: any) => {
      alert(error.message || 'Errore durante la conferma del preventivo');
    },
  });

  const formatDate = (dateString: string) => {
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
      sent: { label: 'Inviato', className: 'bg-blue-100 text-blue-700' },
      accepted: { label: 'Accettato', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rifiutato', className: 'bg-red-100 text-red-700' },
      converted: { label: 'Confermato', className: 'bg-purple-100 text-purple-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const rows = quotesQuery.data?.data ?? [];
  const totalAmount = rows.reduce((sum, q) => sum + q.total, 0);
  const convertedCount = rows.filter(q => q.status === 'converted').length;

  const handleOpenConfirm = (quote: QuoteRow) => {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 giorni
    
    setConfirmForm({
      invoiceNumber: `INV-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`,
      invoiceDueDate: dueDate.toISOString().slice(0, 10),
      receiptNumber: `RCP-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`,
      receiptProvider: 'AYCL',
      paymentDate: now.toISOString().slice(0, 10),
    });
    setConfirmingQuote(quote);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Preventivi</h2>
          <p className="text-sm text-slate-500">Gestisci i preventivi generati dal sistema</p>
        </div>
        <FileText className="h-8 w-8 text-slate-400" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Totale Preventivi</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Valore Totale</p>
          <p className="text-2xl font-bold text-slate-900">{formatAmount(totalAmount, 'EUR')}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Confermati</p>
          <p className="text-2xl font-bold text-green-600">{convertedCount}</p>
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
          <option value="sent">Inviato</option>
          <option value="accepted">Accettato</option>
          <option value="rejected">Rifiutato</option>
          <option value="converted">Confermato</option>
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
            cell: (quote: QuoteRow) => (
              <div className="font-medium text-slate-900">{quote.number}</div>
            )
          },
          { 
            id: 'customer', 
            header: 'Cliente', 
            cell: (quote: QuoteRow) => (
              <div>
                <div className="font-medium text-slate-900">{quote.customer_data.name}</div>
                {quote.customer_data.vat && (
                  <div className="text-xs text-slate-500">P.IVA: {quote.customer_data.vat}</div>
                )}
              </div>
            )
          },
          { 
            id: 'date', 
            header: 'Data', 
            cell: (quote: QuoteRow) => formatDate(quote.date)
          },
          { 
            id: 'status', 
            header: 'Stato', 
            cell: (quote: QuoteRow) => getStatusBadge(quote.status)
          },
          {
            id: 'amount',
            header: 'Importo',
            cell: (quote: QuoteRow) => (
              <div className="text-right font-medium">
                {formatAmount(quote.total, quote.currency)}
              </div>
            ),
          },
          {
            id: 'actions',
            header: 'Azioni',
            cell: (quote: QuoteRow) => (
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setViewingQuote(quote)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  title="Visualizza dettagli"
                >
                  <Eye className="h-4 w-4" />
                  Dettagli
                </button>
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/quotes/${quote.id}/pdf?token=${token}`}
                  download={`preventivo-${quote.number}.pdf`}
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </a>
                {(quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'draft') && (
                  <button
                    onClick={() => handleOpenConfirm(quote)}
                    className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                    title="Conferma preventivo e genera fattura + ricevuta"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Conferma
                  </button>
                )}
                {quote.status !== 'converted' && (
                  <button
                    onClick={() => setDeletingId(quote.id)}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                    Elimina
                  </button>
                )}
              </div>
            ),
          },
        ]}
        emptyState={
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-1">Nessun preventivo trovato</h3>
            <p className="text-sm text-slate-500">I preventivi generati appariranno qui.</p>
          </div>
        }
      />

      {/* Dialog Dettagli Preventivo */}
      {viewingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Preventivo {viewingQuote.number}</h3>
                <p className="text-sm text-slate-500">
                  Creato il {new Date(viewingQuote.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => setViewingQuote(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Cliente */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Cliente</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Nome:</strong> {viewingQuote.customer_data.name}</div>
                  {viewingQuote.customer_data.address && (
                    <div><strong>Indirizzo:</strong> {viewingQuote.customer_data.address}</div>
                  )}
                  {viewingQuote.customer_data.vat && (
                    <div><strong>P.IVA:</strong> {viewingQuote.customer_data.vat}</div>
                  )}
                  {viewingQuote.customer_type && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Collegato al database ({viewingQuote.customer_type === 'contact' ? 'Contatto' : 'Azienda'})
                    </div>
                  )}
                </div>
              </div>

              {/* Totali */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Importo</h4>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Totale:</span>
                  <span>{formatAmount(viewingQuote.total, viewingQuote.currency)}</span>
                </div>
              </div>

              {/* Stato */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Stato</h4>
                {getStatusBadge(viewingQuote.status)}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setViewingQuote(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Conferma Preventivo con Form */}
      {confirmingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Conferma Preventivo {confirmingQuote.number}
                </h3>
                <p className="text-sm text-slate-500">
                  Verranno generate automaticamente fattura e ricevuta per il cliente
                </p>
              </div>
              <button
                onClick={() => setConfirmingQuote(null)}
                className="text-slate-400 hover:text-slate-600"
                disabled={confirmMutation.isPending}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                confirmMutation.mutate({ id: confirmingQuote.id, data: confirmForm });
              }}
              className="space-y-4"
            >
              {/* Dati Fattura */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">Dati Fattura</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Numero Fattura
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={confirmForm.invoiceNumber}
                      onChange={(e) => setConfirmForm(p => ({ ...p, invoiceNumber: e.target.value }))}
                      placeholder="INV-2025-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Data Scadenza Fattura
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={confirmForm.invoiceDueDate}
                      onChange={(e) => setConfirmForm(p => ({ ...p, invoiceDueDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Dati Ricevuta */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">Dati Ricevuta</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Numero Ricevuta
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={confirmForm.receiptNumber}
                      onChange={(e) => setConfirmForm(p => ({ ...p, receiptNumber: e.target.value }))}
                      placeholder="RCP-2025-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Provider
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={confirmForm.receiptProvider}
                      onChange={(e) => setConfirmForm(p => ({ ...p, receiptProvider: e.target.value }))}
                      placeholder="AYCL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Data Pagamento
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={confirmForm.paymentDate}
                      onChange={(e) => setConfirmForm(p => ({ ...p, paymentDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                <div className="font-semibold mb-1">ℹ️ Cosa succederà</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Il preventivo verrà contrassegnato come "Confermato"</li>
                  <li>Verrà generata una fattura con i dati inseriti</li>
                  <li>Verrà generata una ricevuta collegata alla fattura</li>
                  <li>I documenti saranno visibili al cliente nelle relative sezioni</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingQuote(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  disabled={confirmMutation.isPending}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Conferma e Genera
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Conferma Eliminazione */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Elimina Preventivo"
        message="Sei sicuro di voler eliminare questo preventivo? Questa azione non può essere annullata."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
