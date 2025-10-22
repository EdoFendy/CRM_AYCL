/**
 * PDF Templates Page
 * Gestione template PDF con mappatura campi dinamica
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { FileText, Upload, Edit, Download, Eye } from 'lucide-react';
import { PDFTemplateUpload } from '../components/pdf/PDFTemplateUpload';
import { PDFTemplateEditor } from '../components/pdf/PDFTemplateEditor';

interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  page_count: number;
  has_mapping: boolean;
  created_at: string;
}

export default function PDFTemplatesPage() {
  const { token } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);

  const { data: templatesData, isLoading, refetch } = useQuery({
    queryKey: ['pdf-templates'],
    queryFn: () => apiClient<{ templates: PDFTemplate[] }>('pdf-templates', { token }),
  });

  const templates = templatesData?.templates || [];

  const handleUploadSuccess = () => {
    setShowUpload(false);
    refetch();
  };

  const handleEditTemplate = (template: PDFTemplate) => {
    setSelectedTemplate(template);
  };

  if (selectedTemplate) {
    return (
      <div className="p-6">
        <PDFTemplateEditor
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSave={() => {
            setSelectedTemplate(null);
            refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Template PDF</h1>
          <p className="text-slate-600 mt-1">
            Gestisci template PDF con mappatura campi dinamica
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Upload size={20} />
          Carica Template
        </button>
      </div>

      {showUpload && (
        <div className="mb-6">
          <PDFTemplateUpload
            onSuccess={handleUploadSuccess}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Caricamento...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <FileText size={48} className="mx-auto text-slate-400" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            Nessun template
          </h3>
          <p className="mt-2 text-slate-600">
            Carica il primo template PDF per iniziare
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-md">
                    <FileText size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {template.page_count} {template.page_count === 1 ? 'pagina' : 'pagine'}
                    </p>
                  </div>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-slate-600 mb-3">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <span className="px-2 py-1 bg-slate-100 rounded">
                  {template.type}
                </span>
                {template.has_mapping && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    Mappato
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  <Edit size={16} />
                  {template.has_mapping ? 'Modifica' : 'Mappa Campi'}
                </button>
                <button
                  onClick={async () => {
                    const blob = await apiClient<Blob>(`pdf-templates/${template.id}/download`, {
                      token,
                      responseType: 'blob'
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = template.name;
                    a.click();
                  }}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

