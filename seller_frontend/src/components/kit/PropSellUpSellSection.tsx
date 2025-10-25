import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';

const offerSchema = z.object({
  opportunity_id: z.string().uuid('Seleziona un\'opportunità'),
  offer_type: z.enum(['propsell', 'upsell']),
  title: z.string().min(3, 'Titolo obbligatorio'),
  description: z.string().optional(),
  value: z.number().positive('Valore deve essere positivo'),
  currency: z.string().default('EUR')
});

type OfferFormValues = z.infer<typeof offerSchema>;

interface Opportunity {
  id: string;
  title: string;
  value: number;
  stage: string;
  company_name?: string;
}

export function PropSellUpSellSection() {
  const { token } = useAuth();
  const { selectedClient, hasClient } = useSelectedClient();
  const queryClient = useQueryClient();
  const [offerType, setOfferType] = useState<'propsell' | 'upsell'>('propsell');

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      offer_type: 'propsell',
      title: '',
      description: '',
      value: 0,
      currency: 'EUR'
    }
  });

  // Load opportunities for selected client
  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', selectedClient?.type === 'company' ? selectedClient.data.id : null],
    queryFn: () =>
      apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: {
          company_id: selectedClient?.type === 'company' ? selectedClient.data.id : undefined,
          limit: 50
        }
      }),
    enabled: Boolean(token) && hasClient && selectedClient?.type === 'company',
    select: (res) => res.data ?? []
  });

  const createOfferMutation = useMutation({
    mutationFn: async (values: OfferFormValues) => {
      const response = await apiClient('offers', {
        token,
        method: 'POST',
        body: {
          opportunity_id: values.opportunity_id,
          offer_type: values.offer_type,
          version: 1,
          items: [{
            name: values.title,
            description: values.description || '',
            quantity: 1,
            unit_price: values.value
          }],
          total: values.value,
          currency: values.currency,
          status: 'draft'
        }
      });
      return response;
    },
    onSuccess: () => {
      toast.success(`Offerta ${offerType === 'propsell' ? 'PropSell' : 'UpSell'} creata con successo!`);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella creazione dell\'offerta');
    }
  });

  const onSubmit = (values: OfferFormValues) => {
    createOfferMutation.mutate({ ...values, offer_type: offerType });
  };

  if (!hasClient) {
    return (
      <div className="section-container">
        <div className="empty-state">
          <p className="text-lg font-semibold">⚠️ Nessun cliente selezionato</p>
          <p className="text-sm text-slate-500 mt-2">
            Seleziona un cliente prima di creare offerte PropSell o UpSell
          </p>
        </div>
      </div>
    );
  }

  const opportunities = opportunitiesQuery.data ?? [];

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">📈 Crea PropSell / UpSell</h2>
          <p className="section-description">
            Genera offerte di cross-sell (PropSell) o upgrade (UpSell) per il cliente
          </p>
        </div>
      </div>

      {/* Offer Type Selector */}
      <div className="offer-type-selector">
        <button
          type="button"
          onClick={() => {
            setOfferType('propsell');
            form.setValue('offer_type', 'propsell');
          }}
          className={`offer-type-button ${offerType === 'propsell' ? 'active' : ''}`}
        >
          <div className="offer-type-icon">🔄</div>
          <div className="offer-type-info">
            <div className="offer-type-title">PropSell (Cross-Sell)</div>
            <div className="offer-type-desc">Prodotti/servizi complementari</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setOfferType('upsell');
            form.setValue('offer_type', 'upsell');
          }}
          className={`offer-type-button ${offerType === 'upsell' ? 'active' : ''}`}
        >
          <div className="offer-type-icon">⬆️</div>
          <div className="offer-type-info">
            <div className="offer-type-title">UpSell (Upgrade)</div>
            <div className="offer-type-desc">Versione premium o maggiorata</div>
          </div>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="propsell-form">
        <div className="form-group">
          <label className="form-label">Opportunità di Riferimento *</label>
          <select
            {...form.register('opportunity_id')}
            className="form-input"
          >
            <option value="">Seleziona opportunità...</option>
            {opportunities.map((opp) => (
              <option key={opp.id} value={opp.id}>
                {opp.title} - €{opp.value.toLocaleString()} ({opp.stage})
              </option>
            ))}
          </select>
          {form.formState.errors.opportunity_id && (
            <p className="form-error">{form.formState.errors.opportunity_id.message}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Titolo Offerta *</label>
          <input
            {...form.register('title')}
            className="form-input"
            placeholder={
              offerType === 'propsell'
                ? 'es: Pacchetto Leads Aggiuntivo'
                : 'es: Upgrade a Piano Enterprise'
            }
          />
          {form.formState.errors.title && (
            <p className="form-error">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Descrizione</label>
          <textarea
            {...form.register('description')}
            className="form-textarea"
            rows={3}
            placeholder="Descrizione dettagliata dell'offerta..."
          />
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label className="form-label">Valore (€) *</label>
            <input
              {...form.register('value', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00"
            />
            {form.formState.errors.value && (
              <p className="form-error">{form.formState.errors.value.message}</p>
            )}
          </div>

          <div className="form-group" style={{ width: '120px' }}>
            <label className="form-label">Valuta</label>
            <input
              {...form.register('currency')}
              className="form-input"
              placeholder="EUR"
              maxLength={3}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={createOfferMutation.isPending || !form.formState.isValid}
          className="submit-button"
        >
          {createOfferMutation.isPending
            ? 'Creazione in corso...'
            : `Crea Offerta ${offerType === 'propsell' ? 'PropSell' : 'UpSell'}`}
        </button>
      </form>

      {opportunities.length === 0 && !opportunitiesQuery.isLoading && (
        <div className="info-box">
          <h4 className="info-box-title">💡 Nessuna opportunità trovata</h4>
          <p className="text-sm text-slate-600">
            Crea prima un'opportunità per il cliente selezionato nella sezione Opportunities
          </p>
        </div>
      )}
    </div>
  );
}

