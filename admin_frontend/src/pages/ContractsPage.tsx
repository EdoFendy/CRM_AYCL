import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge } from '../components/ui/StatusBadge';

interface ContractRow {
  id: string;
  company_id: string;
  status: string;
  signed_at?: string;
  template_id?: string;
  pdf_url?: string;
}

export default function ContractsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', company_id: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('contracts.title')}</h2>

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.status')}
          value={filters.status ?? ''}
          onChange={(event) => setFilters({ status: event.target.value })}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.companyId')}
          value={filters.company_id ?? ''}
          onChange={(event) => setFilters({ company_id: event.target.value })}
        />
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onClick={resetFilters}
        >
          {t('forms.reset')}
        </button>
      </FiltersToolbar>

      <DataTable
        data={contractsQuery.data?.data ?? []}
        columns={[
          { id: 'id', header: t('labels.id'), cell: (contract: ContractRow) => contract.id },
          { id: 'company', header: t('labels.company'), cell: (contract: ContractRow) => contract.company_id },
          { id: 'status', header: t('labels.status'), cell: (contract: ContractRow) => contract.status },
          {
            id: 'signed_at',
            header: 'Firmato',
            cell: (contract: ContractRow) => (contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : '—'),
          },
          {
            id: 'pdf',
            header: t('labels.download'),
            cell: (contract: ContractRow) =>
              contract.pdf_url ? (
                <a href={contract.pdf_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  {t('portfolio.detail.downloadContract')}
                </a>
              ) : (
                <span>{t('portfolio.detail.missingInvoicesApi')}</span>
              ),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (contract: ContractRow) => (
              <div className="flex gap-2 flex-wrap">
                {contract.status === 'draft' && (
                  <button
                    onClick={() => {
                      setWorkflowContract(contract);
                      setWorkflowAction('send');
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Send
                  </button>
                )}
                {contract.status === 'sent' && (
                  <button
                    onClick={() => {
                      setWorkflowContract(contract);
                      setWorkflowAction('sign');
                    }}
                    className="text-sm text-green-600 hover:underline"
                  >
                    Mark Signed
                  </button>
                )}
                <button
                  onClick={() => setDeletingId(contract.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {/* Workflow Confirmation Dialog */}
      <ConfirmDialog
        isOpen={workflowContract !== null && workflowAction !== null}
        onClose={() => {
          setWorkflowContract(null);
          setWorkflowAction(null);
        }}
        onConfirm={handleWorkflowAction}
        title={`${workflowAction === 'send' ? 'Send' : 'Mark as Signed'} Contract`}
        message={`Are you sure you want to ${workflowAction === 'send' ? 'send' : 'mark as signed'} this contract?`}
        confirmVariant="primary"
        isLoading={updateStatusMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Contract"
        message="Are you sure you want to delete this contract? This action cannot be undone."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
