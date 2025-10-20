import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  linkedin: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
  website: string | null;
  linkedin: string | null;
  geo: string | null;
  industry: string | null;
  revenue_range: string | null;
  owner_id: string | null;
}

interface Activity {
  id: string;
  type: string;
  actor_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  content: string | null;
  metadata: any;
  occurred_at: string;
  created_at: string;
}

interface Opportunity {
  id: string;
  company_id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  owner_id: string | null;
  expected_close_date: string | null;
  source: string | null;
  referral_id: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  owner_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  status: string;
  priority: string;
  completed_at: string | null;
}

interface FileRow {
  id: string;
  nome: string;
  size: number;
  storage_url: string;
  company_id: string | null;
  contact_id: string | null;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

const TABS = ['info', 'opportunities', 'tasks', 'files'] as const;

export default function ContactDetailPage() {
  const { contactId } = useParams();
  const { token } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('info');

  const [contactQuery, companyQuery, activitiesQuery, opportunitiesQuery, tasksQuery, filesQuery, usersQuery] = useQueries({
    queries: [
      {
        queryKey: ['contact', contactId],
        queryFn: () => apiClient<Contact>(`contacts/${contactId}`, { token }),
        enabled: Boolean(contactId),
      },
      {
        queryKey: ['contact', contactId, 'company'],
        queryFn: async () => {
          const contact = await apiClient<Contact>(`contacts/${contactId}`, { token });
          return apiClient<Company>(`companies/${contact.company_id}`, { token });
        },
        enabled: Boolean(contactId),
      },
      {
        queryKey: ['activities', 'contact', contactId],
        queryFn: () => apiClient<{ data: Activity[] }>('activities', { 
          token, 
          searchParams: { contact_id: contactId } 
        }),
        enabled: Boolean(contactId),
      },
      {
        queryKey: ['opportunities', 'contact', contactId],
        queryFn: async () => {
          const contact = await apiClient<Contact>(`contacts/${contactId}`, { token });
          return apiClient<{ data: Opportunity[] }>('opportunities', { 
            token, 
            searchParams: { company_id: contact.company_id } 
          });
        },
        enabled: Boolean(contactId),
      },
      {
        queryKey: ['tasks', 'contact', contactId],
        queryFn: () => apiClient<{ data: TaskRow[] }>('tasks', { 
          token, 
          searchParams: { contact_id: contactId } 
        }),
        enabled: Boolean(contactId),
      },
      {
        queryKey: ['files', 'contact', contactId],
        queryFn: () => apiClient<{ data: FileRow[] }>('files', { 
          token, 
          searchParams: { contact_id: contactId } 
        }),
        enabled: Boolean(contactId),
      },
      {
        queryKey: ['users'],
        queryFn: () => apiClient<{ data: User[] }>('users', { token, searchParams: { limit: 1000 } }),
      },
    ],
  });

  const contact = contactQuery.data;
  const company = companyQuery.data;
  const activities = activitiesQuery.data?.data ?? [];
  const opportunities = opportunitiesQuery.data?.data ?? [];
  const tasks = tasksQuery.data?.data ?? [];
  const files = filesQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];

