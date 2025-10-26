import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';

interface DocPackFile {
  id: string;
  pack: string;
  category: 'pitch' | 'proposal';
  name: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

export default function DocPackFilesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPack, setUploadPack] = useState<string>('Setup-Fee');
  const [uploadCategory, setUploadCategory] = useState<'pitch' | 'proposal'>('pitch');

  const packs = ['Setup-Fee', 'Performance', 'Subscription', 'Drive Test'];
  const categories = [
    { value: 'pitch', label: 'Pitch Deck' },
    { value: 'proposal', label: 'Proposta' }
  ];

  // Fetch files
  const filesQuery = useQuery({
    queryKey: ['doc-pack-files', selectedPack, selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedPack) params.append('pack', selectedPack);
      if (selectedCategory) params.append('category', selectedCategory);
      return apiClient<{ data: DocPackFile[] }>(`doc-files?${params.toString()}`, { token });
    },
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) {
        throw new Error('Seleziona un file');
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('pack', uploadPack);
      formData.append('category', uploadCategory);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/doc-files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante l\'upload');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success('File caricato con successo!');
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ['doc-pack-files'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante l\'upload');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`doc-files/${id}`, {
        token,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast.success('File eliminato con successo');
      queryClient.invalidateQueries({ queryKey: ['doc-pack-files'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante l\'eliminazione');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Tipo file non supportato. Usa PDF, PPT, PPTX, DOC o DOCX');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File troppo grande. Massimo 50MB');
      return;
    }

    setUploadFile(file);
  };

  const handleDownload = (file: DocPackFile) => {
    const link = document.createElement('a');
    link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${file.file_url}`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Gestione Doc Pack Files</h1>
        <p className="text-slate-600 mt-1">
          Carica e gestisci Pitch Deck e Proposte per ogni pack
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Carica Nuovo File
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Pack *</label>
            <select
              value={uploadPack}
              onChange={(e) => setUploadPack(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {packs.map((pack) => (
                <option key={pack} value={pack}>{pack}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Categoria *</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as 'pitch' | 'proposal')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">File *</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {uploadFile && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">
              <strong>File selezionato:</strong> {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </div>
        )}

        <button
          onClick={() => uploadMutation.mutate()}
          disabled={!uploadFile || uploadMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Caricamento...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Carica File
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Filtra per Pack</label>
            <select
              value={selectedPack}
              onChange={(e) => setSelectedPack(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti i pack</option>
              {packs.map((pack) => (
                <option key={pack} value={pack}>{pack}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Filtra per Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutte le categorie</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            File Caricati ({filesQuery.data?.length || 0})
          </h2>
        </div>

        {filesQuery.isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-slate-600">Caricamento file...</p>
          </div>
        ) : filesQuery.data && filesQuery.data.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {filesQuery.data.map((file) => (
              <div key={file.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{file.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {file.pack}
                        </span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          {file.category === 'pitch' ? 'Pitch Deck' : 'Proposta'}
                        </span>
                        <span>{new Date(file.uploaded_at).toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Scarica"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Sei sicuro di voler eliminare questo file?')) {
                          deleteMutation.mutate(file.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Nessun file trovato</p>
            <p className="text-sm text-slate-500 mt-2">
              Carica il primo file per iniziare
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

