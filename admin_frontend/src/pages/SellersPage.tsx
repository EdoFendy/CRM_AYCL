import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { DataTable } from '@components/data/DataTable';
import { FiltersToolbar } from '@components/forms/FiltersToolbar';
import { usePersistentFilters } from '@hooks/usePersistentFilters';

interface SellerRow {
  id: string;
  email: string;
  name: string;
  team?: string;
}

interface SellerMetrics {
  collected: number;
  pending: number;
  activeProposals: number;
  activeContacts: number;
}

export default function SellersPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ seller: '' });

  const sellersQuery = useQuery({
    queryKey: ['users', 'seller', filters],
    queryFn: () =>
      apiClient<{ data: SellerRow[] }>('users', {
        token,
        searchParams: { role: 'seller', query: filters.seller },
      }),
  });

  const metricsQuery = useQuery({
    queryKey: ['sellers', 'metrics', filters],
    queryFn: async () => {
      const [invoices] = await Promise.all([
        apiClient<{ data: Array<{ owner: string; amount: number; status: string }> }>('invoices', {
          token,
          searchParams: { owner: filters.seller },
        }),
        // TODO: includere metriche da /opportunities e /contacts quando disponibili
      ]);

      return invoices.data.reduce<Record<string, SellerMetrics>>((acc, invoice) => {
        if (!acc[invoice.owner]) {
          acc[invoice.owner] = { collected: 0, pending: 0, activeProposals: 0, activeContacts: 0 };
        }
        if (invoice.status === 'paid') {
          acc[invoice.owner].collected += invoice.amount;
        } else {
          acc[invoice.owner].pending += invoice.amount;
        }
        return acc;
      }, {});
    },
  });

  const sellers = sellersQuery.data?.data ?? [];
  const metrics = metricsQuery.data ?? {};

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('sellers.title')}</h2>
      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.seller')}
          value={filters.seller ?? ''}
          onChange={(event) => setFilters({ seller: event.target.value })}
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
        data={sellers}
        columns={[
          { id: 'name', header: t('filters.seller'), cell: (seller: SellerRow) => seller.name || seller.email },
          { id: 'team', header: t('labels.team'), cell: (seller: SellerRow) => seller.team ?? '—' },
          {
            id: 'collected',
            header: t('sellers.metrics.collected'),
            cell: (seller: SellerRow) => (metrics[seller.id]?.collected ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
          },
          {
            id: 'pending',
            header: t('sellers.metrics.pending'),
            cell: (seller: SellerRow) => (metrics[seller.id]?.pending ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
          },
          {
            id: 'activeProposals',
            header: t('sellers.metrics.activeProposals'),
            cell: (seller: SellerRow) => metrics[seller.id]?.activeProposals ?? 0,
          },
          {
            id: 'activeContacts',
            header: t('sellers.metrics.activeContacts'),
            cell: (seller: SellerRow) => metrics[seller.id]?.activeContacts ?? 0,
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />
    </section>
  );
}
