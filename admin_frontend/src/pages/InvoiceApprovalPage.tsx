import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, Loader2, FileText, AlertCircle } from 'lucide-react';

interface PendingInvoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  approval_status: string;
  payment_proof_url: string | null;
  seller_notes: string | null;
  created_at: string;
  seller_name: string;
  contract_id: string;
}

export default function InvoiceApprovalPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Fetch pending invoices
  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'pending-approval'],
    queryFn: () => apiClient<{ data: PendingInvoice[] }>('invoices/pending-approval', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  // Approve/Reject mutation
  const approveMutation = useMutation({
    mutationFn: async ({ invoiceId, approved }: { invoiceId: string; approved: boolean }) => {
      await apiClient(`invoices/${invoiceId}/approve`, {
        token,
        method: 'PATCH',
        body: {
          approved,
          admin_notes: adminNotes || undefined
        }
      });
    },
    onSuccess: (_, variables) => {
      toast.success(variables.approved ? 'Fattura approvata!' : 'Fattura rifiutata');
      setSelectedInvoice(null);
      setAdminNotes('');
      queryClient.invalidateQueries({ queryKey: ['invoices', 'pending-approval'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante l\'operazione');
    }
  });

  const handleApprove = (invoice: PendingInvoice) => {
    if (confirm(`Confermi di voler approvare la fattura ${invoice.number}?`)) {
      approveMutation.mutate({ invoiceId: invoice.id, approved: true });
    }
  };

  const handleReject = (invoice: PendingInvoice) => {
    if (confirm(`Confermi di voler rifiutare la fattura ${invoice.number}?`)) {
      approveMutation.mutate({ invoiceId: invoice.id, approved: false });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Approvazione Fatture Seller</h1>
        <p className="text-slate-600 mt-1">
          Rivedi e approva le richieste di fatturazione dei seller
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">In Attesa</p>
              <p className="text-2xl font-bold text-amber-600">{invoicesQuery.data?.length || 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Fatture in Attesa di Approvazione
          </h2>
        </div>

        {invoicesQuery.isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-slate-600">Caricamento fatture...</p>
          </div>
        ) : invoicesQuery.data && invoicesQuery.data.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {invoicesQuery.data.map((invoice) => (
              <div key={invoice.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900">{invoice.number}</h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                        In Attesa
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-slate-600">Seller</p>
                        <p className="font-medium text-slate-900">{invoice.seller_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Importo</p>
                        <p className="font-medium text-slate-900">
                          {invoice.currency} {invoice.amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Data Richiesta</p>
                        <p className="font-medium text-slate-900">
                          {new Date(invoice.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Prova Pagamento</p>
                        <p className="font-medium text-slate-900">
                          {invoice.payment_proof_url ? (
                            <span className="text-green-600">✓ Presente</span>
                          ) : (
                            <span className="text-red-600">✗ Assente</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {invoice.seller_notes && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm font-medium text-blue-900 mb-1">Note Seller:</p>
                        <p className="text-sm text-blue-800">{invoice.seller_notes}</p>
                      </div>
                    )}

                    {selectedInvoice?.id === invoice.id && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Note Admin (opzionale)
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="Aggiungi note per il seller..."
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {invoice.payment_proof_url && (
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${invoice.payment_proof_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizza Prova
                    </a>
                  )}

                  {selectedInvoice?.id !== invoice.id ? (
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="px-4 py-2 text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                      Rivedi
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(invoice)}
                        disabled={approveMutation.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-300 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approva
                      </button>

                      <button
                        onClick={() => handleReject(invoice)}
                        disabled={approveMutation.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Rifiuta
                      </button>

                      <button
                        onClick={() => {
                          setSelectedInvoice(null);
                          setAdminNotes('');
                        }}
                        className="px-4 py-2 text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
                      >
                        Annulla
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Nessuna fattura in attesa</p>
            <p className="text-sm text-slate-500 mt-2">
              Tutte le richieste sono state processate
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Processo di Approvazione</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Rivedi i dettagli della fattura e le note del seller</li>
              <li>Verifica la prova di pagamento se presente</li>
              <li>Approva per generare la fattura automaticamente</li>
              <li>Rifiuta se ci sono problemi (il seller verrà notificato)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

