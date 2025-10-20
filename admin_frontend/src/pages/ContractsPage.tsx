import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { DataTable } from '@components/data/DataTable';
import { FiltersToolbar } from '@components/forms/FiltersToolbar';
import { usePersistentFilters } from '@hooks/usePersistentFilters';

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
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', company_id: '' });

  const contractsQuery = useQuery({
    queryKey: ['contracts', filters],
    queryFn: () =>
      apiClient<{ data: ContractRow[] }>('contracts', {
        token,
        searchParams: filters,
      }),
  });

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
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />
    </section>
  );
}
