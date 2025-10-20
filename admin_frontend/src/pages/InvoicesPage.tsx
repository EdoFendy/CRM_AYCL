import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

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
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '', company_id: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [workflowInvoice, setWorkflowInvoice] = useState<InvoiceRow | null>(null);
  const [workflowAction, setWorkflowAction] = useState<'send' | 'paid' | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () =>
      apiClient<{ data: InvoiceRow[] }>('invoices', {
        token,
        searchParams: filters,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`invoices/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeletingId(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient(`invoices/${id}`, {
        method: 'PATCH',
        token,
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setWorkflowInvoice(null);
      setWorkflowAction(null);
    },
  });

  const handleWorkflowAction = () => {
    if (!workflowInvoice || !workflowAction) return;
    const statusMap = { send: 'sent', paid: 'paid' };
    updateStatusMutation.mutate({ id: workflowInvoice.id, status: statusMap[workflowAction] });
  };

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
          {
            id: 'actions',
            header: 'Actions',
            cell: (invoice: InvoiceRow) => (
              <div className="flex gap-2 flex-wrap">
                {invoice.status === 'draft' && (
                  <button
                    onClick={() => {
                      setWorkflowInvoice(invoice);
                      setWorkflowAction('send');
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Send
                  </button>
                )}
                {invoice.status === 'sent' && (
                  <button
                    onClick={() => {
                      setWorkflowInvoice(invoice);
                      setWorkflowAction('paid');
                    }}
                    className="text-sm text-green-600 hover:underline"
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  onClick={() => setDeletingId(invoice.id)}
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

      <ConfirmDialog
        isOpen={workflowInvoice !== null && workflowAction !== null}
        onClose={() => {
          setWorkflowInvoice(null);
          setWorkflowAction(null);
        }}
        onConfirm={handleWorkflowAction}
        title={`${workflowAction === 'send' ? 'Send' : 'Mark as Paid'} Invoice`}
        message={`Are you sure you want to ${workflowAction === 'send' ? 'send' : 'mark as paid'} this invoice?`}
        confirmVariant="primary"
        isLoading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice?"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
