import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient, PaginatedResponse } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { useCursorPagination } from '../hooks/useCursorPagination';
import { PaginationControls } from '../components/navigation/PaginationControls';

interface ActivityRow {
  id: string;
  type: string;
  actor_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  content: string | null;
  occurred_at: string;
  created_at: string;
}

const ACTIVITY_TYPES = [
  { value: 'email', label: 'Email', icon: '📧', color: 'bg-blue-100 text-blue-700' },
  { value: 'call', label: 'Call', icon: '📞', color: 'bg-green-100 text-green-700' },
  { value: 'meeting', label: 'Meeting', icon: '🤝', color: 'bg-purple-100 text-purple-700' },
  { value: 'note', label: 'Note', icon: '📝', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'system', label: 'System', icon: '⚙️', color: 'bg-slate-100 text-slate-700' },
];

export default function ActivitiesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const pagination = useCursorPagination();
  const { filters, setFilters, resetFilters } = usePersistentFilters({
    type: '',
    query: '',
  });
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ['activities', filters, pagination.cursor, pagination.limit],
    [filters, pagination.cursor, pagination.limit]
  );

  const activitiesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<PaginatedResponse<ActivityRow>>('activities', {
          token,
          searchParams: {
            ...filters,
            limit: pagination.limit,
            cursor: pagination.cursor,
          },
        });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    keepPreviousData: true,
  });

  const rows = activitiesQuery.data?.data ?? [];
  const pageInfo = activitiesQuery.data?.pageInfo;

  const getTypeInfo = (type: string) => {
    return ACTIVITY_TYPES.find((t) => t.value === type) || ACTIVITY_TYPES[4];
  };

  const metrics = useMemo(() => {
    const byType = ACTIVITY_TYPES.map((type) => ({
      type: type.label,
      icon: type.icon,
      count: rows.filter((activity) => activity.type === type.value).length,
    }));

    return { byType };
  }, [rows]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Activities Timeline</h2>
      </div>

      {/* Summary Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium text-slate-500">Total Activities</p>
        <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
      </div>

      {/* Activity Type Breakdown */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Activity Breakdown</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {metrics.byType.map((item) => (
            <div key={item.type}>
              <p className="text-2xl">{item.icon}</p>
              <p className="text-xs text-slate-500">{item.type}</p>
              <p className="text-lg font-bold text-slate-900">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <FiltersToolbar>
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search activities..."
          value={filters.query ?? ''}
          onChange={(event) => setFilters({ query: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.type ?? ''}
          onChange={(event) => setFilters({ type: event.target.value })}
        >
          <option value="">All Types</option>
          {ACTIVITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={resetFilters}>
          {t('forms.reset')}
        </button>
      </FiltersToolbar>

      {/* Timeline View */}
      <div className="space-y-3">
        {rows.map((activity) => {
          const typeInfo = getTypeInfo(activity.type);
          return (
            <div key={activity.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-full px-3 py-1 text-lg ${typeInfo.color}`}>{typeInfo.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(activity.occurred_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {activity.content && <p className="mt-2 text-sm text-slate-700">{activity.content}</p>}
                  <div className="mt-2 flex gap-2 text-xs text-slate-500">
                    {activity.company_id && <span>Company: {activity.company_id.substring(0, 8)}...</span>}
                    {activity.contact_id && <span>Contact: {activity.contact_id.substring(0, 8)}...</span>}
                    {activity.opportunity_id && <span>Opportunity: {activity.opportunity_id.substring(0, 8)}...</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alternative Table View */}
      <DataTable
        data={rows}
        columns={[
          {
            id: 'type',
            header: 'Type',
            cell: (activity) => {
              const typeInfo = getTypeInfo(activity.type);
              return (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${typeInfo.color}`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
              );
            },
          },
          {
            id: 'content',
            header: 'Content',
            cell: (activity) => (
              <div className="max-w-md truncate text-sm text-slate-700">{activity.content || '—'}</div>
            ),
          },
          {
            id: 'occurred',
            header: 'Occurred At',
            cell: (activity) => new Date(activity.occurred_at).toLocaleString(),
          },
          {
            id: 'entities',
            header: 'Related To',
            cell: (activity) => (
              <div className="text-xs text-slate-500">
                {activity.company_id && <div>Company</div>}
                {activity.contact_id && <div>Contact</div>}
                {activity.opportunity_id && <div>Opportunity</div>}
              </div>
            ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      <PaginationControls
        hasNext={Boolean(pageInfo?.hasNextPage)}
        hasPrevious={Boolean(pageInfo?.hasPreviousPage)}
        onNext={() => pagination.update({ cursor: pageInfo?.nextCursor ?? undefined })}
        onPrevious={() => pagination.update({ cursor: pageInfo?.prevCursor ?? undefined })}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

