/**
 * PDF Template Upload Component
 * Componente per upload di template PDF
 */

import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';

interface PDFTemplateUploadProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function PDFTemplateUpload({ onSuccess, onCancel }: PDFTemplateUploadProps) {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('contract');
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Nessun file selezionato');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name || file.name);
      formData.append('description', description);
      formData.append('type', type);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/pdf-templates/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore upload');
      }

      return response.json();
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        if (!name) setName(droppedFile.name.replace('.pdf', ''));
      } else {
        alert('Solo file PDF sono supportati');
      }
    }
  }, [name]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        if (!name) setName(selectedFile.name.replace('.pdf', ''));
      } else {
        alert('Solo file PDF sono supportati');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Seleziona un file PDF');
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Carica Template PDF
        </h2>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
            ${file ? 'bg-green-50 border-green-500' : ''}
          `}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={32} className="text-green-600" />
              <div className="text-left">
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : (
            <div>
              <Upload size={48} className="mx-auto text-slate-400 mb-3" />
              <p className="text-lg font-medium text-slate-900 mb-1">
                Trascina un PDF qui
              </p>
              <p className="text-sm text-slate-600">
                oppure clicca per selezionare
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Massimo 10MB
              </p>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nome Template *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Contratto Performance"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Descrizione
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrizione del template..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="contract">Contratto</option>
            <option value="quote">Preventivo</option>
            <option value="invoice">Fattura</option>
            <option value="receipt">Ricevuta</option>
            <option value="other">Altro</option>
          </select>
        </div>

        {/* Error Message */}
        {uploadMutation.isError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              {uploadMutation.error?.message || 'Errore durante l\'upload'}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!file || uploadMutation.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? 'Caricamento...' : 'Carica Template'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}

