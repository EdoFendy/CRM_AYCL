import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';

interface ContractData {
  company_name: string;
  company_address: string;
  company_tax_id: string;
  representative_name: string;
  representative_role: string;
  contract_date: string;
  setup_fee: string;
  unit_cost: string;
  revenue_share_percentage: string;
  revenue_share_months: string;
  icp_geographic_area: string;
  icp_sector: string;
  icp_min_revenue: string;
  icp_unit_cost: string;
  icp_revenue_share: string;
  icp_date: string;
}

interface Contract {
  id: string;
  number: string;
  status: string;
  pack: string;
  company_id: string;
  requires_payment: boolean;
  payment_amount: number;
  payment_currency: string;
  is_subscription: boolean;
  created_at: string;
  signed_at?: string;
  company_name?: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
  email: string;
}

interface ContractGeneratorProps {
  onGenerateContract: (contractType: 'performance' | 'setupfee', data: ContractData) => void;
}

const ContractGenerator: React.FC<ContractGeneratorProps> = ({ onGenerateContract }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [contractType, setContractType] = useState<'performance' | 'setupfee'>('performance');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [formData, setFormData] = useState<ContractData>({
    company_name: '',
    company_address: '',
    company_tax_id: '',
    representative_name: '',
    representative_role: '',
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

  // Fetch companies
  const { data: companiesResponse, isLoading: companiesLoading, error: companiesError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiClient<{ data: Company[]; nextCursor?: string }>('companies', { 
      token,
      searchParams: { limit: 1000 }
    }),
    retry: 1,
    retryDelay: 1000,
  });

  const companies = companiesResponse?.data ?? [];

  // Fallback companies for testing
  const fallbackCompanies: Company[] = [
    { id: '11111111-1111-1111-1111-111111111111', ragione_sociale: 'Test Company 1', email: 'test1@example.com' },
    { id: '22222222-2222-2222-2222-222222222222', ragione_sociale: 'Test Company 2', email: 'test2@example.com' },
    { id: '33333333-3333-3333-3333-333333333333', ragione_sociale: 'Test Company 3', email: 'test3@example.com' },
  ];

  const availableCompanies = companies.length > 0 ? companies : fallbackCompanies;


  const handleInputChange = (field: keyof ContractData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateContract = async () => {
    if (!selectedCompanyId) {
      alert('Seleziona un\'azienda prima di generare il contratto');
      return;
    }

    try {
      // Create contract in database
      const contractData = {
        company_id: selectedCompanyId,
        pack: contractType === 'performance' ? 'Performance' : 'Setup-Fee',
        requires_payment: true,
        payment_amount: parseFloat(formData.setup_fee) || 3000,
        payment_currency: 'EUR',
        is_subscription: false,
        notes: `Contratto generato automaticamente. Parametri ICP: ${formData.icp_geographic_area}, ${formData.icp_sector}, €${formData.icp_min_revenue}`
      };

      const contract = await apiClient<Contract>('contracts', {
        method: 'POST',
        token,
        body: contractData,
      });

      // Generate and save contract PDF
      await generateAndSaveContractPDF(contract.id, contractType, formData);
      
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      alert(`Contratto ${contract.number} creato con successo!`);
      onGenerateContract(contractType, formData);
    } catch (error: any) {
      console.error('Error creating contract:', error);
      
      // Fallback: just generate the contract without saving to database
      if (error.message?.includes('Cannot POST') || error.message?.includes('Network Error')) {
        alert('API non disponibile. Generando contratto in modalità offline...');
        onGenerateContract(contractType, formData);
      } else {
        alert('Errore nella creazione del contratto: ' + (error.message || 'Errore sconosciuto'));
      }
    }
  };

  const generateAndSaveContractPDF = async (contractId: string, contractType: 'performance' | 'setupfee', data: ContractData) => {
    try {
      // Generate contract HTML
      let contractHtml = '';
      const possiblePaths = [
        `/contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`,
        `/src/contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`,
      ];
      
      for (const path of possiblePaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            contractHtml = await response.text();
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!contractHtml) {
        contractHtml = createFallbackContract(contractType, data);
      } else {
        contractHtml = fillContractWithData(contractHtml, data);
      }

      // Save as file in database
      const fileName = `contratto_${contractType}_${new Date().toISOString().split('T')[0]}.html`;
      const fileData = {
        name: fileName,
        mime: 'text/html',
        size: contractHtml.length,
        storage_url: `data:text/html;base64,${btoa(contractHtml)}`,
        tags: ['contract', contractType, 'generated'],
        contract_id: contractId,
        company_id: selectedCompanyId
      };

      await apiClient('files', {
        method: 'POST',
        token,
        body: fileData,
      });

    } catch (error) {
      console.error('Error saving contract PDF:', error);
      // Don't throw error here to avoid breaking the main flow
    }
  };

  const fillContractWithData = (contractHtml: string, data: ContractData): string => {
    let filledContract = contractHtml;
    
    // Replace all editable fields with actual data
    Object.entries(data).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        // Replace contenteditable spans with actual values (more specific pattern)
        const spanRegex = new RegExp(`<span[^>]*data-field="${key}"[^>]*>\\[.*?\\]</span>`, 'g');
        filledContract = filledContract.replace(spanRegex, `<span class="editable-field" data-field="${key}">${value}</span>`);
        
        // Replace input fields with actual values
        const inputRegex = new RegExp(`<input[^>]*data-field="${key}"[^>]*value="[^"]*"[^>]*>`, 'g');
        filledContract = filledContract.replace(inputRegex, `<input class="editable-field" data-field="${key}" value="${value}">`);
        
        // Replace div contenteditable fields
        const divRegex = new RegExp(`<div[^>]*data-field="${key}"[^>]*>\\[.*?\\]</div>`, 'g');
        filledContract = filledContract.replace(divRegex, `<div class="editable-table-cell" data-field="${key}">${value}</div>`);
      }
    });
    
    // Remove contenteditable attributes to make it read-only
    filledContract = filledContract.replace(/contenteditable="true"/g, 'contenteditable="false"');
    
    // Add CSS to make fields look like filled text instead of inputs
    const styleTag = `
      <style>
        .editable-field {
          background-color: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-weight: normal !important;
          color: #000 !important;
          display: inline !important;
        }
        .editable-table-cell {
          background-color: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-weight: normal !important;
          color: #000 !important;
        }
        input.editable-field {
          display: inline !important;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-weight: normal !important;
          color: #000 !important;
        }
        /* Hide input styling completely */
        input[type="text"].editable-field {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
      </style>
    `;
    
    filledContract = filledContract.replace('</head>', styleTag + '</head>');
    
    return filledContract;
  };

  const previewContract = async (contractType: 'performance' | 'setupfee', data: ContractData) => {
    try {
      // Try different paths for the contract template
      const possiblePaths = [
        `/contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`,
        `/src/contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`,
        `./contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`,
        `./src/contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`
      ];
      
      let contractHtml = '';
      let response;
      
      // Try each path until one works
      for (const path of possiblePaths) {
        try {
          response = await fetch(path);
          if (response.ok) {
            contractHtml = await response.text();
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!contractHtml) {
        // Fallback: create a basic contract template
        contractHtml = createFallbackContract(contractType, data);
      } else {
        // Replace all placeholder values with actual data
        contractHtml = fillContractWithData(contractHtml, data);
      }
      
      // Create a new window with the filled contract for preview
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(contractHtml);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error previewing contract:', error);
      alert('Errore nell\'anteprima del contratto. Riprova.');
    }
  };

  const downloadContract = async (contractType: 'performance' | 'setupfee', data: ContractData) => {
    try {
      // Try different paths for the contract template
      const possiblePaths = [
        `/contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`,
        `/src/contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`,
        `./contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`,
        `./src/contracts_form/${contractType === 'performance' ? 'Performance_Contract_Formatted.html' : 'SetUpFee_Contract_Formatted.html'}`
      ];
      
      let contractHtml = '';
      let response;
      
      // Try each path until one works
      for (const path of possiblePaths) {
        try {
          response = await fetch(path);
          if (response.ok) {
            contractHtml = await response.text();
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!contractHtml) {
        // Fallback: create a basic contract template
        contractHtml = createFallbackContract(contractType, data);
      } else {
        // Replace all placeholder values with actual data
        contractHtml = fillContractWithData(contractHtml, data);
      }
      
      // Create a new window with the filled contract
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(contractHtml);
        newWindow.document.close();
        
        // Wait for the document to load, then trigger print
        newWindow.onload = () => {
          setTimeout(() => {
            newWindow.print();
          }, 1000);
        };
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      alert('Errore nella generazione del contratto. Riprova.');
    }
  };

  const createFallbackContract = (contractType: 'performance' | 'setupfee', data: ContractData): string => {
    const contractTitle = contractType === 'performance' 
      ? 'CONTRATTO ALL YOU CAN LEADS - PACCHETTO PERFORMANCE'
      : 'CONTRATTO ALL YOU CAN LEADS - PACCHETTO SETUP FEE + REVENUE SHARE';
    
    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${contractTitle}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; margin: 2cm; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .contract-title { font-size: 16pt; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
          .parties-section { margin: 20px 0; padding: 15px; border: 1px solid #ccc; background-color: #f9f9f9; }
          .party-info { margin: 10px 0; padding: 8px; background-color: white; border-left: 3px solid #007bff; }
          .party-label { font-weight: bold; color: #007bff; margin-bottom: 5px; }
          .filled-field { font-weight: bold; color: #000; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="contract-title">${contractTitle}</div>
        </div>
        
        <div class="parties-section">
          <div class="party-info">
            <div class="party-label">CONSULENTE:</div>
            <div>4YOU 4YOUR FUTURE SOCIEDAD LTDA</div>
            <div>con sede legale in Avenida Touroperador Neckermann 3, Campo Internazionale, Maspalomas, 35100, Spagna</div>
            <div>CIF: B44593010</div>
            <div>rappresentata dall'Amministratore Unico Giacomo Romano</div>
            <div>(di seguito, il "Consulente" o il "Fornitore")</div>
          </div>
          
          <div style="text-align: center; margin: 15px 0; font-weight: bold;">e</div>
          
          <div class="party-info">
            <div class="party-label">COMMITTENTE:</div>
            <div>
              <span class="filled-field">${data.company_name || '[Nome Azienda]'}</span>
              , con sede legale in 
              <span class="filled-field">${data.company_address || '[Indirizzo]'}</span>
              , C.F./P.IVA 
              <span class="filled-field">${data.company_tax_id || '[Codice Fiscale/P.IVA]'}</span>
              , rappresentata da 
              <span class="filled-field">${data.representative_name || '[Nome Rappresentante]'}</span>
              in qualità di 
              <span class="filled-field">${data.representative_role || '[Ruolo]'}</span>
            </div>
            <div>(di seguito "Committente" o "Cliente")</div>
          </div>
        </div>
        
        <div style="margin-top: 50px; text-align: center;">
          <p><strong>Data:</strong> ${data.contract_date || new Date().toLocaleDateString('it-IT')}</p>
          ${contractType === 'performance' ? 
            `<p><strong>Setup Fee:</strong> €${data.setup_fee || '3000'}</p>
             <p><strong>Costo Unitario Appuntamento:</strong> €${data.unit_cost || '[Da definire]'}</p>` :
            `<p><strong>Setup Fee:</strong> €${data.setup_fee || '3000'}</p>
             <p><strong>Revenue Share:</strong> ${data.revenue_share_percentage || '[Da definire]'}%</p>
             <p><strong>Durata Revenue Share:</strong> ${data.revenue_share_months || '12'} mesi</p>`
          }
        </div>
        
        <div style="margin-top: 50px;">
          <p><strong>Parametri ICP:</strong></p>
          <ul>
            <li><strong>Area Geografica:</strong> ${data.icp_geographic_area || '[Da definire]'}</li>
            <li><strong>Settore:</strong> ${data.icp_sector || '[Da definire]'}</li>
            <li><strong>Fatturato Minimo Annuo:</strong> €${data.icp_min_revenue || '[Da definire]'}</li>
          </ul>
        </div>
        
        <div style="margin-top: 100px; display: flex; justify-content: space-between;">
          <div>
            <p><strong>Firma Consulente</strong></p>
            <div style="border-bottom: 1px solid #000; width: 200px; height: 30px;"></div>
          </div>
          <div>
            <p><strong>Firma Committente</strong></p>
            <div style="border-bottom: 1px solid #000; width: 200px; height: 30px;"></div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Generatore Contratti</h2>
      
      {/* Contract Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo di Contratto
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="performance"
              checked={contractType === 'performance'}
              onChange={(e) => setContractType(e.target.value as 'performance')}
              className="mr-2"
            />
            Performance Contract
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="setupfee"
              checked={contractType === 'setupfee'}
              onChange={(e) => setContractType(e.target.value as 'setupfee')}
              className="mr-2"
            />
            Setup Fee + Revenue Share
          </label>
        </div>
      </div>

      {/* Company Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleziona Azienda *
        </label>
        <select
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          disabled={companiesLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {companiesLoading ? 'Caricamento aziende...' : 'Seleziona un\'azienda...'}
          </option>
          {availableCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.ragione_sociale}
            </option>
          ))}
        </select>
        {companiesError && (
          <p className="text-red-600 text-sm mt-1">
            Errore nel caricamento delle aziende: {companiesError.message}
          </p>
        )}
        {!selectedCompanyId && !companiesLoading && (
          <p className="text-red-600 text-sm mt-1">Seleziona un'azienda per continuare</p>
        )}
        {availableCompanies.length === 0 && !companiesLoading && !companiesError && (
          <div className="text-yellow-600 text-sm mt-1">
            <p>Nessuna azienda trovata nel database.</p>
            <p>Vai alla pagina Aziende per crearne una nuova.</p>
          </div>
        )}
        {companiesError && availableCompanies.length > 0 && (
          <div className="text-blue-600 text-sm mt-1">
            <p>Usando aziende di test. L'API non è disponibile.</p>
          </div>
        )}
      </div>

      {/* Company Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Azienda *
          </label>
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) => handleInputChange('company_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome dell'azienda"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Indirizzo *
          </label>
          <input
            type="text"
            value={formData.company_address}
            onChange={(e) => handleInputChange('company_address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Indirizzo completo"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Codice Fiscale/P.IVA *
          </label>
          <input
            type="text"
            value={formData.company_tax_id}
            onChange={(e) => handleInputChange('company_tax_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="CF/P.IVA"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rappresentante *
          </label>
          <input
            type="text"
            value={formData.representative_name}
            onChange={(e) => handleInputChange('representative_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome e cognome"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ruolo *
          </label>
          <input
            type="text"
            value={formData.representative_role}
            onChange={(e) => handleInputChange('representative_role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Amministratore Delegato, etc."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Contratto
          </label>
          <input
            type="text"
            value={formData.contract_date}
            onChange={(e) => handleInputChange('contract_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="DD/MM/YYYY"
          />
        </div>
      </div>

      {/* Contract Specific Fields */}
      {contractType === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setup Fee (€)
            </label>
            <input
              type="number"
              value={formData.setup_fee}
              onChange={(e) => handleInputChange('setup_fee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="3000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo Unitario Appuntamento (€)
            </label>
            <input
              type="number"
              value={formData.unit_cost}
              onChange={(e) => handleInputChange('unit_cost', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Costo per appuntamento"
            />
          </div>
        </div>
      )}

      {contractType === 'setupfee' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setup Fee (€)
            </label>
            <input
              type="number"
              value={formData.setup_fee}
              onChange={(e) => handleInputChange('setup_fee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Setup fee"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Revenue Share (%)
            </label>
            <input
              type="number"
              value={formData.revenue_share_percentage}
              onChange={(e) => handleInputChange('revenue_share_percentage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Percentuale"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durata Revenue Share (mesi)
            </label>
            <input
              type="number"
              value={formData.revenue_share_months}
              onChange={(e) => handleInputChange('revenue_share_months', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12"
            />
          </div>
        </div>
      )}

      {/* ICP Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Parametri ICP (Ideal Customer Profile)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area Geografica
            </label>
            <input
              type="text"
              value={formData.icp_geographic_area}
              onChange={(e) => handleInputChange('icp_geographic_area', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Italia, Europa, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Settore
            </label>
            <input
              type="text"
              value={formData.icp_sector}
              onChange={(e) => handleInputChange('icp_sector', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tecnologia, Finanza, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fatturato Minimo Annuo (€)
            </label>
            <input
              type="number"
              value={formData.icp_min_revenue}
              onChange={(e) => handleInputChange('icp_min_revenue', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000000"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleGenerateContract}
          disabled={!selectedCompanyId}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Genera Contratto
        </button>
        
        <button
          onClick={() => {
            if (!selectedCompanyId) {
              alert('Seleziona un\'azienda prima di visualizzare l\'anteprima');
              return;
            }
            previewContract(contractType, formData);
          }}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Anteprima
        </button>
        
        <button
          onClick={() => {
            if (!selectedCompanyId) {
              alert('Seleziona un\'azienda prima di scaricare il PDF');
              return;
            }
            downloadContract(contractType, formData);
          }}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Genera e Scarica PDF
        </button>
        
        <button
          onClick={() => {
            setSelectedCompanyId('');
            setFormData({
              company_name: '',
              company_address: '',
              company_tax_id: '',
              representative_name: '',
              representative_role: '',
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
          }}
          className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ContractGenerator;
