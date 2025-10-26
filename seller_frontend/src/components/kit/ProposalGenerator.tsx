import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { apiClient } from '@lib/apiClient';
import { toast } from 'sonner';
import { FileText, Download, Send, Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';

interface ProposalService {
  name: string;
  description: string;
  price: number;
}

interface ProposalData {
  title: string;
  introduction: string;
  services: ProposalService[];
  terms: string;
  validUntil: string;
  template_id?: string;
}

interface PDFTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
}

export function ProposalGenerator() {
  const { token, user } = useAuth();
  const { selectedClient } = useSelectedClient();
  const [proposalData, setProposalData] = useState<ProposalData>({
    title: 'Proposta Commerciale',
    introduction: '',
    services: [{ name: '', description: '', price: 0 }],
    terms: '',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    template_id: undefined
  });
  const [sendEmail, setSendEmail] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<any>(null);

  // Fetch PDF templates
  const templatesQuery = useQuery({
    queryKey: ['pdf-templates', 'proposal'],
    queryFn: () => apiClient<{ templates: PDFTemplate[] }>('pdf-templates?type=proposal', { token }),
    enabled: Boolean(token),
    select: (res) => res.templates ?? []
  });

  // Pre-fill introduction when client is selected
  useEffect(() => {
    if (selectedClient && !proposalData.introduction) {
      const clientName = selectedClient.type === 'contact' 
        ? selectedClient.data.full_name 
        : selectedClient.data.ragione_sociale;
      
      setProposalData(prev => ({
        ...prev,
        introduction: `Gentile ${clientName},\n\nSiamo lieti di presentarvi la nostra proposta commerciale per i servizi di lead generation e marketing digitale.\n\nDopo aver analizzato le vostre esigenze, abbiamo preparato una soluzione su misura per supportare la crescita del vostro business.`
      }));
    }
  }, [selectedClient]);

  const addService = () => {
    setProposalData({
      ...proposalData,
      services: [...proposalData.services, { name: '', description: '', price: 0 }]
    });
  };

  const removeService = (index: number) => {
    if (proposalData.services.length === 1) {
      toast.error('Deve esserci almeno un servizio');
      return;
    }
    setProposalData({
      ...proposalData,
      services: proposalData.services.filter((_, i) => i !== index)
    });
  };

  const updateService = (index: number, field: keyof ProposalService, value: any) => {
    const newServices = [...proposalData.services];
    newServices[index] = { ...newServices[index], [field]: value };
    setProposalData({ ...proposalData, services: newServices });
  };

  const totalPrice = proposalData.services.reduce((sum, service) => sum + (service.price || 0), 0);

  const generateProposalMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) {
        throw new Error('Seleziona un cliente');
      }

      if (proposalData.services.some(s => !s.name || !s.description)) {
        throw new Error('Compila tutti i campi dei servizi');
      }

      const payload = {
        customer_type: selectedClient.type,
        customer_id: selectedClient.data.id,
        services: proposalData.services,
        title: proposalData.title,
        introduction: proposalData.introduction,
        notes: '',
        terms: proposalData.terms,
        valid_until: proposalData.validUntil,
        template_id: proposalData.template_id,
        send_email: sendEmail
      };

      const response = await apiClient<any>('proposals/generate', {
        token,
        method: 'POST',
        body: payload
      });

      return response;
    },
    onSuccess: (data) => {
      setGeneratedProposal(data);
      toast.success(
        sendEmail 
          ? 'Proposta generata e inviata via email!'
          : 'Proposta generata con successo!'
      );
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante la generazione della proposta');
    }
  });

  if (!selectedClient) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
        <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Seleziona un cliente per generare una proposta</p>
        <p className="text-sm text-slate-500 mt-2">
          Torna alla selezione cliente per iniziare
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-green-900">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">
            Proposta per:{' '}
            {selectedClient.type === 'contact' 
              ? selectedClient.data.full_name 
              : selectedClient.data.ragione_sociale}
          </span>
        </div>
        {selectedClient.type === 'contact' && selectedClient.data.email && (
          <p className="text-sm text-green-700 mt-1">Email: {selectedClient.data.email}</p>
        )}
      </div>

      {/* Template Selection */}
      {templatesQuery.data && templatesQuery.data.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Template PDF</h3>
          <select
            value={proposalData.template_id || ''}
            onChange={(e) => setProposalData({ ...proposalData, template_id: e.target.value || undefined })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Nessun template (solo database)</option>
            {templatesQuery.data.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.description}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-600 mt-2">
            Seleziona un template per generare automaticamente il PDF
          </p>
        </div>
      )}

      {/* Proposal Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Intestazione Proposta</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Titolo</label>
            <input
              type="text"
              value={proposalData.title}
              onChange={(e) => setProposalData({ ...proposalData, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Proposta Commerciale"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Introduzione</label>
            <textarea
              value={proposalData.introduction}
              onChange={(e) => setProposalData({ ...proposalData, introduction: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Gentile Cliente, siamo lieti di presentarvi la nostra proposta..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Valida fino al</label>
            <input
              type="date"
              value={proposalData.validUntil}
              onChange={(e) => setProposalData({ ...proposalData, validUntil: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Servizi Proposti</h3>
          <button
            onClick={addService}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Aggiungi Servizio
          </button>
        </div>

        <div className="space-y-4">
          {proposalData.services.map((service, index) => (
            <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Servizio {index + 1}</span>
                {proposalData.services.length > 1 && (
                  <button
                    onClick={() => removeService(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Servizio</label>
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => updateService(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="es. Consulenza Marketing Digitale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                  <textarea
                    value={service.description}
                    onChange={(e) => updateService(index, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Descrivi il servizio in dettaglio..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prezzo (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={service.price}
                    onChange={(e) => updateService(index, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Termini e Condizioni</h3>
        <textarea
          value={proposalData.terms}
          onChange={(e) => setProposalData({ ...proposalData, terms: e.target.value })}
          rows={6}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Inserisci termini e condizioni, modalità di pagamento, garanzie..."
        />
      </div>

      {/* Total */}
      <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <span className="text-lg">Valore Totale Proposta:</span>
          <span className="text-3xl font-bold">€{totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Send Email Option */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
          />
          <div>
            <span className="font-medium text-slate-900">Invia automaticamente via email</span>
            <p className="text-sm text-slate-600">
              La proposta verrà inviata all'email del cliente dopo la generazione
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <button
        onClick={() => generateProposalMutation.mutate()}
        disabled={generateProposalMutation.isPending}
        className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all font-bold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        {generateProposalMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generazione in corso...
          </>
        ) : (
          <>
            <FileText className="w-5 h-5" />
            Genera Proposta
          </>
        )}
      </button>

      {/* Generated Proposal Info */}
      {generatedProposal && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 animate-in fade-in duration-300">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            ✅ Proposta Generata con Successo
          </h3>
          <div className="space-y-2 text-sm text-green-800">
            <p><strong>Numero:</strong> {generatedProposal.number}</p>
            <p><strong>Data:</strong> {new Date(generatedProposal.date).toLocaleDateString('it-IT')}</p>
            <p><strong>Totale:</strong> €{generatedProposal.total}</p>
            <p><strong>Status:</strong> {generatedProposal.status === 'sent' ? 'Inviata' : 'Bozza'}</p>
            {generatedProposal.pdf_url && (
              <div className="mt-4">
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${generatedProposal.pdf_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Scarica PDF
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}