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
  max_uses: z.number().int().positive().optional()
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
  created_at: string;
}

export function DiscountCodesSection() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

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

  const codes = discountCodesQuery.data ?? [];

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">🎟️ Codici Sconto</h2>
          <p className="section-description">
            Crea codici sconto con scadenza e limite utilizzi
          </p>
        </div>
      </div>

      <div className="discount-layout">
        {/* Create Form */}
        <div className="discount-form-card">
          <h3 className="card-title">Crea Nuovo Codice</h3>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="discount-form">
            <div className="form-group">
              <label className="form-label">Codice *</label>
              <input
                {...form.register('code')}
                className="form-input"
                placeholder="SUMMER2024"
                style={{ textTransform: 'uppercase' }}
              />
              {form.formState.errors.code && (
                <p className="form-error">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">Tipo Sconto *</label>
                <select {...form.register('discount_type')} className="form-input">
                  <option value="percentage">Percentuale (%)</option>
                  <option value="fixed">Fisso (€)</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label className="form-label">Valore *</label>
                <input
                  {...form.register('discount_value', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="10"
                />
                {form.formState.errors.discount_value && (
                  <p className="form-error">{form.formState.errors.discount_value.message}</p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Data Scadenza</label>
              <input
                {...form.register('expires_at')}
                type="datetime-local"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Limite Utilizzi</label>
              <input
                {...form.register('max_uses', { valueAsNumber: true })}
                type="number"
                className="form-input"
                placeholder="Illimitato"
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="submit-button"
            >
              {createMutation.isPending ? 'Creazione...' : 'Crea Codice Sconto'}
            </button>
          </form>
        </div>

        {/* Codes List */}
        <div className="discount-list-card">
          <h3 className="card-title">Codici Attivi ({codes.length})</h3>
          {discountCodesQuery.isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Caricamento...</p>
            </div>
          ) : codes.length === 0 ? (
            <div className="empty-state">
              <p>Nessun codice sconto</p>
            </div>
          ) : (
            <div className="discount-codes-list">
              {codes.map((code) => (
                <div key={code.id} className="discount-code-card">
                  <div className="discount-code-header">
                    <div className="discount-code-code">{code.code}</div>
                    <span className={`status-badge status-${code.is_active ? 'active' : 'inactive'}`}>
                      {code.is_active ? 'Attivo' : 'Scaduto'}
                    </span>
                  </div>
                  <div className="discount-code-details">
                    <div className="discount-code-value">
                      {code.discount_type === 'percentage' ? `${code.discount_value}%` : `€${code.discount_value}`}
                    </div>
                    {code.expires_at && (
                      <div className="discount-code-meta">
                        Scade: {new Date(code.expires_at).toLocaleDateString('it-IT')}
                      </div>
                    )}
                    {code.max_uses && (
                      <div className="discount-code-meta">
                        Utilizzi: {code.current_uses}/{code.max_uses}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(code.id)}
                    className="delete-button-sm"
                    disabled={deleteMutation.isPending}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

