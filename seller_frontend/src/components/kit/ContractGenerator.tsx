import { useState } from 'react';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { toast } from 'sonner';
import { FileSignature, Download, Send } from 'lucide-react';

type ContractType = 'performance' | 'setupfee';

interface ContractData {
  type: ContractType;
  companyName: string;
  representativeName: string;
  representativeRole: string;
  startDate: string;
  duration: string;
  // Performance specific
  revenueSharePercentage?: number;
  revenueShareMonths?: number;
  // Setup fee specific
  setupFee?: number;
  // Common
  additionalTerms: string;
}

export function ContractGenerator() {
  const { user } = useAuth();
  const { selectedClient } = useSelectedClient();
  const [contractData, setContractData] = useState<ContractData>({
    type: 'performance',
    companyName: '',
    representativeName: '',
    representativeRole: 'Legale Rappresentante',
    startDate: new Date().toISOString().split('T')[0],
    duration: '12 mesi',
    revenueSharePercentage: 10,
    revenueShareMonths: 6,
    setupFee: 0,
    additionalTerms: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Pre-fill with client data
  useState(() => {
    if (selectedClient) {
      if (selectedClient.type === 'company') {
        setContractData(prev => ({
          ...prev,
          companyName: selectedClient.data.ragione_sociale
        }));
      } else if (selectedClient.type === 'contact') {
        setContractData(prev => ({
          ...prev,
          companyName: selectedClient.data.company_name || '',
          representativeName: selectedClient.data.full_name
        }));
      }
    }
  });

  const generateContract = async () => {
    if (!selectedClient) {
      toast.error('Seleziona un cliente');
      return;
    }

    if (!contractData.companyName || !contractData.representativeName) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    if (contractData.type === 'performance' && (!contractData.revenueSharePercentage || !contractData.revenueShareMonths)) {
      toast.error('Compila i dati del revenue sharing');
      return;
    }

    if (contractData.type === 'setupfee' && !contractData.setupFee) {
      toast.error('Inserisci il setup fee');
      return;
    }

    setIsGenerating(true);
    
    // Simulate PDF generation
    setTimeout(() => {
      setIsGenerating(false);
      toast.success('Contratto generato con successo!');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Client Info */}
      {selectedClient && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-indigo-900">
            <FileSignature className="w-5 h-5" />
            <span className="font-semibold">
              Contratto per:{' '}
              {selectedClient.type === 'contact' 
                ? selectedClient.data.full_name 
                : selectedClient.data.ragione_sociale}
            </span>
          </div>
        </div>
      )}

      {/* Contract Type */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Tipo di Contratto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setContractData({ ...contractData, type: 'performance' })}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              contractData.type === 'performance'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="font-semibold text-lg mb-2">Performance Contract</div>
            <p className="text-sm text-slate-600">
              Contratto basato su performance e revenue sharing
            </p>
          </button>
          <button
            onClick={() => setContractData({ ...contractData, type: 'setupfee' })}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              contractData.type === 'setupfee'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="font-semibold text-lg mb-2">Setup Fee Contract</div>
            <p className="text-sm text-slate-600">
              Contratto con fee iniziale di setup
            </p>
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Dati Azienda</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ragione Sociale <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contractData.companyName}
              onChange={(e) => setContractData({ ...contractData, companyName: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Nome azienda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome Rappresentante <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contractData.representativeName}
              onChange={(e) => setContractData({ ...contractData, representativeName: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Nome e cognome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ruolo</label>
            <input
              type="text"
              value={contractData.representativeRole}
              onChange={(e) => setContractData({ ...contractData, representativeRole: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Legale Rappresentante"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Data Inizio</label>
            <input
              type="date"
              value={contractData.startDate}
              onChange={(e) => setContractData({ ...contractData, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Durata</label>
            <input
              type="text"
              value={contractData.duration}
              onChange={(e) => setContractData({ ...contractData, duration: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="12 mesi"
            />
          </div>
        </div>
      </div>

      {/* Contract Specific Fields */}
      {contractData.type === 'performance' && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
          <h3 className="font-semibold text-slate-900 mb-4">Condizioni Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Revenue Share (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={contractData.revenueSharePercentage}
                onChange={(e) => setContractData({ ...contractData, revenueSharePercentage: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Durata Revenue Share (mesi) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={contractData.revenueShareMonths}
                onChange={(e) => setContractData({ ...contractData, revenueShareMonths: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="6"
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
            <p className="text-sm text-slate-700">
              Il seller riceverà il <strong>{contractData.revenueSharePercentage}%</strong> del fatturato generato 
              per un periodo di <strong>{contractData.revenueShareMonths} mesi</strong> dall'attivazione del cliente.
            </p>
          </div>
        </div>
      )}

      {contractData.type === 'setupfee' && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
          <h3 className="font-semibold text-slate-900 mb-4">Setup Fee</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Importo Setup Fee (€) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={contractData.setupFee}
              onChange={(e) => setContractData({ ...contractData, setupFee: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="1000.00"
            />
          </div>
          <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
            <p className="text-sm text-slate-700">
              Il seller riceverà un compenso una tantum di <strong>€{contractData.setupFee?.toFixed(2) || '0.00'}</strong> 
              per l'attivazione del cliente.
            </p>
          </div>
        </div>
      )}

      {/* Additional Terms */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Clausole Aggiuntive</h3>
        <textarea
          value={contractData.additionalTerms}
          onChange={(e) => setContractData({ ...contractData, additionalTerms: e.target.value })}
          rows={6}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Inserisci eventuali clausole aggiuntive, condizioni particolari, note legali..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={generateContract}
          disabled={isGenerating}
          className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all font-bold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generazione in corso...
            </>
          ) : (
            <>
              <FileSignature className="w-5 h-5" />
              Genera Contratto PDF
            </>
          )}
        </button>
      </div>

      <div className="flex gap-4">
        <button
          disabled
          className="flex-1 py-3 bg-slate-200 text-slate-500 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Scarica PDF
        </button>
        <button
          disabled
          className="flex-1 py-3 bg-slate-200 text-slate-500 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          Invia via Email
        </button>
      </div>
    </div>
  );
}

