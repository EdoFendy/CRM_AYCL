import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { StatusBadge } from '../components/ui/StatusBadge';

interface PaymentRow {
  id: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  invoice_id?: string;
}

export default function PaymentsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', provider: '' });

  const paymentsQuery = useQuery({
    queryKey: ['payments', filters],
    queryFn: () =>
      apiClient<{ data: PaymentRow[] }>('payments', {
        token,
        searchParams: filters,
      }),
  });

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('payments.title')}</h2>

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.status')}
          value={filters.status ?? ''}
          onChange={(event) => setFilters({ status: event.target.value })}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('filters.provider')}
          value={filters.provider ?? ''}
          onChange={(event) => setFilters({ provider: event.target.value })}
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
        data={paymentsQuery.data?.data ?? []}
        columns={[
          { id: 'id', header: t('labels.id'), cell: (payment: PaymentRow) => payment.id.substring(0, 8) + '...' },
          {
            id: 'status',
            header: t('labels.status'),
            cell: (payment: PaymentRow) => <StatusBadge status={payment.status} />,
          },
          { id: 'provider', header: t('labels.provider'), cell: (payment: PaymentRow) => payment.provider },
          {
            id: 'amount',
            header: t('labels.amount'),
            cell: (payment: PaymentRow) => `€${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${payment.currency}`,
          },
          {
            id: 'invoice',
            header: t('invoices.title'),
            cell: (payment: PaymentRow) =>
              payment.invoice_id ? (
                <Link to={`/invoices?id=${payment.invoice_id}`} className="text-primary hover:underline">
                  {payment.invoice_id.substring(0, 8)}...
                </Link>
              ) : (
                '—'
              ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />
    </section>
  );
}
