import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { DataTable } from '@components/data/DataTable';

interface Company {
  id: string;
  ragione_sociale: string;
  sito: string;
  linkedin: string;
  geo: string;
  industry: string;
  revenue_range: string;
  owner: string;
}

interface Contact {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
  linkedin: string;
}

interface Activity {
  id: string;
  type: string;
  actor: string;
  occurred_at: string;
  description: string;
}

interface Offer {
  id: string;
  status: string;
  total: number;
  currency: string;
  version: number;
}

interface FileRow {
  id: string;
  nome: string;
  storage_url: string;
  size: number;
}

interface TaskRow {
  id: string;
  title: string;
  due_date: string;
  status: string;
}

interface ContractRow {
  id: string;
  status: string;
  signed_at?: string;
  pdf_url?: string;
}

interface InvoiceRow {
  id: string;
  status: string;
  amount: number;
  currency: string;
  pdf_url?: string;
}

const TABS = ['info', 'contacts', 'activities', 'offers', 'files', 'tasks', 'contracts', 'invoices'] as const;

export default function PortfolioDetailPage() {
  const { companyId } = useParams();
  const { token } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('info');

  const [companyQuery, contactsQuery, activitiesQuery, offersQuery, filesQuery, tasksQuery, contractsQuery, invoicesQuery] = useQueries({
    queries: [
      {
        queryKey: ['company', companyId],
        queryFn: () => apiClient<Company>(`companies/${companyId}`, { token }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['company', companyId, 'contacts'],
        queryFn: () => apiClient<{ data: Contact[] }>(`companies/${companyId}/contacts`, { token }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['activities', companyId],
        queryFn: () => apiClient<{ data: Activity[] }>('activities', { token, searchParams: { company_id: companyId } }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['offers', companyId],
        queryFn: () => apiClient<{ data: Offer[] }>('offers', { token, searchParams: { company_id: companyId } }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['files', companyId],
        queryFn: () => apiClient<{ data: FileRow[] }>('files', { token, searchParams: { company_id: companyId } }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['tasks', companyId],
        queryFn: () => apiClient<{ data: TaskRow[] }>('tasks', { token, searchParams: { company_id: companyId } }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['contracts', companyId],
        queryFn: () => apiClient<{ data: ContractRow[] }>('contracts', { token, searchParams: { company_id: companyId } }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['invoices', companyId],
        queryFn: () => apiClient<{ data: InvoiceRow[] }>('invoices', { token, searchParams: { company_id: companyId } }),
        enabled: Boolean(companyId),
      },
    ],
  });

  const company = companyQuery.data;

  const tabLabels: Record<typeof TABS[number], string> = useMemo(
    () => ({
      info: t('portfolio.detail.info'),
      contacts: t('portfolio.detail.contacts'),
      activities: t('portfolio.detail.activities'),
      offers: t('portfolio.detail.offers'),
      files: t('portfolio.detail.files'),
      tasks: t('portfolio.detail.tasks'),
      contracts: t('portfolio.detail.contracts'),
      invoices: t('portfolio.detail.invoices'),
    }),
    [t]
  );

  if (!company && !companyQuery.isLoading) {
    return <p className="text-sm text-red-600">{t('portfolio.detail.noCompany')}</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{company?.ragione_sociale}</h2>
          <p className="text-sm text-slate-500">
            {company?.industry} • {company?.geo} • {company?.revenue_range}
          </p>
        </div>
        <div className="flex gap-2 text-sm text-primary">
          {company?.sito ? (
            <a className="hover:underline" href={company.sito} target="_blank" rel="noreferrer">
              {t('portfolio.detail.website')}
            </a>
          ) : null}
          {company?.linkedin ? (
            <a className="hover:underline" href={company.linkedin} target="_blank" rel="noreferrer">
              {t('portfolio.detail.linkedin')}
            </a>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              activeTab === tab
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'info' && company ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('portfolio.detail.metrics')}</h3>
            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <dt>{t('portfolio.detail.ownerLabel')}</dt>
                <dd>{company.owner}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('filters.industry')}</dt>
                <dd>{company.industry}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('filters.geo')}</dt>
                <dd>{company.geo}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('portfolio.detail.revenue')}</dt>
                <dd>{company.revenue_range}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('portfolio.detail.activityTimeline')}</h3>
            <div className="mt-4 space-y-4">
              {activitiesQuery.data?.data?.map((activity) => (
                <div key={activity.id} className="rounded-md border border-slate-200 p-3">
                  <p className="text-xs uppercase text-slate-500">{activity.type}</p>
                  <p className="text-sm font-medium text-slate-800">{activity.description}</p>
                  <p className="text-xs text-slate-400">{new Date(activity.occurred_at).toLocaleString()}</p>
                </div>
              )) || <p className="text-sm text-slate-500">{t('tables.empty')}</p>}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'contacts' ? (
        <DataTable
          data={contactsQuery.data?.data ?? []}
          columns={[
            {
              id: 'name',
              header: t('portfolio.detail.contacts'),
              cell: (contact: Contact) => `${contact.nome} ${contact.cognome}`,
            },
            { id: 'email', header: t('labels.email'), cell: (contact: Contact) => contact.email },
            { id: 'role', header: t('labels.role'), cell: (contact: Contact) => contact.ruolo ?? '—' },
            {
              id: 'linkedin',
              header: t('labels.linkedin'),
              cell: (contact: Contact) =>
                contact.linkedin ? (
                  <a href={contact.linkedin} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                    {t('labels.linkedin')}
                  </a>
                ) : (
                  '—'
                ),
            },
          ]}
          emptyState={<span>{t('tables.empty')}</span>}
        />
      ) : null}

      {activeTab === 'offers' ? (
        <DataTable
          data={offersQuery.data?.data ?? []}
          columns={[
            { id: 'id', header: t('labels.id'), cell: (offer: Offer) => offer.id },
            { id: 'status', header: t('labels.status'), cell: (offer: Offer) => offer.status },
            { id: 'total', header: t('labels.amount'), cell: (offer: Offer) => `${offer.total} ${offer.currency}` },
            { id: 'version', header: 'Versione', cell: (offer: Offer) => offer.version },
          ]}
          emptyState={<span>{t('tables.empty')}</span>}
        />
      ) : null}

      {activeTab === 'files' ? (
        <DataTable
          data={filesQuery.data?.data ?? []}
          columns={[
            { id: 'name', header: 'Nome', cell: (file: FileRow) => file.nome },
            {
              id: 'size',
              header: 'Dimensione',
              cell: (file: FileRow) => `${(file.size / 1024).toFixed(1)} KB`,
            },
            {
              id: 'download',
              header: t('labels.download'),
              cell: (file: FileRow) => (
                <a href={file.storage_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  {t('labels.download')}
                </a>
              ),
            },
          ]}
          emptyState={<span>{t('tables.empty')}</span>}
        />
      ) : null}

      {activeTab === 'tasks' ? (
        <DataTable
          data={tasksQuery.data?.data ?? []}
          columns={[
            { id: 'title', header: 'Titolo', cell: (task: TaskRow) => task.title },
            {
              id: 'due',
              header: 'Scadenza',
              cell: (task: TaskRow) => new Date(task.due_date).toLocaleDateString(),
            },
            { id: 'status', header: t('labels.status'), cell: (task: TaskRow) => task.status },
          ]}
          emptyState={<span>{t('tables.empty')}</span>}
        />
      ) : null}

      {activeTab === 'contracts' ? (
        <DataTable
          data={contractsQuery.data?.data ?? []}
          columns={[
            { id: 'id', header: t('labels.id'), cell: (contract: ContractRow) => contract.id },
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
      ) : null}

      {activeTab === 'invoices' ? (
        <DataTable
          data={invoicesQuery.data?.data ?? []}
          columns={[
            { id: 'id', header: t('labels.id'), cell: (invoice: InvoiceRow) => invoice.id },
            { id: 'status', header: t('labels.status'), cell: (invoice: InvoiceRow) => invoice.status },
            { id: 'amount', header: t('labels.amount'), cell: (invoice: InvoiceRow) => `${invoice.amount} ${invoice.currency}` },
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
      ) : null}
    </section>
  );
}
