import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useCursorPagination } from '@hooks/useCursorPagination';
import { usePersistentFilters } from '@hooks/usePersistentFilters';
import { useI18n } from '@i18n/I18nContext';
import { apiClient, PaginatedResponse } from '@utils/apiClient';
import { DataTable } from '@components/data/DataTable';
import { FiltersToolbar } from '@components/forms/FiltersToolbar';
import { PaginationControls } from '@components/navigation/PaginationControls';

interface CompanyRow {
  id: string;
  ragione_sociale: string;
  industry: string;
  geo: string;
  owner: string;
}

export default function PortfolioListPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const pagination = useCursorPagination();
  const { filters, setFilters, resetFilters } = usePersistentFilters({
    query: '',
    owner: '',
    industry: '',
    geo: '',
  });
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(() => ['companies', filters, pagination.cursor, pagination.limit], [filters, pagination.cursor, pagination.limit]);

  const companiesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<PaginatedResponse<CompanyRow>>('companies', {
          token,
          searchParams: {
            ...filters,
            limit: pagination.limit,
            cursor: pagination.cursor,
          },
        });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    keepPreviousData: true,
  });

  const rows = companiesQuery.data?.data ?? [];
  const pageInfo = companiesQuery.data?.pageInfo;

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('portfolio.title')}</h2>

      <FiltersToolbar>
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('portfolio.filters.companyQuery')}
          value={filters.query ?? ''}
          onChange={(event) => setFilters({ query: event.target.value })}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.owner')}
          value={filters.owner ?? ''}
          onChange={(event) => setFilters({ owner: event.target.value })}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.industry')}
          value={filters.industry ?? ''}
          onChange={(event) => setFilters({ industry: event.target.value })}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.geo')}
          value={filters.geo ?? ''}
          onChange={(event) => setFilters({ geo: event.target.value })}
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
        data={rows}
        columns={[
          {
            id: 'name',
            header: t('portfolio.detail.info'),
            cell: (company) => (
              <Link to={`/portfolio/${company.id}`} className="text-primary hover:underline">
                {company.ragione_sociale}
              </Link>
            ),
          },
          { id: 'industry', header: t('filters.industry'), cell: (company) => company.industry || '—' },
          { id: 'geo', header: t('filters.geo'), cell: (company) => company.geo || '—' },
          { id: 'owner', header: t('filters.owner'), cell: (company) => company.owner || '—' },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      <PaginationControls
        hasNext={Boolean(pageInfo?.hasNextPage)}
        hasPrevious={Boolean(pageInfo?.hasPreviousPage)}
        onNext={() => pagination.update({ cursor: pageInfo?.nextCursor ?? undefined })}
        onPrevious={() => pagination.update({ cursor: pageInfo?.prevCursor ?? undefined })}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
