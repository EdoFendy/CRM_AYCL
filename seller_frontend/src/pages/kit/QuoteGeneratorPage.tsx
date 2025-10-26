import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { ClientDataForm } from '@components/kit/ClientDataForm';
import type { Quote, QuoteFormData, ClientData } from '@types/quotes';

const quoteSchema = z.object({
  client_id: z.string().min(1, 'Cliente obbligatorio'),
  title: z.string().min(1, 'Titolo obbligatorio'),
  description: z.string().optional(),
  items: z.array(z.object({
    name: z.string().min(1, 'Nome prodotto obbligatorio'),
    description: z.string().optional(),
    quantity: z.number().positive('Quantità deve essere positiva'),
    unit_price: z.number().positive('Prezzo unitario deve essere positivo')
  })).min(1, 'Aggiungi almeno un prodotto'),
  tax_rate: z.number().min(0).max(100, 'Aliquota IVA non valida'),
  currency: z.string().min(1, 'Valuta obbligatoria'),
  valid_until: z.string().optional()
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

export default function QuoteGeneratorPage() {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const queryClient = useQueryClient();
  const [showClientForm, setShowClientForm] = useState(false);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      client_id: selectedClient?.data.id || '',
      title: '',
      description: '',
      items: [
        { name: '', description: '', quantity: 1, unit_price: 0 }
      ],
      tax_rate: 22, // Default Italian VAT rate
      currency: 'EUR',
      valid_until: ''
    }
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: QuoteFormData) =>
      apiClient<{ success: boolean; id: string; file_url: string }>('quotes', {
        token,
        method: 'POST',
        body: data
      }),
    onSuccess: (data) => {
      toast.success('Preventivo generato con successo!');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      
      // Open PDF in new tab
      if (data.file_url) {
        window.open(data.file_url, '_blank');
      }
      
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella generazione del preventivo');
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ id, client_email }: { id: string; client_email: string }) =>
      apiClient(`quotes/${id}/send`, {
        token,
        method: 'POST',
        body: { client_email }
      }),
    onSuccess: () => {
      toast.success('Preventivo inviato via email!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'invio del preventivo');
    }
  });

  const onSubmit = (data: QuoteFormValues) => {
    createQuoteMutation.mutate(data);
  };

  const handleSendEmail = (quoteId: string) => {
    if (selectedClient?.data.email) {
      sendEmailMutation.mutate({ id: quoteId, client_email: selectedClient.data.email });
    }
  };

  // Calculate totals
  const watchedItems = form.watch('items');
  const watchedTaxRate = form.watch('tax_rate');
  
  const subtotal = watchedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = (subtotal * watchedTaxRate) / 100;
  const total = subtotal + taxAmount;

  if (!selectedClient) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-lg font-semibold text-slate-900 mb-2">⚠️ Nessun cliente selezionato</div>
          <div className="text-sm text-slate-500">
            Seleziona un cliente per generare un preventivo
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Genera Preventivo</h1>
        <p className="text-slate-600">
          Crea un preventivo formale per <strong>{selectedClient.data.name}</strong>
        </p>
      </div>

      {/* Client Data Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Dati Cliente</h2>
          <button
            type="button"
            onClick={() => setShowClientForm(!showClientForm)}
            className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700"
          >
            {showClientForm ? 'Nascondi' : 'Modifica'} Dati
          </button>
        </div>
        
        {showClientForm && (
          <ClientDataForm 
            onClientUpdated={() => setShowClientForm(false)}
            showOptionalFields={true}
          />
        )}
      </div>

      {/* Quote Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Informazioni Preventivo</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Titolo Preventivo *
              </label>
              <input
                {...form.register('title')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Es: Preventivo CRM Enterprise - Q1 2024"
              />
              {form.formState.errors.title && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descrizione
              </label>
              <textarea
                {...form.register('description')}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Descrizione del preventivo..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Aliquota IVA (%)
                </label>
                <input
                  {...form.register('tax_rate', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="22"
                />
                {form.formState.errors.tax_rate && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.tax_rate.message}</p>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valido Fino
                </label>
                <input
                  {...form.register('valid_until')}
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Prodotti/Servizi</h2>
            <button
              type="button"
              onClick={() => appendItem({ name: '', description: '', quantity: 1, unit_price: 0 })}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              + Aggiungi Prodotto
            </button>
          </div>

          <div className="space-y-4">
            {itemFields.map((field, index) => (
              <div key={field.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-900">Prodotto {index + 1}</h3>
                  {itemFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕ Rimuovi
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome Prodotto *
                    </label>
                    <input
                      {...form.register(`items.${index}.name`)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Es: CRM Enterprise License"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Descrizione
                    </label>
                    <input
                      {...form.register(`items.${index}.description`)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Descrizione del prodotto..."
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quantità *
                    </label>
                    <input
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Prezzo Unitario (€) *
                    </label>
                    <input
                      {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Totale
                    </label>
                    <div className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50">
                      €{(watchedItems[index]?.quantity * watchedItems[index]?.unit_price || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Riepilogo Prezzi</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotale:</span>
              <span className="font-medium">€{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">IVA ({watchedTaxRate}%):</span>
              <span className="font-medium">€{taxAmount.toFixed(2)}</span>
            </div>
            
            <div className="border-t border-slate-300 pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Totale:</span>
                <span className="text-green-600">€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createQuoteMutation.isPending}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {createQuoteMutation.isPending ? 'Generazione...' : 'Genera Preventivo PDF'}
          </button>

          <button
            type="button"
            onClick={() => form.reset()}
            className="bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

