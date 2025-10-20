import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  event: string;
  status: string;
  created_at: string;
}

export default function WebhooksPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const webhooksQuery = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<{ data: WebhookRow[] }>('webhooks', { token });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
  });

  const rows = webhooksQuery.data?.data ?? [];
  const activeCount = rows.filter((webhook) => webhook.status === 'active').length;

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Webhooks</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Webhooks</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={[
          { id: 'name', header: 'Name', cell: (webhook) => webhook.name },
          { id: 'event', header: 'Event', cell: (webhook) => <code className="rounded bg-slate-100 px-2 py-1 text-xs">{webhook.event}</code> },
          { id: 'url', header: 'URL', cell: (webhook) => <code className="text-xs text-slate-600">{webhook.url}</code> },
          {
            id: 'status',
            header: 'Status',
            cell: (webhook) => (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${webhook.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                {webhook.status}
              </span>
            ),
          },
          { id: 'created', header: 'Created', cell: (webhook) => new Date(webhook.created_at).toLocaleDateString() },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

