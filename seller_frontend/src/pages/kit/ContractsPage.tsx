import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { ClientDataForm } from '@components/kit/ClientDataForm';
import { downloadContractPDF } from '@utils/contractPDF';
import type { Contract, ContractFormData, ContractData } from '@types/contracts';
import { CONTRACT_TEMPLATES, type ContractTemplate } from '@types/contracts';

const contractSchema = z.object({
  company_id: z.string().min(1, 'Azienda obbligatoria'),
  template_type: z.enum(['performance', 'setupfee']),
  contract_data: z.object({
    company_name: z.string().min(1, 'Nome azienda obbligatorio'),
    company_address: z.string().min(1, 'Indirizzo obbligatorio'),
    company_tax_id: z.string().min(1, 'Partita IVA obbligatoria'),
    representative_name: z.string().min(1, 'Nome rappresentante obbligatorio'),
    representative_role: z.string().min(1, 'Ruolo rappresentante obbligatorio'),
    contract_place: z.string().min(1, 'Luogo contratto obbligatorio'),
    contract_date: z.string().min(1, 'Data contratto obbligatoria'),
    setup_fee: z.string().optional(),
    unit_cost: z.string().optional(),
    revenue_share_percentage: z.string().optional(),
    revenue_share_months: z.string().optional(),
    icp_geographic_area: z.string().min(1, 'Area geografica ICP obbligatoria'),
    icp_sector: z.string().min(1, 'Settore ICP obbligatorio'),
    icp_min_revenue: z.string().min(1, 'Fatturato minimo ICP obbligatorio'),
    icp_unit_cost: z.string().optional(),
    icp_revenue_share: z.string().optional(),
    icp_date: z.string().min(1, 'Data ICP obbligatoria')
  }),
  expires_at: z.string().optional(),
  payment_amount: z.number().positive().optional(),
  payment_currency: z.string().optional(),
  notes: z.string().optional()
});

type ContractFormValues = z.infer<typeof contractSchema>;

