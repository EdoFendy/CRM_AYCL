import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';

const paymentProofSchema = z.object({
  payment_date: z.string().min(1, 'Data pagamento obbligatoria'),
  payment_method: z.string().min(1, 'Metodo pagamento obbligatorio'),
  amount: z.number().positive('Importo deve essere positivo'),
  notes: z.string().optional()
});

type PaymentProofFormData = z.infer<typeof paymentProofSchema>;

interface PaymentProofUploadProps {
  onUploadComplete?: (proofId: string) => void;
  onCancel?: () => void;
}

export function PaymentProofUpload({ onUploadComplete, onCancel }: PaymentProofUploadProps) {
  const { token } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PaymentProofFormData>({
    resolver: zodResolver(paymentProofSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: '',
      amount: 0,
      notes: ''
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: PaymentProofFormData & { file: File }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('payment_date', data.payment_date);
      formData.append('payment_method', data.payment_method);
      formData.append('amount', data.amount.toString());
      if (data.notes) {
        formData.append('notes', data.notes);
      }

      return apiClient<{ id: string; file_url: string }>('invoices/upload-proof', {
        token,
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (data) => {
      toast.success('Prova pagamento caricata con successo!');
      onUploadComplete?.(data.id);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nel caricamento della prova pagamento');
    }
  });

  const onSubmit = (data: PaymentProofFormData) => {
    if (!selectedFile) {
      toast.error('Seleziona un file');
      return;
    }

    uploadMutation.mutate({ ...data, file: selectedFile });
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File troppo grande. Massimo 10MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo file non supportato. Usa JPG, PNG, GIF o PDF.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Carica Prova Pagamento</h3>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            File Prova Pagamento *
          </label>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="space-y-3">
                <div className="text-green-600">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
                  <p className="text-xs text-green-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Rimuovi file
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-slate-400">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    Trascina qui il file o{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      clicca per selezionare
                    </button>
                  </p>
                  <p className="text-xs text-slate-500">
                    JPG, PNG, GIF, PDF (max 10MB)
                  </p>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              accept="image/*,application/pdf"
              className="hidden"
            />
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Data Pagamento *
            </label>
            <input
              {...form.register('payment_date')}
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {form.formState.errors.payment_date && (
              <p className="text-red-600 text-xs mt-1">{form.formState.errors.payment_date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Metodo Pagamento *
            </label>
            <select
              {...form.register('payment_method')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seleziona metodo</option>
              <option value="bank_transfer">Bonifico Bancario</option>
              <option value="credit_card">Carta di Credito</option>
              <option value="paypal">PayPal</option>
              <option value="klarna">Klarna</option>
              <option value="stripe">Stripe</option>
              <option value="other">Altro</option>
            </select>
            {form.formState.errors.payment_method && (
              <p className="text-red-600 text-xs mt-1">{form.formState.errors.payment_method.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Importo Pagato (€) *
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
            Note (opzionale)
          </label>
          <textarea
            {...form.register('notes')}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Note aggiuntive sul pagamento..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={uploadMutation.isPending || !selectedFile}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Caricamento...' : 'Carica Prova'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700"
            >
              Annulla
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

