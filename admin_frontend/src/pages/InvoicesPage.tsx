import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { DataTable } from '@components/data/DataTable';
import { FiltersToolbar } from '@components/forms/FiltersToolbar';
import { usePersistentFilters } from '@hooks/usePersistentFilters';

interface InvoiceRow {
  id: string;
  status: string;
  amount: number;
  currency: string;
  company_id: string;
  pdf_url?: string;
}

export default function InvoicesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', company_id: '' });

  const invoicesQuery = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () =>
      apiClient<{ data: InvoiceRow[] }>('invoices', {
        token,
        searchParams: filters,
      }),
  });

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('invoices.title')}</h2>
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
        data={invoicesQuery.data?.data ?? []}
        columns={[
          { id: 'id', header: t('labels.id'), cell: (invoice: InvoiceRow) => invoice.id },
          { id: 'company', header: t('labels.company'), cell: (invoice: InvoiceRow) => invoice.company_id },
          { id: 'status', header: t('labels.status'), cell: (invoice: InvoiceRow) => invoice.status },
          {
            id: 'amount',
            header: t('labels.amount'),
            cell: (invoice: InvoiceRow) => `${invoice.amount} ${invoice.currency}`,
          },
          {
            id: 'pdf',
            header: t('labels.download'),
            cell: (invoice: InvoiceRow) =>
              invoice.pdf_url ? (
                <a href={invoice.pdf_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  {t('portfolio.detail.downloadInvoice')}
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
