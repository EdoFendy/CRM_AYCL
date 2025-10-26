import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { toast } from 'sonner';
import { DollarSign, Upload, FileText, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

interface Contract {
  id: string;
  company_id: string;
  status: string;
  created_at: string;
}

export function InvoiceManager() {
  const { token } = useAuth();
  const [contractId, setContractId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [submittedInvoice, setSubmittedInvoice] = useState<any>(null);

  // Fetch contracts (placeholder - in produzione filtrare per seller)
  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: () => apiClient<{ data: Contract[] }>('contracts', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato file non valido. Usa JPG, PNG o PDF');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File troppo grande. Massimo 5MB');
      return;
    }

    setPaymentProof(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }

    toast.success('File caricato con successo');
  };

  const submitInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!paymentProof && !requiresApproval) {
        throw new Error('Carica la prova di pagamento o richiedi approvazione admin');
      }

      if (!contractId) {
        throw new Error('Seleziona un contratto');
      }

      if (amount <= 0) {
        throw new Error('Inserisci un importo valido');
      }

      const formData = new FormData();
      formData.append('contract_id', contractId);
      formData.append('amount', amount.toString());
      formData.append('notes', notes);
      formData.append('requires_approval', requiresApproval.toString());
      
      if (paymentProof) {
        formData.append('payment_proof', paymentProof);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/invoices/seller-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante la richiesta');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setSubmittedInvoice(data.invoice);
      toast.success(data.message || 'Richiesta inviata con successo');
      
      // Reset form
      setContractId('');
      setAmount(0);
      setNotes('');
      setPaymentProof(null);
      setPreviewUrl('');
      setRequiresApproval(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante la richiesta');
    }
  });

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-pink-900">
            <p className="font-semibold mb-1">Come funziona</p>
            <ul className="list-disc list-inside space-y-1 text-pink-800">
              <li>Carica la prova di pagamento del cliente (screenshot, ricevuta, etc.)</li>
              <li>Seleziona il contratto di riferimento</li>
              <li>Se non hai la prova di pagamento, richiedi l'approvazione dell'admin</li>
              <li>La fattura verrà generata automaticamente o dopo approvazione</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contract Selection */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Contratto di Riferimento *</h3>
        <select
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          <option value="">Seleziona un contratto...</option>
          {contractsQuery.data?.map((contract) => (
            <option key={contract.id} value={contract.id}>
              Contratto {contract.id.slice(0, 8)} - {contract.status} - {new Date(contract.created_at).toLocaleDateString('it-IT')}
            </option>
          ))}
        </select>
        <p className="text-sm text-slate-600 mt-2">
          Seleziona il contratto per cui vuoi richiedere la fattura
        </p>
      </div>

      {/* Amount */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Importo Fattura *</h3>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">€</div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount || ''}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full pl-10 pr-4 py-3 text-xl border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Payment Proof Upload */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-pink-600" />
          Prova di Pagamento
        </h3>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-pink-400 transition-colors">
            <input
              type="file"
              id="payment-proof"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="payment-proof"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-pink-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {paymentProof ? paymentProof.name : 'Carica prova di pagamento'}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  JPG, PNG o PDF - Max 5MB
                </p>
              </div>
            </label>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Anteprima:</p>
              <img
                src={previewUrl}
                alt="Payment proof preview"
                className="max-h-64 mx-auto rounded-lg"
              />
            </div>
          )}

          {/* No Proof Option */}
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="requires-approval"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="w-5 h-5 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
            />
            <label htmlFor="requires-approval" className="text-sm text-amber-900 cursor-pointer">
              Non ho la prova di pagamento, richiedi approvazione admin
            </label>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Note Aggiuntive</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Aggiungi note o informazioni aggiuntive per l'admin..."
        />
      </div>

      {/* Actions */}
      <button
        onClick={() => submitInvoiceMutation.mutate()}
        disabled={submitInvoiceMutation.isPending || !contractId || amount <= 0}
        className="w-full py-4 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl hover:from-pink-700 hover:to-pink-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all font-bold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        {submitInvoiceMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {requiresApproval ? 'Invio richiesta...' : 'Generazione in corso...'}
          </>
        ) : (
          <>
            {requiresApproval ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Richiedi Approvazione Admin
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Genera Fattura
              </>
            )}
          </>
        )}
      </button>

      {/* Submitted Invoice Info */}
      {submittedInvoice && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 animate-in fade-in duration-300">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {submittedInvoice.approval_status === 'pending' 
              ? 'Richiesta Inviata all\'Admin'
              : 'Fattura Generata con Successo'}
          </h3>
          <div className="space-y-2 text-sm text-green-800">
            <p><strong>Numero:</strong> {submittedInvoice.number}</p>
            <p><strong>Importo:</strong> €{submittedInvoice.amount}</p>
            <p><strong>Status:</strong> {submittedInvoice.status}</p>
            {submittedInvoice.approval_status === 'pending' && (
              <p className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-amber-900">
                ⏳ La tua richiesta è in attesa di approvazione da parte dell'admin
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Invoices Placeholder */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Fatture Recenti</h3>
        <div className="text-center py-8 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p>Le tue fatture appariranno qui</p>
          <p className="text-sm mt-1">Dopo la generazione, potrai visualizzarle e scaricarle</p>
        </div>
      </div>
    </div>
  );
}