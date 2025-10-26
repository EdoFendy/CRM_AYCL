import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { apiClient } from '@lib/apiClient';
import { toast } from 'sonner';
import { Download, Send, FileText, Presentation, BookOpen, Video, Mail, Loader2 } from 'lucide-react';

interface DocPackFile {
  id: string;
  pack: string;
  category: 'pitch' | 'proposal';
  name: string;
  file_url: string;
  uploaded_at: string;
}

export function ResourcesManager() {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailMessage, setEmailMessage] = useState<string>('');

  // Fetch doc pack files
  const resourcesQuery = useQuery({
    queryKey: ['doc-pack-files'],
    queryFn: () => apiClient<{ data: DocPackFile[] }>('doc-files', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  // Pre-fill email if client is selected
  useState(() => {
    if (selectedClient && selectedClient.type === 'contact' && selectedClient.data.email) {
      setEmailRecipient(selectedClient.data.email);
    }
  });

  const resources = resourcesQuery.data ?? [];

  // Group by category
  const pitchDecks = resources.filter(r => r.category === 'pitch');
  const proposals = resources.filter(r => r.category === 'proposal');

  const handleDownload = (resource: DocPackFile) => {
    // Download file
    const link = document.createElement('a');
    link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${resource.file_url}`;
    link.download = resource.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Download di ${resource.name} avviato`);
  };

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResourceId) {
        throw new Error('Seleziona una risorsa da inviare');
      }

      if (!emailRecipient) {
        throw new Error('Inserisci un indirizzo email');
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailRecipient)) {
        throw new Error('Indirizzo email non valido');
      }

      const payload: any = {
        recipient_email: emailRecipient,
        recipient_name: selectedClient 
          ? (selectedClient.type === 'contact' ? selectedClient.data.full_name : selectedClient.data.ragione_sociale)
          : emailRecipient,
        message: emailMessage || undefined
      };

      // Add client IDs if available
      if (selectedClient) {
        if (selectedClient.type === 'contact') {
          payload.contact_id = selectedClient.data.id;
        } else {
          payload.company_id = selectedClient.data.id;
        }
      }

      await apiClient(`doc-files/${selectedResourceId}/send-email`, {
        token,
        method: 'POST',
        body: payload
      });
    },
    onSuccess: () => {
      toast.success(`Risorsa inviata a ${emailRecipient}`);
      setEmailMessage('');
      setSelectedResourceId('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante l\'invio');
    }
  });

  const getIcon = (resource: DocPackFile) => {
    if (resource.name.toLowerCase().includes('pitch') || resource.name.toLowerCase().includes('deck')) {
      return Presentation;
    }
    if (resource.name.toLowerCase().includes('video')) {
      return Video;
    }
    if (resource.name.toLowerCase().includes('catalog')) {
      return BookOpen;
    }
    return FileText;
  };

  const renderResourceCard = (resource: DocPackFile) => {
    const Icon = getIcon(resource);
    const isSelected = selectedResourceId === resource.id;

    return (
      <div
        key={resource.id}
        className="bg-white rounded-xl p-6 border border-slate-200 hover:border-teal-300 hover:shadow-lg transition-all group"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors flex-shrink-0">
            <Icon className="w-6 h-6 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 mb-1">{resource.name}</h3>
            <p className="text-sm text-slate-600 mb-1">Pack: {resource.pack}</p>
            <p className="text-xs text-slate-500">
              Caricato il {new Date(resource.uploaded_at).toLocaleDateString('it-IT')}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleDownload(resource)}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Scarica
          </button>
          <button
            onClick={() => setSelectedResourceId(isSelected ? '' : resource.id)}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 ${
              isSelected
                ? 'bg-teal-100 text-teal-700 border-2 border-teal-500'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            {isSelected ? 'Selezionato' : 'Invia'}
          </button>
        </div>
      </div>
    );
  };

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {resourcesQuery.isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-3" />
          <p className="text-slate-600">Caricamento risorse...</p>
        </div>
      )}

      {/* Pitch Decks */}
      {pitchDecks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Presentation className="w-5 h-5 text-teal-600" />
            Pitch Decks ({pitchDecks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pitchDecks.map(renderResourceCard)}
          </div>
        </div>
      )}

      {/* Proposals */}
      {proposals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Proposte ({proposals.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposals.map(renderResourceCard)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!resourcesQuery.isLoading && resources.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
          <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Nessuna risorsa disponibile</p>
          <p className="text-sm text-slate-500 mt-2">
            Contatta l'admin per caricare Pitch Deck e proposte
          </p>
        </div>
      )}

      {/* Send Email Section */}
      {selectedResource && (
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-200 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Invia Risorsa via Email</h3>
              <p className="text-sm text-slate-600">
                Risorsa selezionata: <strong>{selectedResource.name}</strong>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Destinatario <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="cliente@example.com"
              />
              {selectedClient && selectedClient.type === 'contact' && selectedClient.data.email && (
                <p className="text-xs text-slate-600 mt-1">
                  Email del cliente selezionato: {selectedClient.data.email}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Messaggio (opzionale)
              </label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Aggiungi un messaggio personalizzato per il cliente..."
              />
            </div>

            {/* Send Button */}
            <button
              onClick={() => sendEmailMutation.mutate()}
              disabled={sendEmailMutation.isPending || !emailRecipient}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Invia Email
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">💡 Suggerimenti</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-teal-600 font-bold">•</span>
            <span>Scarica le risorse per consultarle offline o presentarle di persona</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-600 font-bold">•</span>
            <span>Invia il Pitch Deck ai potenziali clienti per presentare i nostri servizi</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-600 font-bold">•</span>
            <span>Personalizza sempre il messaggio quando invii risorse via email</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-600 font-bold">•</span>
            <span>L'invio viene tracciato automaticamente nel CRM se hai selezionato un cliente</span>
          </li>
        </ul>
      </div>
    </div>
  );
}