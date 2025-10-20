import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '@context/AuthContext';
import { usePersistentFilters } from '@hooks/usePersistentFilters';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { FiltersToolbar } from '@components/forms/FiltersToolbar';
import { StatsCard } from '@components/data/StatsCard';

interface MetricsResponse {
  revenue: number;
  mrr: number;
  winRate: number;
  salesCycle: number;
  pipelineByStage: Array<{ stage: string; value: number }>;
}

interface ContractsResponse {
  data: Array<{ id: string; status: string }>;
}

interface InvoicesResponse {
  data: Array<{ id: string; amount: number; status: string; currency: string }>;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { filters, setFilters, resetFilters } = usePersistentFilters({
    period: 'last_90_days',
    line: '',
    seller: '',
    reseller: '',
    industry: '',
    geo: '',
  });

  const metricsQuery = useQuery({
    queryKey: ['dashboard', 'metrics', filters],
    queryFn: async () =>
      apiClient<MetricsResponse>('opportunities/metrics', {
        token,
        searchParams: filters,
      }),
  });

  const contractsQuery = useQuery({
    queryKey: ['dashboard', 'contracts', filters],
    queryFn: async () =>
      apiClient<ContractsResponse>('contracts', {
        token,
        searchParams: { ...filters, status: 'pending,signed' },
      }),
  });

  const invoicesQuery = useQuery({
    queryKey: ['dashboard', 'invoices', filters],
    queryFn: async () =>
      apiClient<InvoicesResponse>('invoices', {
        token,
        searchParams: { ...filters, summary: 'true' },
      }),
  });

  const pendingContracts = contractsQuery.data?.data.filter((c) => c.status === 'pending').length ?? 0;
  const signedContracts = contractsQuery.data?.data.filter((c) => c.status === 'signed').length ?? 0;
  const totalRevenue = useMemo(() => {
    if (!invoicesQuery.data?.data) return 0;
    return invoicesQuery.data.data.reduce((acc, invoice) => acc + invoice.amount, 0);
  }, [invoicesQuery.data?.data]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{t('dashboard.title')}</h2>
          <p className="text-sm text-slate-500">{format(new Date(), 'PPPP')}</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          onClick={() => {
            // TODO: map filters to report export payload once requirements are available
            apiClient('reports/export', {
              method: 'POST',
              body: {
                format: 'xlsx',
                filters,
                scope: 'dashboard',
              },
              token,
            });
          }}
        >
          {t('dashboard.reports.export')}
        </button>
      </div>

      <FiltersToolbar>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.period ?? ''}
          onChange={(event) => setFilters({ period: event.target.value })}
        >
          <option value="last_30_days">30 giorni</option>
          <option value="last_90_days">90 giorni</option>
          <option value="ytd">Year to date</option>
        </select>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.line')}
          value={filters.line ?? ''}
          onChange={(event) => setFilters({ line: event.target.value })}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.seller')}
          value={filters.seller ?? ''}
          onChange={(event) => setFilters({ seller: event.target.value })}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.reseller')}
          value={filters.reseller ?? ''}
          onChange={(event) => setFilters({ reseller: event.target.value })}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title={t('dashboard.kpi.revenue')} value={totalRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} />
        <StatsCard title={t('dashboard.kpi.mrr')} value={(metricsQuery.data?.mrr ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} />
        <StatsCard title={t('dashboard.kpi.contractsSigned')} value={signedContracts} />
        <StatsCard title={t('dashboard.kpi.contractsPending')} value={pendingContracts} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard title={t('dashboard.metrics.winRate')} value={`${metricsQuery.data?.winRate ?? 0}%`} />
        <StatsCard title={t('dashboard.metrics.salesCycle')} value={`${metricsQuery.data?.salesCycle ?? 0} giorni`} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('dashboard.pipeline.title')}
        </h3>
        <div className="mt-4 space-y-3">
          {metricsQuery.data?.pipelineByStage?.map((stage) => (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span>{stage.stage}</span>
                <span>{stage.value}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.min(100, stage.value)}%` }}
                ></div>
              </div>
            </div>
          )) || <p className="text-sm text-slate-500">{t('tables.empty')}</p>}
        </div>
      </div>

      {metricsQuery.isError || contractsQuery.isError || invoicesQuery.isError ? (
        <p className="text-sm text-red-600">
          {(metricsQuery.error as Error)?.message || (contractsQuery.error as Error)?.message || (invoicesQuery.error as Error)?.message}
        </p>
      ) : null}
    </section>
  );
}
