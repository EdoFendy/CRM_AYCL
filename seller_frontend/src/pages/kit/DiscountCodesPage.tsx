import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';

const discountSchema = z.object({
  code: z.string().min(3).max(50).transform(val => val.toUpperCase()),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  expires_at: z.string().optional(),
  max_uses: z.number().int().positive().optional(),
  minimum_amount: z.number().positive().optional(),
  applicable_products: z.array(z.string()).optional()
});

type DiscountFormValues = z.infer<typeof discountSchema>;

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
  minimum_amount?: number;
  applicable_products?: string[];
  created_at: string;
}

export default function DiscountCodesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [testCode, setTestCode] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: '',
      discount_type: 'percentage',
      discount_value: 0
    }
  });

  const discountCodesQuery = useQuery({
    queryKey: ['discount-codes'],
    queryFn: () => apiClient<{ data: DiscountCode[] }>('discount-codes', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  const createMutation = useMutation({
    mutationFn: (values: DiscountFormValues) =>
      apiClient('discount-codes', {
        token,
        method: 'POST',
        body: values
      }),
    onSuccess: () => {
      toast.success('Codice sconto creato!');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore creazione codice');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`discount-codes/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast.success('Codice sconto eliminato');
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiClient(`discount-codes/${id}`, {
        token,
        method: 'PATCH',
        body: { is_active }
      }),
    onSuccess: () => {
      toast.success('Stato codice aggiornato');
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
    }
  });

  const testCodeMutation = useMutation({
    mutationFn: (code: string) =>
      apiClient(`discount-codes/validate/${code}`, {
        token,
        method: 'POST',
        body: { test_amount: 1000 } // Test with €1000
      }),
    onSuccess: (data) => {
      setTestResult(data);
      toast.success('Codice testato con successo');
    },
    onError: (error: any) => {
      setTestResult({ error: error?.message || 'Codice non valido' });
      toast.error('Errore nel test del codice');
    }
  });

  const handleTestCode = () => {
    if (!testCode.trim()) {
      toast.error('Inserisci un codice da testare');
      return;
    }
    testCodeMutation.mutate(testCode.toUpperCase());
  };

  const codes = discountCodesQuery.data ?? [];
  const activeCodes = codes.filter(code => code.is_active);
  const expiredCodes = codes.filter(code => !code.is_active);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Codici Sconto</h1>
        <p className="text-slate-600">
          Gestisci codici sconto con scadenza, limite utilizzi e validazione
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Create New Code */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Crea Nuovo Codice</h2>
          
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Codice *
              </label>
              <input
                {...form.register('code')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="SUMMER2024"
                style={{ textTransform: 'uppercase' }}
              />
              {form.formState.errors.code && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo Sconto *
                </label>
                <select {...form.register('discount_type')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="percentage">Percentuale (%)</option>
                  <option value="fixed">Fisso (€)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valore *
                </label>
                <input
                  {...form.register('discount_value', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="10"
                />
                {form.formState.errors.discount_value && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.discount_value.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data Scadenza
                </label>
                <input
                  {...form.register('expires_at')}
                  type="datetime-local"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Limite Utilizzi
                </label>
                <input
                  {...form.register('max_uses', { valueAsNumber: true })}
                  type="number"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Illimitato"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Importo Minimo (€)
              </label>
              <input
                {...form.register('minimum_amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nessun minimo"
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creazione...' : 'Crea Codice Sconto'}
            </button>
          </form>
        </div>

        {/* Test Code */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Testa Codice</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Codice da Testare
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="SUMMER2024"
                />
                <button
                  type="button"
                  onClick={handleTestCode}
                  disabled={testCodeMutation.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {testCodeMutation.isPending ? 'Test...' : 'Testa'}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                {testResult.error ? (
                  <div className="text-red-800">
                    <strong>Errore:</strong> {testResult.error}
                  </div>
                ) : (
                  <div className="text-green-800">
                    <div className="font-semibold mb-2">✅ Codice Valido</div>
                    <div className="text-sm space-y-1">
                      <div><strong>Tipo:</strong> {testResult.discount_type === 'percentage' ? 'Percentuale' : 'Fisso'}</div>
                      <div><strong>Valore:</strong> {testResult.discount_type === 'percentage' ? `${testResult.discount_value}%` : `€${testResult.discount_value}`}</div>
                      <div><strong>Sconto applicato:</strong> €{testResult.discount_amount}</div>
                      <div><strong>Importo finale:</strong> €{testResult.final_amount}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Codes List */}
      <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Codici Sconto ({codes.length})
        </h2>

        {discountCodesQuery.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Caricamento...</p>
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nessun codice sconto</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Codes */}
            {activeCodes.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-3">Codici Attivi ({activeCodes.length})</h3>
                <div className="grid gap-3">
                  {activeCodes.map((code) => (
                    <div key={code.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-lg font-bold text-blue-600">{code.code}</span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            Attivo
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: code.id, is_active: false })}
                            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                          >
                            Disattiva
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(code.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Sconto:</span>
                          <div className="font-semibold">
                            {code.discount_type === 'percentage' ? `${code.discount_value}%` : `€${code.discount_value}`}
                          </div>
                        </div>
                        
                        {code.expires_at && (
                          <div>
                            <span className="text-slate-600">Scade:</span>
                            <div className="font-semibold">
                              {new Date(code.expires_at).toLocaleDateString('it-IT')}
                            </div>
                          </div>
                        )}
                        
                        {code.max_uses && (
                          <div>
                            <span className="text-slate-600">Utilizzi:</span>
                            <div className="font-semibold">
                              {code.current_uses}/{code.max_uses}
                            </div>
                          </div>
                        )}
                        
                        {code.minimum_amount && (
                          <div>
                            <span className="text-slate-600">Minimo:</span>
                            <div className="font-semibold">€{code.minimum_amount}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Codes */}
            {expiredCodes.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-3">Codici Scaduti ({expiredCodes.length})</h3>
                <div className="grid gap-3">
                  {expiredCodes.map((code) => (
                    <div key={code.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-lg font-bold text-slate-500">{code.code}</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-medium">
                            Scaduto
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: code.id, is_active: true })}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Riattiva
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(code.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-slate-600">
                        <div>Sconto: {code.discount_type === 'percentage' ? `${code.discount_value}%` : `€${code.discount_value}`}</div>
                        {code.expires_at && (
                          <div>Scadeva: {new Date(code.expires_at).toLocaleDateString('it-IT')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

