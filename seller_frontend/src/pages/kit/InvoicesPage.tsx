import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { PaymentProofUpload } from '@components/kit/PaymentProofUpload';
import type { Invoice, InvoiceFormData, Contract } from '@types/invoices';

const invoiceSchema = z.object({
  contract_id: z.string().min(1, 'Contratto obbligatorio'),
  amount: z.number().positive('Importo deve essere positivo'),
  currency: z.string().min(1, 'Valuta obbligatoria')
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoicesPage() {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const queryClient = useQueryClient();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      contract_id: '',
      amount: 0,
      currency: 'EUR'
    }
  });

  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: () => apiClient<{ data: Invoice[] }>('invoices', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: () => apiClient<{ data: Contract[] }>('contracts', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceFormData) =>
      apiClient<{ success: boolean; id: string }>('invoices', {
        token,
        method: 'POST',
        body: data
      }),
    onSuccess: (data) => {
      toast.success('Fattura creata con successo!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedInvoice({ id: data.id } as Invoice);
      setShowUploadForm(true);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella creazione della fattura');
    }
  });

  const requestApprovalMutation = useMutation({
    mutationFn: ({ invoice_id, proof_id }: { invoice_id: string; proof_id: string }) =>
      apiClient(`invoices/${invoice_id}/request-approval`, {
        token,
        method: 'POST',
        body: { payment_proof_id: proof_id }
      }),
    onSuccess: () => {
      toast.success('Richiesta di approvazione inviata all\'admin!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowUploadForm(false);
      setSelectedInvoice(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'invio della richiesta');
    }
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: (invoice_id: string) =>
      apiClient(`invoices/${invoice_id}/send`, {
        token,
        method: 'POST'
      }),
    onSuccess: () => {
      toast.success('Fattura inviata via email!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'invio della fattura');
    }
  });

  const downloadInvoiceMutation = useMutation({
    mutationFn: (invoice_id: string) =>
      apiClient(`invoices/${invoice_id}/pdf`, {
        token,
        method: 'GET'
      }),
    onSuccess: (data) => {
      if (data.file_url) {
        window.open(data.file_url, '_blank');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nel download della fattura');
    }
  });

  const onSubmit = (data: InvoiceFormValues) => {
    createInvoiceMutation.mutate(data);
  };

  const handleUploadComplete = (proofId: string) => {
    if (selectedInvoice) {
      requestApprovalMutation.mutate({ 
        invoice_id: selectedInvoice.id, 
        proof_id: proofId 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Bozza', className: 'bg-gray-100 text-gray-700' },
      pending_approval: { label: 'In Attesa Approvazione', className: 'bg-yellow-100 text-yellow-700' },
      approved: { label: 'Approvata', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rifiutata', className: 'bg-red-100 text-red-700' },
      sent: { label: 'Inviata', className: 'bg-blue-100 text-blue-700' },
      paid: { label: 'Pagata', className: 'bg-green-100 text-green-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const invoices = invoicesQuery.data ?? [];
  const contracts = contractsQuery.data ?? [];
  const signedContracts = contracts.filter(c => c.status === 'signed');

  const pendingCount = invoices.filter(i => i.status === 'pending_approval').length;
  const approvedCount = invoices.filter(i => i.status === 'approved').length;
  const paidCount = invoices.filter(i => i.status === 'paid').length;

  if (!selectedClient) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-lg font-semibold text-slate-900 mb-2">⚠️ Nessun cliente selezionato</div>
          <div className="text-sm text-slate-500">
            Seleziona un cliente per gestire le fatture
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestione Fatture</h1>
        <p className="text-slate-600">
          Crea e gestisci fatture per <strong>{selectedClient.data.name}</strong>
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{invoices.length}</div>
          <div className="text-sm text-slate-600">Totale Fatture</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          <div className="text-sm text-slate-600">In Attesa</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          <div className="text-sm text-slate-600">Approvate</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{paidCount}</div>
          <div className="text-sm text-slate-600">Pagate</div>
        </div>
      </div>

      {/* Create Invoice Form */}
      {!showUploadForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Crea Nuova Fattura</h2>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contratto Associato *
              </label>
              <select
                {...form.register('contract_id')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Seleziona un contratto</option>
                {signedContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.company_name} - {contract.pack} (€{contract.payment_amount?.toLocaleString()})
                  </option>
                ))}
              </select>
              {form.formState.errors.contract_id && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.contract_id.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Importo (€) *
                </label>
                <input
                  {...form.register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="0.00"
                />
                {form.formState.errors.amount && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valuta
                </label>
                <select
                  {...form.register('currency')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={createInvoiceMutation.isPending || signedContracts.length === 0}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {createInvoiceMutation.isPending ? 'Creazione...' : 'Crea Fattura'}
              </button>

              {signedContracts.length === 0 && (
                <p className="text-sm text-slate-500 flex items-center">
                  ⚠️ Nessun contratto firmato disponibile
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Payment Proof Upload */}
      {showUploadForm && selectedInvoice && (
        <div className="mb-8">
          <PaymentProofUpload
            onUploadComplete={handleUploadComplete}
            onCancel={() => {
              setShowUploadForm(false);
              setSelectedInvoice(null);
            }}
          />
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Fatture Esistenti ({invoices.length})
        </h2>

        {invoicesQuery.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Caricamento fatture...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nessuna fattura trovata</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-slate-900">
                      Fattura #{invoice.invoice_number}
                    </h3>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex gap-2">
                    {invoice.status === 'approved' && (
                      <>
                        <button
                          onClick={() => downloadInvoiceMutation.mutate(invoice.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          📄 PDF
                        </button>
                        <button
                          onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          📧 Invia
                        </button>
                      </>
                    )}
                    
                    {invoice.status === 'rejected' && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowUploadForm(true);
                        }}
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                      >
                        🔄 Ricarica Prova
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-slate-600 space-y-1">
                  <div>Cliente: {invoice.client_name}</div>
                  <div>Importo: €{invoice.amount.toLocaleString()}</div>
                  <div>Creato: {new Date(invoice.created_at).toLocaleDateString('it-IT')}</div>
                  {invoice.sent_at && (
                    <div>Inviato: {new Date(invoice.sent_at).toLocaleDateString('it-IT')}</div>
                  )}
                  {invoice.paid_at && (
                    <div>Pagato: {new Date(invoice.paid_at).toLocaleDateString('it-IT')}</div>
                  )}
                  {invoice.rejection_reason && (
                    <div className="text-red-600">
                      <strong>Motivo rifiuto:</strong> {invoice.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