export default function ContractsPage() {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const queryClient = useQueryClient();
  const [showClientForm, setShowClientForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'performance' | 'setupfee'>('performance');

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      company_id: selectedClient?.data.id || '',
      template_type: 'performance',
      contract_data: {
        company_name: selectedClient?.data.company || selectedClient?.data.name || '',
        company_address: '',
        company_tax_id: '',
        representative_name: '',
        representative_role: '',
        contract_place: '',
        contract_date: new Date().toLocaleDateString('it-IT'),
        setup_fee: '3000',
        unit_cost: '',
        revenue_share_percentage: '10',
        revenue_share_months: '12',
        icp_geographic_area: '',
        icp_sector: '',
        icp_min_revenue: '',
        icp_unit_cost: '',
        icp_revenue_share: '',
        icp_date: new Date().toLocaleDateString('it-IT')
      },
      expires_at: '',
      payment_amount: 3000,
      payment_currency: 'EUR',
      notes: ''
    }
  });

  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: () => apiClient<{ data: Contract[] }>('contracts', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  const createContractMutation = useMutation({
    mutationFn: (data: ContractFormData) =>
      apiClient<{ success: boolean; id: string; file_url: string }>('contracts', {
        token,
        method: 'POST',
        body: data
      }),
    onSuccess: (data) => {
      toast.success('Contratto creato con successo!');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      
      // Open PDF in new tab
      if (data.file_url) {
        window.open(data.file_url, '_blank');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella creazione del contratto');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient(`contracts/${id}/transition`, {
        token,
        method: 'PATCH',
        body: { status }
      }),
    onSuccess: () => {
      toast.success('Stato contratto aggiornato');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`contracts/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast.success('Contratto eliminato');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }
  });

  const onSubmit = (data: ContractFormValues) => {
    createContractMutation.mutate(data);
  };

  const handleDownloadPDF = async (contract: Contract) => {
    try {
      // Try to find a PDF file in the contract files
      const pdfFile = contract.files?.find(file => 
        file.mime === 'application/pdf' || 
        file.name.toLowerCase().includes('.pdf') ||
        file.name.toLowerCase().includes('contratto')
      );

      if (pdfFile) {
        // If it's a data URL, open it directly
        if (pdfFile.storage_url.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = pdfFile.storage_url;
          link.download = pdfFile.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // If it's a regular URL, open in new tab
          window.open(pdfFile.storage_url, '_blank');
        }
      } else if (contract.pdf_url) {
        // Fallback to the old pdf_url field
        window.open(contract.pdf_url, '_blank');
      } else {
        // If no PDF exists, try to generate one
        await generateContractPDF(contract);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Errore nel download del PDF');
    }
  };

  const generateContractPDF = async (contract: Contract) => {
    try {
      console.log('Generating PDF for contract:', contract.id);
      
      // Determine contract type
      const contractType: 'performance' | 'setupfee' = contract.pack?.toLowerCase().includes('performance') ? 'performance' : 'setupfee';
      
      // Get data from notes field
      let formData: ContractData | null = null;
      try {
        if (contract.notes) {
          const parsed = JSON.parse(contract.notes);
          formData = parsed.formData;
        }
      } catch (e) {
        console.warn('Invalid notes, using default data:', e);
      }
      
      // Use saved data or default values
      const data: ContractData = formData || {
        company_name: contract.company_name || 'N/A',
        company_address: 'Da definire',
        company_tax_id: 'Da definire',
        representative_name: 'Da definire',
        representative_role: 'Da definire',
        contract_place: '',
        contract_date: new Date(contract.created_at).toLocaleDateString('it-IT'),
        setup_fee: contract.payment_amount?.toString() || '3000',
        unit_cost: '',
        revenue_share_percentage: '',
        revenue_share_months: '12',
        icp_geographic_area: 'Da definire',
        icp_sector: 'Da definire',
        icp_min_revenue: 'Da definire',
        icp_unit_cost: '',
        icp_revenue_share: '',
        icp_date: new Date().toLocaleDateString('it-IT'),
      };
      
      // Generate PDF
      await downloadContractPDF(contractType, data);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Errore nella generazione del PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Bozza', className: 'bg-gray-100 text-gray-700' },
      sent: { label: 'Inviato', className: 'bg-blue-100 text-blue-700' },
      signed: { label: 'Firmato', className: 'bg-green-100 text-green-700' },
      expired: { label: 'Scaduto', className: 'bg-red-100 text-red-700' },
      terminated: { label: 'Terminato', className: 'bg-slate-100 text-slate-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const contracts = contractsQuery.data ?? [];
  const signedCount = contracts.filter(c => c.status === 'signed').length;
  const pendingCount = contracts.filter(c => c.status === 'sent').length;

  if (!selectedClient) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-lg font-semibold text-slate-900 mb-2">⚠️ Nessun cliente selezionato</div>
          <div className="text-sm text-slate-500">
            Seleziona un cliente per gestire i contratti
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestione Contratti</h1>
        <p className="text-slate-600">
          Crea e gestisci contratti per <strong>{selectedClient.data.name}</strong>
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{contracts.length}</div>
          <div className="text-sm text-slate-600">Totale Contratti</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-600">{signedCount}</div>
          <div className="text-sm text-slate-600">Firmati</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
          <div className="text-sm text-slate-600">In Attesa</div>
        </div>
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

      {/* Create Contract Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Crea Nuovo Contratto</h2>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo Contratto *
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              {CONTRACT_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate === template.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template.type);
                    form.setValue('template_type', template.type);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={selectedTemplate === template.type}
                      onChange={() => {
                        setSelectedTemplate(template.type);
                        form.setValue('template_type', template.type);
                      }}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900">{template.name}</div>
                      <div className="text-sm text-slate-600">{template.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contract Data */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome Azienda *
              </label>
              <input
                {...form.register('contract_data.company_name')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Azienda S.r.l."
              />
              {form.formState.errors.contract_data?.company_name && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.contract_data.company_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Indirizzo *
              </label>
              <input
                {...form.register('contract_data.company_address')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Via Roma 123, 00100 Roma (RM)"
              />
              {form.formState.errors.contract_data?.company_address && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.contract_data.company_address.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Partita IVA *
              </label>
              <input
                {...form.register('contract_data.company_tax_id')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="IT12345678901"
              />
              {form.formState.errors.contract_data?.company_tax_id && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.contract_data.company_tax_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rappresentante *
              </label>
              <input
                {...form.register('contract_data.representative_name')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mario Rossi"
              />
              {form.formState.errors.contract_data?.representative_name && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.contract_data.representative_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ruolo Rappresentante *
              </label>
              <input
                {...form.register('contract_data.representative_role')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Amministratore Delegato"
              />
              {form.formState.errors.contract_data?.representative_role && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.contract_data.representative_role.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Luogo Contratto *
              </label>
              <input
                {...form.register('contract_data.contract_place')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Roma"
              />
              {form.formState.errors.contract_data?.contract_place && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.contract_data.contract_place.message}</p>
              )}
            </div>
          </div>

          {/* Template-specific fields */}
          {selectedTemplate === 'setupfee' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Setup Fee (€) *
              </label>
              <input
                {...form.register('contract_data.setup_fee')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="3000"
              />
            </div>
          )}

          {selectedTemplate === 'performance' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Percentuale Revenue Share *
                </label>
                <input
                  {...form.register('contract_data.revenue_share_percentage')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mesi Revenue Share *
                </label>
                <input
                  {...form.register('contract_data.revenue_share_months')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="12"
                />
              </div>
            </div>
          )}

          {/* ICP Fields */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Dati ICP (Ideal Customer Profile)</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Area Geografica *
                </label>
                <input
                  {...form.register('contract_data.icp_geographic_area')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Italia, Europa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Settore *
                </label>
                <input
                  {...form.register('contract_data.icp_sector')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="SaaS, Manufacturing"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fatturato Minimo *
              </label>
              <input
                {...form.register('contract_data.icp_min_revenue')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="€1M - €10M"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createContractMutation.isPending}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {createContractMutation.isPending ? 'Creazione...' : 'Crea Contratto'}
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

      {/* Contracts List */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Contratti Esistenti ({contracts.length})
        </h2>

        {contractsQuery.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Caricamento contratti...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nessun contratto trovato</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-slate-900">
                      {contract.company_name || 'Contratto'}
                    </h3>
                    {getStatusBadge(contract.status)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadPDF(contract)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      📄 PDF
                    </button>
                    
                    {contract.status === 'draft' && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: contract.id, status: 'sent' })}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        📤 Invia
                      </button>
                    )}
                    
                    {contract.status === 'sent' && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: contract.id, status: 'signed' })}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        ✍️ Firma
                      </button>
                    )}
                    
                    <button
                      onClick={() => deleteContractMutation.mutate(contract.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-slate-600 space-y-1">
                  <div>Creato: {new Date(contract.created_at).toLocaleDateString('it-IT')}</div>
                  {contract.signed_at && (
                    <div>Firmato: {new Date(contract.signed_at).toLocaleDateString('it-IT')}</div>
                  )}
                  {contract.expires_at && (
                    <div>Scade: {new Date(contract.expires_at).toLocaleDateString('it-IT')}</div>
                  )}
                  {contract.payment_amount && (
                    <div>Importo: €{contract.payment_amount.toLocaleString()}</div>
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
