import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface Company {
  id: string;
  ragione_sociale: string;
  website: string | null;
  linkedin: string | null;
  geo: string | null;
  industry: string | null;
  revenue_range: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
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
  actor_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  content: string | null;
  metadata?: Record<string, unknown> | null;
  occurred_at: string;
  created_at: string;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date: string | null;
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

const TABS = ['info', 'opportunities', 'contacts', 'tasks', 'contracts', 'invoices'] as const;

export default function PortfolioDetailPage() {
  const { companyId } = useParams();
  const { token } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('info');

  const [companyQuery, opportunitiesQuery, contactsQuery, activitiesQuery, offersQuery, filesQuery, tasksQuery, contractsQuery, invoicesQuery, referralsQuery, usersQuery] = useQueries({
    queries: [
      {
        queryKey: ['company', companyId],
        queryFn: () => apiClient<Company>(`companies/${companyId}`, { token }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['opportunities', companyId],
        queryFn: () => apiClient<{ data: Opportunity[] }>('opportunities', { token, searchParams: { company_id: companyId } }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['company', companyId, 'contacts'],
        queryFn: () => apiClient<{ data: Contact[] }>(`companies/${companyId}/contacts`, { token }),
        enabled: Boolean(companyId),
      },
      {
        queryKey: ['activities', companyId],
        queryFn: async () => {
          // Get both company activities and contact activities for this company
          const [companyActivities, contacts] = await Promise.all([
            apiClient<{ data: Activity[] }>('activities', { token, searchParams: { company_id: companyId } }),
            apiClient<{ data: Contact[] }>(`companies/${companyId}/contacts`, { token })
          ]);
          
          // Get activities for all contacts of this company
          const contactIds = contacts.data.map(c => c.id);
          const contactActivitiesPromises = contactIds.map(contactId =>
            apiClient<{ data: Activity[] }>('activities', { token, searchParams: { contact_id: contactId } })
          );
          
          const contactActivitiesResults = await Promise.all(contactActivitiesPromises);
          const allContactActivities = contactActivitiesResults.flatMap(result => result.data);
          
          // Combine and sort all activities by date
          const allActivities = [...companyActivities.data, ...allContactActivities]
            .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
          
          return { data: allActivities };
        },
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
      {
        queryKey: ['referrals'],
        queryFn: () => apiClient<{ data: Array<{ id: string; code: string; owner_user_id: string | null }> }>('referrals', { token }),
      },
      {
        queryKey: ['users'],
        queryFn: () => apiClient<{ data: Array<{ id: string; full_name: string; email: string }> }>('users', { token, searchParams: { limit: 1000 } }),
      },
    ],
  });

  const company = companyQuery.data;
  const opportunities = opportunitiesQuery.data?.data ?? [];
  const referrals = referralsQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];

  // Helper functions to get referrer and owner info
  const getReferrerInfo = () => {
    // Find opportunities with referral_id
    const opportunitiesWithReferrals = opportunities.filter(opp => opp.referral_id);
    if (opportunitiesWithReferrals.length === 0) return null;
    
    // Get the first referral (could be improved to handle multiple referrals)
    const firstReferralId = opportunitiesWithReferrals[0].referral_id;
    const referral = referrals.find(r => r.id === firstReferralId);
    if (!referral) return null;
    
    const referrer = users.find(u => u.id === referral.owner_user_id);
    return {
      code: referral.code,
      referrer: referrer?.full_name || referrer?.email || 'Unknown',
    };
  };

  const getCurrentOwner = () => {
    if (!company?.owner_id) return null;
    const owner = users.find(u => u.id === company.owner_id);
    return owner?.full_name || owner?.email || 'Unknown';
  };

  const tabLabels: Record<typeof TABS[number], string> = useMemo(
    () => ({
      info: t('portfolio.detail.info'),
      opportunities: 'Opportunities',
      contacts: t('portfolio.detail.contacts'),
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
      {/* Header with company info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{company?.ragione_sociale}</h2>
          <p className="text-sm text-slate-500">
            {company?.industry} • {company?.geo} • {company?.revenue_range}
          </p>
        </div>
        <div className="flex gap-2 text-sm text-primary">
          {company?.website ? (
            <a className="hover:underline" href={company.website} target="_blank" rel="noreferrer">
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

      {/* Sub-navbar for right column content */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              activeTab === tab
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Activities, Offers, Files */}
        <div className="lg:col-span-1 space-y-6">
          {/* Activities Timeline */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">{t('portfolio.detail.activities')}</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activitiesQuery.data?.data && activitiesQuery.data.data.length > 0 ? (
                activitiesQuery.data.data.map((activity: Activity) => (
                  <div key={activity.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                        {activity.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(activity.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {activity.content || '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      {activity.actor_id ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5">
                          by: {(() => {
                            const actor = users.find(u => u.id === activity.actor_id);
                            return actor?.full_name || actor?.email || 'Unknown';
                          })()}
                        </span>
                      ) : null}
                      {activity.contact_id ? (
                        <Link 
                          to={`/contacts/${activity.contact_id}`}
                          className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 hover:bg-blue-200"
                        >
                          contact
                        </Link>
                      ) : null}
                      {activity.opportunity_id ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">opportunity</span>
                      ) : null}
                    </div>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 ? (
                      <div className="mt-2 rounded bg-slate-50 p-2">
                        <p className="mb-1 text-[11px] font-semibold text-slate-500">Metadata</p>
                        <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-700">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">{t('tables.empty')}</p>
              )}
            </div>
          </div>

          {/* Offers */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">{t('portfolio.detail.offers')}</h3>
            <div className="space-y-2">
              {offersQuery.data?.data && offersQuery.data.data.length > 0 ? (
                offersQuery.data.data.map((offer) => (
                  <div key={offer.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">v{offer.version}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${offer.status === 'accepted' ? 'bg-green-100 text-green-700' : offer.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {offer.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-green-600 mt-1">
                      €{offer.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">{t('tables.empty')}</p>
              )}
            </div>
          </div>

          {/* Files */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">{t('portfolio.detail.files')}</h3>
            <div className="space-y-2">
              {filesQuery.data?.data && filesQuery.data.data.length > 0 ? (
                filesQuery.data.data.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 rounded border border-slate-200">
                    <span className="text-sm text-slate-800 truncate">{file.nome}</span>
                    <a href={file.storage_url} className="text-xs text-primary hover:underline" target="_blank" rel="noreferrer">
                      {t('labels.download')}
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">{t('tables.empty')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Info based on active tab */}
        <div className="lg:col-span-2">
          {activeTab === 'info' && company ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt className="font-medium">ID</dt>
                  <dd className="font-mono text-slate-700">{company.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Current Owner</dt>
                  <dd className="text-slate-900 font-medium">{getCurrentOwner() || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">{t('filters.industry')}</dt>
                  <dd>{company.industry}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">{t('filters.geo')}</dt>
                  <dd>{company.geo}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">{t('portfolio.detail.revenue')}</dt>
                  <dd>{company.revenue_range}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">{t('portfolio.detail.website')}</dt>
                  <dd>
                    {company.website ? (
                      <a href={company.website} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                        {company.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">{t('labels.linkedin')}</dt>
                  <dd>
                    {company.linkedin ? (
                      <a href={company.linkedin} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                        LinkedIn Profile
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Created</dt>
                  <dd>{new Date(company.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Updated</dt>
                  <dd>{new Date(company.updated_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Referrer</dt>
                  <dd>
                    {(() => {
                      const referrerInfo = getReferrerInfo();
                      if (!referrerInfo) return '—';
                      return (
                        <div>
                          <span className="text-slate-900 font-medium">{referrerInfo.referrer}</span>
                          <div className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded mt-1 inline-block">
                            Code: {referrerInfo.code}
                          </div>
                        </div>
                      );
                    })()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Opportunities</dt>
                  <dd className="text-slate-900 font-medium">
                    {opportunities.length > 0 ? `${opportunities.length} active` : 'None'}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {activeTab === 'opportunities' ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Opportunities</h3>
              <DataTable
                data={opportunitiesQuery.data?.data ?? []}
                columns={[
                  { id: 'title', header: 'Title', cell: (opp: Opportunity) => opp.title },
                  {
                    id: 'value',
                    header: 'Value',
                    cell: (opp: Opportunity) => `€${opp.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  },
                  { id: 'stage', header: 'Stage', cell: (opp: Opportunity) => opp.stage },
                  { id: 'probability', header: 'Probability', cell: (opp: Opportunity) => `${opp.probability}%` },
                  {
                    id: 'expected_close',
                    header: 'Expected Close',
                    cell: (opp: Opportunity) =>
                      opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '—',
                  },
                ]}
                emptyState={<span>{t('tables.empty')}</span>}
              />
            </div>
          ) : null}

          {activeTab === 'contacts' ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Contacts</h3>
              <DataTable
                data={contactsQuery.data?.data ?? []}
                columns={[
                  {
                    id: 'name',
                    header: t('portfolio.detail.contacts'),
                    cell: (contact: Contact) => (
                      <Link 
                        to={`/contacts/${contact.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {contact.first_name} {contact.last_name}
                      </Link>
                    ),
                  },
                  { id: 'email', header: t('labels.email'), cell: (contact: Contact) => contact.email || '—' },
                  { id: 'phone', header: 'Phone', cell: (contact: Contact) => contact.phone || '—' },
                  { id: 'role', header: t('labels.role'), cell: (contact: Contact) => contact.role ?? '—' },
                  {
                    id: 'linkedin',
                    header: t('labels.linkedin'),
                    cell: (contact: Contact) =>
                      contact.linkedin ? (
                        <a href={contact.linkedin} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                          Profile
                        </a>
                      ) : (
                        '—'
                      ),
                  },
                ]}
                emptyState={<span>{t('tables.empty')}</span>}
              />
            </div>
          ) : null}

          {activeTab === 'tasks' ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Tasks</h3>
              <DataTable
                data={tasksQuery.data?.data ?? []}
                columns={[
                  { id: 'title', header: 'Title', cell: (task: TaskRow) => task.title },
                  {
                    id: 'due',
                    header: 'Due Date',
                    cell: (task: TaskRow) => task.due_date ? new Date(task.due_date).toLocaleDateString() : '—',
                  },
                  { id: 'status', header: t('labels.status'), cell: (task: TaskRow) => task.status },
                  { id: 'priority', header: 'Priority', cell: (task: TaskRow) => task.priority },
                ]}
                emptyState={<span>{t('tables.empty')}</span>}
              />
            </div>
          ) : null}

          {activeTab === 'contracts' ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Contracts</h3>
              <DataTable
                data={contractsQuery.data?.data ?? []}
                columns={[
                  { id: 'id', header: t('labels.id'), cell: (contract: ContractRow) => contract.id },
                  { id: 'status', header: t('labels.status'), cell: (contract: ContractRow) => contract.status },
                  {
                    id: 'signed_at',
                    header: 'Signed',
                    cell: (contract: ContractRow) => (contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : '—'),
                  },
                  {
                    id: 'pdf',
                    header: t('labels.download'),
                    cell: (contract: ContractRow) =>
                      contract.pdf_url ? (
                        <a href={contract.pdf_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                          Download
                        </a>
                      ) : (
                        '—'
                      ),
                  },
                ]}
                emptyState={<span>{t('tables.empty')}</span>}
              />
            </div>
          ) : null}

          {activeTab === 'invoices' ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoices</h3>
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
                          Download
                        </a>
                      ) : (
                        '—'
                      ),
                  },
                ]}
                emptyState={<span>{t('tables.empty')}</span>}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
