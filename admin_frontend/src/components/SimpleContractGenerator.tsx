/**
 * Generatore Contratti SEMPLIFICATO
 * Replica il sistema dei preventivi (AYCLKitPage)
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { downloadContractPDF, type ContractData } from '../utils/contractPDF';

interface Company {
  id: string;
  ragione_sociale: string;
  indirizzo?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  rappresentante_legale?: string;
  ruolo_rappresentante?: string;
}

export default function SimpleContractGenerator() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  const [contractType, setContractType] = useState<'performance' | 'setupfee'>('performance');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [formData, setFormData] = useState<ContractData>({
    company_name: '',
    company_address: '',
    company_tax_id: '',
    representative_name: '',
    representative_role: '',
    contract_place: '',
    contract_date: new Date().toLocaleDateString('it-IT'),
    setup_fee: '3000',
    unit_cost: '',
    revenue_share_percentage: '',
    revenue_share_months: '12',
    icp_geographic_area: '',
    icp_sector: '',
    icp_min_revenue: '',
    icp_unit_cost: '',
    icp_revenue_share: '',
    icp_date: new Date().toLocaleDateString('it-IT'),
  });

  // Carica aziende
  const { data: companiesData, isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiClient<{ data: Company[] }>('companies', { token }),
  });

  const companies = companiesData?.data ?? [];

  // Quando seleziono azienda, popola i campi
  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setFormData(prev => ({
        ...prev,
        company_name: company.ragione_sociale,
        company_address: company.indirizzo || '',
        company_tax_id: company.partita_iva || company.codice_fiscale || '',
        representative_name: company.rappresentante_legale || '',
        representative_role: company.ruolo_rappresentante || '',
      }));
    }
  };

  // Mutation per salvare contratto (SOLO DATI, come i preventivi)
  const generateMutation = useMutation({
    mutationFn: async () => {
      // 1. Salva contratto nel DB
      const contract = await apiClient<{ id: string; number: string }>('contracts', {
        method: 'POST',
        token,
        body: {
          company_id: selectedCompanyId,
          pack: contractType === 'performance' ? 'Performance' : 'Setup-Fee',
          requires_payment: true,
          payment_amount: parseFloat(formData.setup_fee) || 3000,
          payment_currency: 'EUR',
          is_subscription: false,
          notes: JSON.stringify({
            formData,
            contractType,
            generatedAt: new Date().toISOString()
          })
        }
      });

      // 2. Genera PDF
      await downloadContractPDF(contractType, formData);

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      alert('Contratto generato e salvato con successo!');
      // Reset form
      setSelectedCompanyId('');
      setFormData({
        company_name: '',
        company_address: '',
        company_tax_id: '',
        representative_name: '',
        representative_role: '',
        contract_place: '',
        contract_date: new Date().toLocaleDateString('it-IT'),
        setup_fee: '3000',
        unit_cost: '',
        revenue_share_percentage: '',
        revenue_share_months: '12',
        icp_geographic_area: '',
        icp_sector: '',
        icp_min_revenue: '',
        icp_unit_cost: '',
        icp_revenue_share: '',
        icp_date: new Date().toLocaleDateString('it-IT'),
      });
    },
    onError: (error: any) => {
      alert('Errore: ' + (error.message || 'Impossibile generare il contratto'));
    }
  });

  const handleGenerate = () => {
    if (!selectedCompanyId) {
      alert('Seleziona un\'azienda');
      return;
    }
    if (!formData.company_name || !formData.icp_geographic_area || !formData.icp_sector) {
      alert('Compila i campi obbligatori');
      return;
    }
    generateMutation.mutate();
  };

  // Scarica solo PDF senza salvare
  const handlePreview = async () => {
    if (!formData.company_name) {
      alert('Compila almeno il nome azienda');
      return;
    }
    try {
      await downloadContractPDF(contractType, formData);
    } catch (error) {
      alert('Errore generazione PDF');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Genera Contratto</h2>

      {/* Tipo Contratto */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Tipo Contratto</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="performance"
              checked={contractType === 'performance'}
              onChange={(e) => setContractType(e.target.value as any)}
              className="mr-2"
            />
            Performance
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="setupfee"
              checked={contractType === 'setupfee'}
              onChange={(e) => setContractType(e.target.value as any)}
              className="mr-2"
            />
            Setup Fee + Revenue Share
          </label>
        </div>
      </div>

      {/* Seleziona Azienda */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Azienda *</label>
        <select
          value={selectedCompanyId}
          onChange={(e) => handleCompanySelect(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={loadingCompanies}
        >
          <option value="">Seleziona...</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.ragione_sociale}</option>
          ))}
        </select>
      </div>

      {/* Dati Azienda */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome Azienda *</label>
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) => setFormData({...formData, company_name: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Indirizzo</label>
          <input
            type="text"
            value={formData.company_address}
            onChange={(e) => setFormData({...formData, company_address: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">P.IVA / CF</label>
          <input
            type="text"
            value={formData.company_tax_id}
            onChange={(e) => setFormData({...formData, company_tax_id: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rappresentante</label>
          <input
            type="text"
            value={formData.representative_name}
            onChange={(e) => setFormData({...formData, representative_name: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ruolo</label>
          <input
            type="text"
            value={formData.representative_role}
            onChange={(e) => setFormData({...formData, representative_role: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Luogo</label>
          <input
            type="text"
            value={formData.contract_place}
            onChange={(e) => setFormData({...formData, contract_place: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {/* Parametri ICP */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Parametri ICP *</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Area Geografica *</label>
            <input
              type="text"
              value={formData.icp_geographic_area}
              onChange={(e) => setFormData({...formData, icp_geographic_area: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Settore *</label>
            <input
              type="text"
              value={formData.icp_sector}
              onChange={(e) => setFormData({...formData, icp_sector: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fatturato Minimo</label>
            <input
              type="text"
              value={formData.icp_min_revenue}
              onChange={(e) => setFormData({...formData, icp_min_revenue: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Setup Fee (€)</label>
            <input
              type="number"
              value={formData.setup_fee}
              onChange={(e) => setFormData({...formData, setup_fee: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Pulsanti */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {generateMutation.isPending ? 'Generazione...' : 'Genera e Salva Contratto'}
        </button>
        <button
          onClick={handlePreview}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
        >
          Solo Anteprima PDF
        </button>
      </div>
    </div>
  );
}

