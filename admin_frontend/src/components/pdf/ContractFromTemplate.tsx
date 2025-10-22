/**
 * Contract From Template Component
 * Genera contratti da template PDF mappati
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/apiClient';
import { FileText, Download } from 'lucide-react';

interface ContractFromTemplateProps {
  companyId?: string;
  companyName?: string;
  onSuccess?: (contractId: string) => void;
}

interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  has_mapping: boolean;
}

interface Field {
  id: string;
  type: 'text' | 'date' | 'checkbox' | 'signature';
  dataKey: string;
  page: number;
  fontSize?: number;
}

export function ContractFromTemplate({ companyId, companyName, onSuccess }: ContractFromTemplateProps) {
  const { token } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [contractData, setContractData] = useState<Record<string, any>>({});
  const [templateFields, setTemplateFields] = useState<Field[]>([]);

  // Carica lista template
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['pdf-templates'],
    queryFn: () => apiClient<{ templates: PDFTemplate[] }>('pdf-templates', { token }),
  });

  const templates = templatesData?.templates?.filter(t => t.type === 'contract' && t.has_mapping) || [];

  // Carica mapping del template selezionato
  const { data: mappingData } = useQuery({
    queryKey: ['template-mapping', selectedTemplateId],
    queryFn: () => apiClient<{ fields: Field[] }>(`pdf-templates/${selectedTemplateId}/mapping`, { token }),
    enabled: !!selectedTemplateId,
  });

  // Quando cambia il template, carica i suoi campi e inizializza i dati
  useEffect(() => {
    if (mappingData?.fields) {
      setTemplateFields(mappingData.fields);
      
      // Inizializza i dati del contratto con valori di default
      const initialData: Record<string, any> = {};
      mappingData.fields.forEach(field => {
        if (field.type === 'date') {
          initialData[field.dataKey] = new Date().toLocaleDateString('it-IT');
        } else if (field.type === 'checkbox') {
          initialData[field.dataKey] = false;
        } else {
          initialData[field.dataKey] = '';
        }
      });
      
      // Se c'è il nome azienda, precompilalo
      if (companyName && initialData['company_name'] !== undefined) {
        initialData['company_name'] = companyName;
      }
      
      setContractData(initialData);
    }
  }, [mappingData, companyName]);

  // Genera PDF
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplateId) throw new Error('Seleziona un template');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/pdf-templates/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            templateId: selectedTemplateId,
            data: contractData,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore generazione PDF');
      }

      return response.blob();
    },
    onSuccess: async (blob) => {
      // Download PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contratto-${companyName || 'nuovo'}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Salva nel database
      try {
        const contractResult = await apiClient<{ id: string }>('contracts', {
          method: 'POST',
          token,
          body: {
            company_id: companyId,
            pack: templates.find(t => t.id === selectedTemplateId)?.name || 'Contratto',
            payment_amount: parseFloat(contractData.setup_fee) || 3000,
            notes: JSON.stringify({ templateId: selectedTemplateId, formData: contractData }),
          },
        });

        alert('Contratto generato e salvato con successo!');
        onSuccess?.(contractResult.id);
      } catch (error) {
        console.error('Errore salvataggio contratto:', error);
        alert('PDF generato ma errore nel salvataggio nel database');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Genera Contratto da Template</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Template *
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {templates.length === 0 && !isLoading && (
            <p className="text-xs text-amber-600 mt-1">
              Nessun template disponibile. Crea un template dalla pagina PDF Templates.
            </p>
          )}
        </div>

        {/* Contract Data Fields - Dinamici dal template */}
        {templateFields.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Seleziona un template per vedere i campi disponibili</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {templateFields.map((field) => (
              <div key={field.id} className={field.type === 'signature' ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                  {field.dataKey.replace(/_/g, ' ')}
                  <span className="ml-2 text-xs text-slate-500">({field.type})</span>
                </label>
                
                {field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contractData[field.dataKey] || false}
                      onChange={(e) => setContractData({ ...contractData, [field.dataKey]: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Sì</span>
                  </label>
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={contractData[field.dataKey] || ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value).toLocaleDateString('it-IT') : '';
                      setContractData({ ...contractData, [field.dataKey]: date });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                ) : (
                  <input
                    type="text"
                    value={contractData[field.dataKey] || ''}
                    onChange={(e) => setContractData({ ...contractData, [field.dataKey]: e.target.value })}
                    placeholder={`Inserisci ${field.dataKey.replace(/_/g, ' ')}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={generateMutation.isPending || !selectedTemplateId}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={20} />
          {generateMutation.isPending ? 'Generazione...' : 'Genera e Scarica Contratto'}
        </button>
      </form>
    </div>
  );
}

