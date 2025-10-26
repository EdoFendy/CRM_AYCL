import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import type { ClientData } from '@types/quotes';

const clientSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio'),
  email: z.string().email('Email non valida'),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  vat_number: z.string().optional(),
  fiscal_code: z.string().optional()
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientDataFormProps {
  onClientUpdated?: (client: ClientData) => void;
  showOptionalFields?: boolean;
}

export function ClientDataForm({ onClientUpdated, showOptionalFields = false }: ClientDataFormProps) {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const queryClient = useQueryClient();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: selectedClient?.data.name || '',
      email: selectedClient?.data.email || '',
      company: selectedClient?.data.company || '',
      phone: selectedClient?.data.phone || '',
      address: selectedClient?.data.address || '',
      vat_number: selectedClient?.data.vat_number || '',
      fiscal_code: selectedClient?.data.fiscal_code || ''
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: (data: ClientFormData) => {
      if (!selectedClient) {
        throw new Error('Nessun cliente selezionato');
      }
      
      return apiClient(`clients/${selectedClient.data.id}`, {
        token,
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: (updatedClient) => {
      toast.success('Dati cliente aggiornati');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClientUpdated?.(updatedClient);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'aggiornamento dei dati');
    }
  });

  const onSubmit = (data: ClientFormData) => {
    updateClientMutation.mutate(data);
  };

  if (!selectedClient) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-semibold text-slate-900 mb-2">⚠️ Nessun cliente selezionato</div>
        <div className="text-sm text-slate-500">
          Seleziona un cliente per visualizzare e modificare i dati
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Dati Cliente</h3>
        <p className="text-sm text-slate-600">
          Verifica e aggiorna le informazioni del cliente se necessario
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome Completo *
            </label>
            <input
              {...form.register('name')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Mario Rossi"
            />
            {form.formState.errors.name && (
              <p className="text-red-600 text-xs mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email *
            </label>
            <input
              {...form.register('email')}
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="mario.rossi@azienda.com"
            />
            {form.formState.errors.email && (
              <p className="text-red-600 text-xs mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Azienda
            </label>
            <input
              {...form.register('company')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Azienda S.r.l."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Telefono
            </label>
            <input
              {...form.register('phone')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="+39 123 456 7890"
            />
          </div>
        </div>

        {showOptionalFields && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Indirizzo
              </label>
              <textarea
                {...form.register('address')}
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Via Roma 123, 00100 Roma (RM)"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Partita IVA
                </label>
                <input
                  {...form.register('vat_number')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="IT12345678901"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Codice Fiscale
                </label>
                <input
                  {...form.register('fiscal_code')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="RSSMRA80A01H501U"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={updateClientMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {updateClientMutation.isPending ? 'Aggiornamento...' : 'Aggiorna Dati'}
          </button>

          <button
            type="button"
            onClick={() => form.reset()}
            className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700"
          >
            Annulla
          </button>
        </div>
      </form>

      {/* Current Client Info */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-900 mb-2">Cliente Selezionato</h4>
        <div className="text-sm text-slate-600 space-y-1">
          <div><strong>Nome:</strong> {selectedClient.data.name}</div>
          <div><strong>Email:</strong> {selectedClient.data.email}</div>
          {selectedClient.data.company && (
            <div><strong>Azienda:</strong> {selectedClient.data.company}</div>
          )}
          {selectedClient.data.phone && (
            <div><strong>Telefono:</strong> {selectedClient.data.phone}</div>
          )}
        </div>
      </div>
    </div>
  );
}

