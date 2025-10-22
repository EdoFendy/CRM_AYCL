/**
 * PDF Template Editor
 * Editor completo per mappatura campi su template PDF
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/apiClient';
import { PDFViewer } from './PDFViewer';
import { FieldOverlay, type Field } from './FieldOverlay';
import { Save, X, Plus, Eye, Code } from 'lucide-react';

interface PDFTemplateEditorProps {
  template: {
    id: string;
    name: string;
  };
  onClose: () => void;
  onSave: () => void;
}

export function PDFTemplateEditor({ template, onClose, onSave }: PDFTemplateEditorProps) {
  const { token } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [pdfDimensions, setPdfDimensions] = useState({ width: 800, height: 1131 }); // A4 default
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Carica mapping esistente
  const { data: mappingData } = useQuery({
    queryKey: ['pdf-template-mapping', template.id],
    queryFn: () => apiClient<{ fields: Field[] }>(`pdf-templates/${template.id}/mapping`, { token }),
  });

  // Salva mapping
  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient(`pdf-templates/${template.id}/mapping`, {
        method: 'POST',
        token,
        body: { fields },
      }),
    onSuccess: () => {
      console.log('✅ Mapping salvato con successo!');
      setLastSaved(new Date());
    },
  });

  // Carica mapping esistente
  useEffect(() => {
    if (mappingData?.fields) {
      setFields(mappingData.fields);
    }
  }, [mappingData]);

  // Auto-save ogni 30 secondi
  useEffect(() => {
    const interval = setInterval(() => {
      if (fields.length > 0) {
        console.log('💾 Auto-salvataggio mapping...');
        saveMutation.mutate();
      }
    }, 30000); // 30 secondi

    return () => clearInterval(interval);
  }, [fields]);

  const addField = () => {
    const newField: Field = {
      id: `field-${Date.now()}`,
      type: 'text',
      dataKey: 'nuovo_campo',
      page: currentPage - 1,
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.03,
      fontSize: 8,
      align: 'left',
    };
    setFields([...fields, newField]);
    setSelectedField(newField);
  };

  const updateSelectedField = (updates: Partial<Field>) => {
    if (!selectedField) return;
    
    setFields(
      fields.map(f => (f.id === selectedField.id ? { ...f, ...updates } : f))
    );
    setSelectedField({ ...selectedField, ...updates });
  };

  const togglePreview = () => {
    if (!showPreview) {
      // Genera dati di test
      const testData: Record<string, any> = {};
      fields.forEach(field => {
        switch (field.type) {
          case 'text':
            testData[field.dataKey] = `Esempio ${field.dataKey}`;
            break;
          case 'date':
            testData[field.dataKey] = new Date().toLocaleDateString('it-IT');
            break;
          case 'checkbox':
            testData[field.dataKey] = true;
            break;
          case 'signature':
            testData[field.dataKey] = 'Firma Esempio';
            break;
        }
      });
      setPreviewData(testData);
    }
    setShowPreview(!showPreview);
  };

  const pdfUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/pdf-templates/${template.id}/download?token=${token}`;

  return (
    <div className="flex h-screen">
      {/* Main Area - PDF Viewer */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <div>
            <h2 className="text-xl font-semibold">{template.name}</h2>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>{fields.length} campi mappati</span>
              {lastSaved && (
                <span className="text-green-600 flex items-center gap-1">
                  ✓ Salvato {lastSaved.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {saveMutation.isPending && (
                <span className="text-blue-600 flex items-center gap-1">
                  <span className="animate-spin">⚙️</span> Salvataggio...
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addField}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Plus size={20} />
              Aggiungi Campo
            </button>
            <button
              onClick={togglePreview}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                showPreview
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Eye size={20} />
              {showPreview ? 'Nascondi' : 'Preview'}
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={20} />
              Salva
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <PDFViewer
          url={pdfUrl}
          onPageChange={setCurrentPage}
          onPageDimensionsChange={(width, height) => setPdfDimensions({ width, height })}
          overlay={
            <FieldOverlay
              fields={fields}
              currentPage={currentPage}
              pdfWidth={pdfDimensions.width}
              pdfHeight={pdfDimensions.height}
              onFieldsChange={setFields}
              onFieldSelect={setSelectedField}
              selectedField={selectedField}
              previewData={showPreview ? previewData : undefined}
            />
          }
        />
      </div>

      {/* Sidebar - Field Properties */}
      <div className="w-80 bg-white border-l overflow-y-auto">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Campi ({fields.length})</h3>
        </div>

        {selectedField ? (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data Key *</label>
              <input
                type="text"
                value={selectedField.dataKey}
                onChange={(e) => updateSelectedField({ dataKey: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="es. company_name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={selectedField.type}
                onChange={(e) => updateSelectedField({ type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="text">Testo</option>
                <option value="date">Data</option>
                <option value="checkbox">Checkbox</option>
                <option value="signature">Firma</option>
              </select>
            </div>

            {(selectedField.type === 'text' || selectedField.type === 'signature') && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Font Size</label>
                  <input
                    type="number"
                    value={selectedField.fontSize || 8}
                    onChange={(e) => updateSelectedField({ fontSize: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="8"
                    max="72"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Allineamento</label>
                  <select
                    value={selectedField.align || 'left'}
                    onChange={(e) => updateSelectedField({ align: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="left">Sinistra</option>
                    <option value="center">Centro</option>
                    <option value="right">Destra</option>
                  </select>
                </div>
              </>
            )}

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Posizione</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>X: {(selectedField.x * 100).toFixed(1)}%</div>
                <div>Y: {(selectedField.y * 100).toFixed(1)}%</div>
                <div>W: {(selectedField.width * 100).toFixed(1)}%</div>
                <div>H: {(selectedField.height * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-slate-600 text-center py-8">
              Seleziona un campo per modificarne le proprietà o clicca "Aggiungi Campo" per crearne uno nuovo
            </p>
          </div>
        )}

        {/* Lista Campi */}
        <div className="border-t">
          <div className="p-4">
            <h4 className="font-medium mb-2">Tutti i Campi</h4>
            <div className="space-y-2">
              {fields.map((field) => (
                <button
                  key={field.id}
                  onClick={() => {
                    setSelectedField(field);
                    setCurrentPage(field.page + 1);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    selectedField?.id === field.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-medium">{field.dataKey}</div>
                  <div className="text-xs text-slate-600">
                    {field.type} - Pag. {field.page + 1}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