  const tabLabels: Record<typeof TABS[number], string> = useMemo(
    () => ({
      info: 'Contact Info',
      opportunities: 'Related Opportunities',
      tasks: 'Tasks',
      files: 'Files',
    }),
    []
  );

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return '—';
    const owner = users.find(u => u.id === ownerId);
    return owner?.full_name || owner?.email || '—';
  };

  if (!contact) {
    return (
      <section className="space-y-6">
        <div className="text-center">
          <p className="text-slate-500">Loading contact...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header with contact info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {contact.first_name} {contact.last_name}
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {contact.role && <span>{contact.role}</span>}
            {contact.role && company && <span>•</span>}
            {company && (
              <Link 
                to={`/portfolio/${company.id}`} 
                className="text-primary hover:underline"
              >
                {company.ragione_sociale}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          {contact.email && (
            <a 
              className="text-primary hover:underline" 
              href={`mailto:${contact.email}`}
            >
              Email
            </a>
          )}
          {contact.phone && (
            <a 
              className="text-primary hover:underline" 
              href={`tel:${contact.phone}`}
            >
              Call
            </a>
          )}
          {contact.linkedin && (
            <a 
              className="text-primary hover:underline" 
              href={contact.linkedin} 
              target="_blank" 
              rel="noreferrer"
            >
              LinkedIn
            </a>
          )}
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
        {/* Left Column: Activities Timeline */}
        <div className="lg:col-span-1 space-y-6">
          {/* Activities Timeline */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Activity Timeline</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activities.length > 0 ? (
                activities.map((activity: Activity) => (
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
                      {activity.actor_id && (
                        <span className="rounded bg-slate-100 px-2 py-0.5">
                          by: {getOwnerName(activity.actor_id)}
                        </span>
                      )}
                      {activity.opportunity_id && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">
                          opportunity
                        </span>
                      )}
                    </div>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 rounded bg-slate-50 p-2">
                        <p className="mb-1 text-[11px] font-semibold text-slate-500">Details</p>
                        {activity.type === 'call' && activity.metadata.duration_seconds && (
                          <p className="text-[11px] text-slate-700">
                            Duration: {Math.floor(activity.metadata.duration_seconds / 60)}m {activity.metadata.duration_seconds % 60}s
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No activities recorded yet</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Activities</span>
                <span className="text-sm font-semibold text-slate-900">{activities.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Related Opportunities</span>
                <span className="text-sm font-semibold text-slate-900">{opportunities.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Open Tasks</span>
                <span className="text-sm font-semibold text-slate-900">
                  {tasks.filter(t => t.status !== 'done').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Files</span>
                <span className="text-sm font-semibold text-slate-900">{files.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Info based on active tab */}
        <div className="lg:col-span-2">
          {activeTab === 'info' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt className="font-medium">Full Name</dt>
                  <dd className="text-slate-900 font-medium">
                    {contact.first_name} {contact.last_name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Email</dt>
                  <dd>
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Phone</dt>
                  <dd>
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                        {contact.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Role</dt>
                  <dd className="text-slate-900">{contact.role || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">LinkedIn</dt>
                  <dd>
                    {contact.linkedin ? (
                      <a href={contact.linkedin} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                        Profile
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Owner</dt>
                  <dd className="text-slate-900 font-medium">{getOwnerName(contact.owner_id)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Company</dt>
                  <dd>
                    {company ? (
                      <Link to={`/portfolio/${company.id}`} className="text-primary hover:underline">
                        {company.ragione_sociale}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Industry</dt>
                  <dd>{company?.industry || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Created</dt>
                  <dd>{new Date(contact.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Updated</dt>
                  <dd>{new Date(contact.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Related Opportunities</h3>
              <DataTable
                data={opportunities}
                columns={[
                  { id: 'title', header: 'Title', cell: (opp: Opportunity) => opp.title },
                  {
                    id: 'value',
                    header: 'Value',
                    cell: (opp: Opportunity) => `€${opp.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  },
                  { 
                    id: 'stage', 
                    header: 'Stage', 
                    cell: (opp: Opportunity) => (
                      <span className="rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                        {opp.stage}
                      </span>
                    )
                  },
                  { id: 'probability', header: 'Probability', cell: (opp: Opportunity) => `${opp.probability}%` },
                  {
                    id: 'expected_close',
                    header: 'Expected Close',
                    cell: (opp: Opportunity) =>
                      opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '—',
                  },
                ]}
                emptyState={<span>No opportunities found</span>}
              />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Tasks</h3>
              <DataTable
                data={tasks}
                columns={[
                  { id: 'title', header: 'Title', cell: (task: TaskRow) => task.title },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (task: TaskRow) => (
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        task.status === 'done' 
                          ? 'bg-green-100 text-green-700' 
                          : task.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {task.status}
                      </span>
                    )
                  },
                  { 
                    id: 'priority', 
                    header: 'Priority', 
                    cell: (task: TaskRow) => (
                      <span className={`text-xs font-medium ${
                        task.priority === 'urgent' 
                          ? 'text-red-600' 
                          : task.priority === 'high'
                          ? 'text-orange-600'
                          : task.priority === 'medium'
                          ? 'text-blue-600'
                          : 'text-slate-600'
                      }`}>
                        {task.priority}
                      </span>
                    )
                  },
                  {
                    id: 'due_date',
                    header: 'Due Date',
                    cell: (task: TaskRow) => task.due_date ? new Date(task.due_date).toLocaleDateString() : '—',
                  },
                ]}
                emptyState={<span>No tasks assigned</span>}
              />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Files</h3>
              <DataTable
                data={files}
                columns={[
                  { id: 'name', header: 'Name', cell: (file: FileRow) => file.nome },
                  {
                    id: 'size',
                    header: 'Size',
                    cell: (file: FileRow) => `${(file.size / 1024).toFixed(1)} KB`,
                  },
                  {
                    id: 'download',
                    header: 'Download',
                    cell: (file: FileRow) => (
                      <a href={file.storage_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                        Download
                      </a>
                    ),
                  },
                ]}
                emptyState={<span>No files uploaded</span>}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
