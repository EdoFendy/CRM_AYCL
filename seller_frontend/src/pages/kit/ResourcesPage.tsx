import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';

const sendEmailSchema = z.object({
  client_email: z.string().email('Email non valida'),
  subject: z.string().min(1, 'Oggetto obbligatorio'),
  message: z.string().min(1, 'Messaggio obbligatorio'),
  attachment_ids: z.array(z.string()).min(1, 'Seleziona almeno un allegato')
});

type SendEmailFormData = z.infer<typeof sendEmailSchema>;

interface DocFile {
  id: string;
  name: string;
  file_url: string;
  category: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export default function ResourcesPage() {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const queryClient = useQueryClient();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const form = useForm<SendEmailFormData>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: {
      client_email: selectedClient?.data.email || '',
      subject: '',
      message: '',
      attachment_ids: []
    }
  });

  const docFilesQuery = useQuery({
    queryKey: ['doc-files'],
    queryFn: () => apiClient<{ data: DocFile[] }>('doc-files', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  const sendEmailMutation = useMutation({
    mutationFn: (data: SendEmailFormData) =>
      apiClient('docs/send-pitch-deck', {
        token,
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      toast.success('Email inviata con successo!');
      queryClient.invalidateQueries({ queryKey: ['doc-files'] });
      setShowEmailForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'invio dell\'email');
    }
  });

  const downloadFile = (file: DocFile) => {
    if (file.file_url.startsWith('data:')) {
      // Data URL - create download link
      const link = document.createElement('a');
      link.href = file.file_url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Regular URL - open in new tab
      window.open(file.file_url, '_blank');
    }
  };

  const handleFileSelect = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const onSubmit = (data: SendEmailFormData) => {
    sendEmailMutation.mutate({
      ...data,
      attachment_ids: selectedFiles
    });
  };

  const handleSendPitchDeck = () => {
    if (!selectedClient) {
      toast.error('Seleziona un cliente prima di inviare il Pitch Deck');
      return;
    }
    
    const pitchDeckFiles = docFilesQuery.data?.filter(file => 
      file.category.toLowerCase().includes('pitch') || 
      file.name.toLowerCase().includes('pitch')
    ) || [];
    
    if (pitchDeckFiles.length === 0) {
      toast.error('Nessun Pitch Deck disponibile');
      return;
    }
    
    setSelectedFiles(pitchDeckFiles.map(f => f.id));
    form.setValue('subject', 'Pitch Deck - All You Can Leads');
    form.setValue('message', `Ciao ${selectedClient.data.name},\n\nTi allego il nostro Pitch Deck con tutte le informazioni sui nostri servizi.\n\nSpero ti interessi!\n\nCordiali saluti`);
    setShowEmailForm(true);
  };

  const docFiles = docFilesQuery.data ?? [];
  const pitchDeckFiles = docFiles.filter(file => 
    file.category.toLowerCase().includes('pitch') || 
    file.name.toLowerCase().includes('pitch')
  );
  const otherFiles = docFiles.filter(file => 
    !file.category.toLowerCase().includes('pitch') && 
    !file.name.toLowerCase().includes('pitch')
  );

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Risorse e Documenti</h1>
        <p className="text-slate-600">
          Gestisci e condividi documenti, Pitch Deck e materiali di marketing
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{docFiles.length}</div>
          <div className="text-sm text-slate-600">Totale Documenti</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{pitchDeckFiles.length}</div>
          <div className="text-sm text-slate-600">Pitch Deck</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-600">{otherFiles.length}</div>
          <div className="text-sm text-slate-600">Altre Risorse</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Azioni Rapide</h2>
        
        <div className="flex gap-4">
          <button
            onClick={handleSendPitchDeck}
            disabled={!selectedClient || pitchDeckFiles.length === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            📧 Invia Pitch Deck
          </button>
          
          {!selectedClient && (
            <p className="text-sm text-slate-500 flex items-center">
              ⚠️ Seleziona un cliente per inviare documenti
            </p>
          )}
        </div>
      </div>

      {/* Email Form */}
      {showEmailForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Invia Email con Allegati</h2>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Cliente *
              </label>
              <input
                {...form.register('client_email')}
                type="email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="cliente@azienda.com"
              />
              {form.formState.errors.client_email && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.client_email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Oggetto *
              </label>
              <input
                {...form.register('subject')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Pitch Deck - All You Can Leads"
              />
              {form.formState.errors.subject && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Messaggio *
              </label>
              <textarea
                {...form.register('message')}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Messaggio personalizzato..."
              />
              {form.formState.errors.message && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.message.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Allegati *
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {docFiles.map((file) => (
                  <label key={file.id} className="flex items-center gap-3 p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={(e) => handleFileSelect(file.id, e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{file.name}</div>
                      <div className="text-xs text-slate-500">{file.category}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadFile(file)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      👁️ Anteprima
                    </button>
                  </label>
                ))}
              </div>
              {form.formState.errors.attachment_ids && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.attachment_ids.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={sendEmailMutation.isPending}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {sendEmailMutation.isPending ? 'Invio...' : 'Invia Email'}
              </button>

              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pitch Deck Files */}
      {pitchDeckFiles.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Pitch Deck ({pitchDeckFiles.length})
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pitchDeckFiles.map((file) => (
              <div key={file.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{file.name}</h3>
                    <p className="text-sm text-slate-500">{file.category}</p>
                    {file.file_size && (
                      <p className="text-xs text-slate-400">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadFile(file)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    📥 Scarica
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFiles([file.id]);
                      form.setValue('subject', `Pitch Deck - ${file.name}`);
                      form.setValue('message', `Ciao,\n\nTi allego il nostro Pitch Deck: ${file.name}\n\nSpero ti interessi!\n\nCordiali saluti`);
                      setShowEmailForm(true);
                    }}
                    className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                  >
                    📧 Invia
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Resources */}
      {otherFiles.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Altre Risorse ({otherFiles.length})
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherFiles.map((file) => (
              <div key={file.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{file.name}</h3>
                    <p className="text-sm text-slate-500">{file.category}</p>
                    {file.file_size && (
                      <p className="text-xs text-slate-400">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadFile(file)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    📥 Scarica
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFiles([file.id]);
                      form.setValue('subject', `Documento - ${file.name}`);
                      form.setValue('message', `Ciao,\n\nTi allego il documento: ${file.name}\n\nCordiali saluti`);
                      setShowEmailForm(true);
                    }}
                    className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                  >
                    📧 Invia
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {docFilesQuery.isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento risorse...</p>
        </div>
      )}

      {!docFilesQuery.isLoading && docFiles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">Nessuna risorsa disponibile</p>
        </div>
      )}
    </div>
  );
}

