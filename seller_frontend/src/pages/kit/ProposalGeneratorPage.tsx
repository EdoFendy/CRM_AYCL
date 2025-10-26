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
import type { Proposal, ProposalFormData, ClientData } from '@types/quotes';

const proposalSchema = z.object({
  client_id: z.string().min(1, 'Cliente obbligatorio'),
  title: z.string().min(1, 'Titolo obbligatorio'),
  description: z.string().min(1, 'Descrizione obbligatoria'),
  solution_overview: z.string().min(1, 'Panoramica soluzione obbligatoria'),
  suggested_products: z.array(z.object({
    name: z.string().min(1, 'Nome prodotto obbligatorio'),
    description: z.string().min(1, 'Descrizione obbligatoria'),
    estimated_price: z.number().positive().optional(),
    category: z.string().min(1, 'Categoria obbligatoria')
  })).min(1, 'Aggiungi almeno un prodotto'),
  price_range: z.object({
    min: z.number().positive('Prezzo minimo obbligatorio'),
    max: z.number().positive('Prezzo massimo obbligatorio')
  }),
  benefits: z.array(z.string()).min(1, 'Aggiungi almeno un beneficio'),
  next_steps: z.string().min(1, 'Prossimi passi obbligatori')
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

export default function ProposalGeneratorPage() {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const queryClient = useQueryClient();
  const [showClientForm, setShowClientForm] = useState(false);

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      client_id: selectedClient?.data.id || '',
      title: '',
      description: '',
      solution_overview: '',
      suggested_products: [
        { name: '', description: '', category: 'Servizi' }
      ],
      price_range: { min: 0, max: 0 },
      benefits: [''],
      next_steps: ''
    }
  });

  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control: form.control,
    name: 'suggested_products'
  });

  const { fields: benefitFields, append: appendBenefit, remove: removeBenefit } = useFieldArray({
    control: form.control,
    name: 'benefits'
  });

  const createProposalMutation = useMutation({
    mutationFn: (data: ProposalFormData) =>
      apiClient<{ success: boolean; id: string; file_url: string }>('quotes/proposal', {
        token,
        method: 'POST',
        body: data
      }),
    onSuccess: (data) => {
      toast.success('Proposta generata con successo!');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      
      // Open PDF in new tab
      if (data.file_url) {
        window.open(data.file_url, '_blank');
      }
      
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella generazione della proposta');
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ id, client_email }: { id: string; client_email: string }) =>
      apiClient(`quotes/proposal/${id}/send`, {
        token,
        method: 'POST',
        body: { client_email }
      }),
    onSuccess: () => {
      toast.success('Proposta inviata via email!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'invio della proposta');
    }
  });

  const onSubmit = (data: ProposalFormValues) => {
    createProposalMutation.mutate(data);
  };

  const handleSendEmail = (proposalId: string) => {
    if (selectedClient?.data.email) {
      sendEmailMutation.mutate({ id: proposalId, client_email: selectedClient.data.email });
    }
  };

  if (!selectedClient) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-lg font-semibold text-slate-900 mb-2">⚠️ Nessun cliente selezionato</div>
          <div className="text-sm text-slate-500">
            Seleziona un cliente per generare una proposta
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Genera Proposta</h1>
        <p className="text-slate-600">
          Crea una proposta commerciale per <strong>{selectedClient.data.name}</strong>
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

      {/* Proposal Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Informazioni Proposta</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Titolo Proposta *
              </label>
              <input
                {...form.register('title')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Es: Soluzione CRM Personalizzata per Azienda XYZ"
              />
              {form.formState.errors.title && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descrizione *
              </label>
              <textarea
                {...form.register('description')}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Breve descrizione della proposta..."
              />
              {form.formState.errors.description && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Panoramica Soluzione *
              </label>
              <textarea
                {...form.register('solution_overview')}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Descrivi la soluzione proposta in dettaglio..."
              />
              {form.formState.errors.solution_overview && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.solution_overview.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Suggested Products */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Prodotti/Servizi Suggeriti</h2>
            <button
              type="button"
              onClick={() => appendProduct({ name: '', description: '', category: 'Servizi' })}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              + Aggiungi Prodotto
            </button>
          </div>

          <div className="space-y-4">
            {productFields.map((field, index) => (
              <div key={field.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-900">Prodotto {index + 1}</h3>
                  {productFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
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
                      {...form.register(`suggested_products.${index}.name`)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Es: CRM Enterprise"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Categoria *
                    </label>
                    <select
                      {...form.register(`suggested_products.${index}.category`)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="Servizi">Servizi</option>
                      <option value="Software">Software</option>
                      <option value="Consulenza">Consulenza</option>
                      <option value="Formazione">Formazione</option>
                      <option value="Supporto">Supporto</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descrizione *
                  </label>
                  <textarea
                    {...form.register(`suggested_products.${index}.description`)}
                    rows={2}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Descrivi il prodotto/servizio..."
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prezzo Stimato (€)
                  </label>
                  <input
                    {...form.register(`suggested_products.${index}.estimated_price`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Range Prezzi</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prezzo Minimo (€) *
              </label>
              <input
                {...form.register('price_range.min', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="1000.00"
              />
              {form.formState.errors.price_range?.min && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.price_range.min.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prezzo Massimo (€) *
              </label>
              <input
                {...form.register('price_range.max', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="5000.00"
              />
              {form.formState.errors.price_range?.max && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.price_range.max.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Benefici e Vantaggi</h2>
            <button
              type="button"
              onClick={() => appendBenefit('')}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              + Aggiungi Beneficio
            </button>
          </div>

          <div className="space-y-3">
            {benefitFields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <input
                  {...form.register(`benefits.${index}`)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Es: Riduzione del 30% dei tempi di gestione"
                />
                {benefitFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBenefit(index)}
                    className="text-red-600 hover:text-red-800 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Prossimi Passi</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cosa succede dopo? *
            </label>
            <textarea
              {...form.register('next_steps')}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Es: 1. Analisi dettagliata dei requisiti, 2. Presentazione demo, 3. Proposta commerciale dettagliata..."
            />
            {form.formState.errors.next_steps && (
              <p className="text-red-600 text-xs mt-1">{form.formState.errors.next_steps.message}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createProposalMutation.isPending}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {createProposalMutation.isPending ? 'Generazione...' : 'Genera Proposta PDF'}
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

