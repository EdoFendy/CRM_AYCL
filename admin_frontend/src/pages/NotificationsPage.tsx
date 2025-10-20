import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  payload: any;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<{ data: NotificationRow[] }>('notifications', { token });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`notifications/${id}/read`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const rows = notificationsQuery.data?.data ?? [];
  const unreadCount = rows.filter((notif) => !notif.read_at).length;

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Notifications</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Unread</p>
          <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={[
          {
            id: 'type',
            header: 'Type',
            cell: (notif) => (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${notif.read_at ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>
                {notif.type}
              </span>
            ),
          },
          {
            id: 'message',
            header: 'Message',
            cell: (notif) => (
              <div className="max-w-md">
                <p className={notif.read_at ? 'text-slate-600' : 'font-medium text-slate-900'}>
                  {typeof notif.payload === 'object' ? JSON.stringify(notif.payload).substring(0, 100) : notif.payload}
                </p>
              </div>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (notif) => notif.read_at ? (
              <span className="text-xs text-slate-500">Read</span>
            ) : (
              <span className="text-xs font-medium text-blue-600">Unread</span>
            ),
          },
          { id: 'created', header: 'Created', cell: (notif) => new Date(notif.created_at).toLocaleString() },
          {
            id: 'actions',
            header: 'Actions',
            cell: (notif) => !notif.read_at ? (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => markReadMutation.mutate(notif.id)}
              >
                Mark as Read
              </button>
            ) : null,
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

