import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';

interface ResellerRow {
  id: string;
  name: string;
  commission_rate?: number;
}

interface CompanyRow {
  id: string;
  ragione_sociale: string;
  reseller_id: string;
}

export default function ResellersPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ reseller: '' });

  const resellersQuery = useQuery({
    queryKey: ['teams', 'reseller', filters],
    queryFn: () =>
      apiClient<{ data: ResellerRow[] }>('teams', {
        token,
        searchParams: { type: 'reseller', query: filters.reseller },
      }),
  });

  const companiesQuery = useQuery({
    queryKey: ['companies', 'byReseller'],
    queryFn: () =>
      apiClient<{ data: CompanyRow[] }>('companies', {
        token,
        searchParams: { limit: 500, reseller_id: filters.reseller },
      }),
  });

  const companiesByReseller = companiesQuery.data?.data.reduce<Record<string, CompanyRow[]>>((acc, company) => {
    if (!acc[company.reseller_id]) acc[company.reseller_id] = [];
    acc[company.reseller_id].push(company);
    return acc;
  }, {}) ?? {};

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('resellers.title')}</h2>
      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.reseller')}
          value={filters.reseller ?? ''}
          onChange={(event) => setFilters({ reseller: event.target.value })}
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
        data={resellersQuery.data?.data ?? []}
        columns={[
          { id: 'name', header: t('filters.reseller'), cell: (reseller: ResellerRow) => reseller.name },
          {
            id: 'commission',
            header: t('labels.commission'),
            cell: (reseller: ResellerRow) =>
              reseller.commission_rate ? `${reseller.commission_rate}%` : '—',
          },
          {
            id: 'companies',
            header: t('labels.clients'),
            cell: (reseller: ResellerRow) => companiesByReseller[reseller.id]?.length ?? 0,
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />
    </section>
  );
}
