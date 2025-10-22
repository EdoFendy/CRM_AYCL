import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FileText, Eye, Trash2, Send, Check, Download, ExternalLink } from 'lucide-react';
import { downloadContractPDF, type ContractData } from '../utils/contractPDF';

interface ContractRow {
  id: string;
  company_id: string;
  company_name?: string;
  status: string;
  signed_at?: string;
  template_id?: string;
  pdf_url?: string;
  created_at: string;
  expires_at?: string;
  pack?: string;
  payment_amount?: number;
  payment_currency?: string;
  notes?: string;
  files?: Array<{
    id: string;
    name: string;
    storage_url: string;
    mime: string;
  }>;
}

export default function ContractsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', search: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingContract, setViewingContract] = useState<ContractRow | null>(null);
  const [workflowContract, setWorkflowContract] = useState<ContractRow | null>(null);
  const [workflowAction, setWorkflowAction] = useState<'send' | 'sign' | null>(null);

  const contractsQuery = useQuery({
    queryKey: ['contracts', filters],
    queryFn: () =>
      apiClient<{ data: ContractRow[] }>('contracts', {
        token,
        searchParams: filters,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`contracts/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setDeletingId(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient(`contracts/${id}/transition`, {
        method: 'PATCH',
        token,
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setWorkflowContract(null);
      setWorkflowAction(null);
    },
  });

  const handleWorkflowAction = () => {
    if (!workflowContract || !workflowAction) return;
    
    const statusMap = {
      send: 'sent',
      sign: 'signed',
    };
    
    updateStatusMutation.mutate({ id: workflowContract.id, status: statusMap[workflowAction] });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const handleDownloadPDF = (contract: ContractRow) => {
    // Try to find a PDF file in the contract files
    const pdfFile = contract.files?.find(file => 
      file.mime === 'application/pdf' || 
      file.name.toLowerCase().includes('.pdf') ||
      file.name.toLowerCase().includes('contratto')
    );

    if (pdfFile) {
      // If it's a data URL, open it directly
      if (pdfFile.storage_url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = pdfFile.storage_url;
        link.download = pdfFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // If it's a regular URL, open in new tab
        window.open(pdfFile.storage_url, '_blank');
      }
    } else if (contract.pdf_url) {
      // Fallback to the old pdf_url field
      window.open(contract.pdf_url, '_blank');
    } else {
      // If no PDF exists, try to generate one
      generateContractPDF(contract);
    }
  };

  const generateContractPDF = async (contract: ContractRow) => {
    try {
      console.log('[CONTRACTS] Inizio generazione PDF per contratto:', contract.id);
      console.log('[CONTRACTS] Notes salvati:', contract.notes);
      
      // Determina tipo contratto
      const contractType: 'performance' | 'setupfee' = contract.pack?.toLowerCase().includes('performance') ? 'performance' : 'setupfee';
      
      // Recupera dati dal campo notes (salvati durante la generazione)
      let formData: ContractData | null = null;
      try {
        if (contract.notes) {
          const parsed = JSON.parse(contract.notes);
          // I dati sono salvati in parsed.formData
          formData = parsed.formData;
          console.log('[CONTRACTS] Dati recuperati da notes:', formData);
        }
      } catch (e) {
        console.warn('[CONTRACTS] Notes non valido, uso dati di default:', e);
      }
      
      // Se non ci sono dati salvati, usa i valori di default dal contratto
      const data: ContractData = formData || {
        company_name: contract.company_name || 'N/A',
        company_address: 'Da definire',
        company_tax_id: 'Da definire',
        representative_name: 'Da definire',
        representative_role: 'Da definire',
        contract_place: '',
        contract_date: new Date(contract.created_at).toLocaleDateString('it-IT'),
        setup_fee: contract.payment_amount?.toString() || '3000',
        unit_cost: '',
        revenue_share_percentage: '',
        revenue_share_months: '12',
        icp_geographic_area: 'Da definire',
        icp_sector: 'Da definire',
        icp_min_revenue: 'Da definire',
        icp_unit_cost: '',
        icp_revenue_share: '',
        icp_date: new Date().toLocaleDateString('it-IT'),
      };
      
      console.log('[CONTRACTS] Dati finali per PDF:', data);
      
      // Genera PDF
      await downloadContractPDF(contractType, data);
      
    } catch (error) {
      console.error('[CONTRACTS] Errore generazione PDF:', error);
      alert('Errore generazione PDF. Controlla la console per dettagli.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Bozza', className: 'bg-gray-100 text-gray-700' },
      sent: { label: 'Inviato', className: 'bg-blue-100 text-blue-700' },
      signed: { label: 'Firmato', className: 'bg-green-100 text-green-700' },
      expired: { label: 'Scaduto', className: 'bg-red-100 text-red-700' },
      terminated: { label: 'Terminato', className: 'bg-slate-100 text-slate-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const rows = contractsQuery.data?.data ?? [];
  const signedCount = rows.filter(c => c.status === 'signed').length;
  const pendingCount = rows.filter(c => c.status === 'sent').length;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Contratti</h2>
          <p className="text-sm text-slate-500">Gestisci i contratti con le aziende</p>
        </div>
        <FileText className="h-8 w-8 text-slate-400" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Totale Contratti</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Firmati</p>
          <p className="text-2xl font-bold text-green-600">{signedCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">In Attesa</p>
          <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
        </div>
      </div>

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Cerca per azienda o ID..."
          value={filters.search ?? ''}
          onChange={(event) => setFilters({ search: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.status ?? ''}
          onChange={(event) => setFilters({ status: event.target.value })}
        >
          <option value="">Tutti gli stati</option>
          <option value="draft">Bozza</option>
          <option value="sent">Inviato</option>
          <option value="signed">Firmato</option>
          <option value="expired">Scaduto</option>
          <option value="terminated">Terminato</option>
        </select>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          onClick={resetFilters}
        >
          Reset
        </button>
      </FiltersToolbar>

      <DataTable
        data={rows}
        columns={[
          { 
            id: 'id', 
            header: 'ID', 
            cell: (contract: ContractRow) => (
              <div className="font-mono text-xs text-slate-600">
                {contract.id.substring(0, 8)}
              </div>
            )
          },
          { 
            id: 'company', 
            header: 'Azienda', 
            cell: (contract: ContractRow) => (
              <Link 
                to={`/companies/${contract.company_id}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3 w-3" />
                {contract.company_name || contract.company_id.substring(0, 8)}
              </Link>
            )
          },
          { 
            id: 'created', 
            header: 'Data Creazione', 
            cell: (contract: ContractRow) => formatDate(contract.created_at)
          },
          { 
            id: 'signed', 
            header: 'Data Firma', 
            cell: (contract: ContractRow) => formatDate(contract.signed_at)
          },
          { 
            id: 'expires', 
            header: 'Scadenza', 
            cell: (contract: ContractRow) => formatDate(contract.expires_at)
          },
          { 
            id: 'pack', 
            header: 'Pack', 
            cell: (contract: ContractRow) => (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {contract.pack || 'N/A'}
              </span>
            )
          },
          { 
            id: 'amount', 
            header: 'Importo', 
            cell: (contract: ContractRow) => (
              <div className="text-sm">
                {contract.payment_amount ? `€${contract.payment_amount}` : '—'}
              </div>
            )
          },
          { 
            id: 'status', 
            header: 'Stato', 
            cell: (contract: ContractRow) => getStatusBadge(contract.status)
          },
          {
            id: 'actions',
            header: 'Azioni',
            cell: (contract: ContractRow) => (
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setViewingContract(contract)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  title="Visualizza dettagli"
                >
                  <Eye className="h-4 w-4" />
                  Dettagli
                </button>
                <button
                  onClick={() => handleDownloadPDF(contract)}
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
                {contract.status === 'draft' && (
                  <button
                    onClick={() => {
                      setWorkflowContract(contract);
                      setWorkflowAction('send');
                    }}
                    className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                    title="Invia contratto"
                  >
                    <Send className="h-4 w-4" />
                    Invia
                  </button>
                )}
                {contract.status === 'sent' && (
                  <button
                    onClick={() => {
                      setWorkflowContract(contract);
                      setWorkflowAction('sign');
                    }}
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                    title="Segna come firmato"
                  >
                    <Check className="h-4 w-4" />
                    Firma
                  </button>
                )}
                <button
                  onClick={() => setDeletingId(contract.id)}
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                  title="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </button>
              </div>
            ),
          },
        ]}
        emptyState={
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-1">Nessun contratto trovato</h3>
            <p className="text-sm text-slate-500">I contratti generati appariranno qui.</p>
          </div>
        }
      />

      {/* Dialog Dettagli Contratto */}
      {viewingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Contratto {viewingContract.id.substring(0, 8)}
                </h3>
                <p className="text-sm text-slate-500">
                  Creato il {new Date(viewingContract.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => setViewingContract(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Azienda</h4>
                <Link 
                  to={`/companies/${viewingContract.company_id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  {viewingContract.company_name || viewingContract.company_id}
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Data Creazione</h4>
                  <div className="text-sm">{formatDate(viewingContract.created_at)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Data Firma</h4>
                  <div className="text-sm">{formatDate(viewingContract.signed_at)}</div>
                </div>
              </div>

              {viewingContract.expires_at && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Data Scadenza</h4>
                  <div className="text-sm">{formatDate(viewingContract.expires_at)}</div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Stato</h4>
                {getStatusBadge(viewingContract.status)}
              </div>

              {viewingContract.template_id && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Template</h4>
                  <div className="text-sm font-mono text-slate-600">{viewingContract.template_id}</div>
                </div>
              )}

              {viewingContract.pdf_url && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Documento</h4>
                  <a
                    href={viewingContract.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                  >
                    <Download className="h-4 w-4" />
                    Scarica PDF
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setViewingContract(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Workflow */}
      <ConfirmDialog
        isOpen={workflowContract !== null && workflowAction !== null}
        onClose={() => {
          setWorkflowContract(null);
          setWorkflowAction(null);
        }}
        onConfirm={handleWorkflowAction}
        title={workflowAction === 'send' ? 'Invia Contratto' : 'Segna come Firmato'}
        message={`Confermi di voler ${workflowAction === 'send' ? 'inviare' : 'segnare come firmato'} questo contratto?`}
        confirmVariant="primary"
        isLoading={updateStatusMutation.isPending}
      />

      {/* Dialog Conferma Eliminazione */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Elimina Contratto"
        message="Sei sicuro di voler eliminare questo contratto? Questa azione non può essere annullata."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
