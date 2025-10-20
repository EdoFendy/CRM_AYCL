import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { DataTable } from '@components/data/DataTable';
import { FiltersToolbar } from '@components/forms/FiltersToolbar';
import { usePersistentFilters } from '@hooks/usePersistentFilters';

interface AuditRow {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  created_at: string;
  correlation_id?: string;
}

export default function AuditPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ actor: '', entity: '' });

  const auditQuery = useQuery({
    queryKey: ['audit', filters],
    queryFn: () =>
      apiClient<{ data: AuditRow[] }>('audit', {
        token,
        searchParams: filters,
      }),
  });

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('audit.title')}</h2>

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('labels.actor')}
          value={filters.actor ?? ''}
          onChange={(event) => setFilters({ actor: event.target.value })}
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('labels.entity')}
          value={filters.entity ?? ''}
          onChange={(event) => setFilters({ entity: event.target.value })}
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
        data={auditQuery.data?.data ?? []}
        columns={[
          { id: 'actor', header: t('labels.actor'), cell: (row: AuditRow) => row.actor },
          { id: 'action', header: t('labels.action'), cell: (row: AuditRow) => row.action },
          { id: 'entity', header: t('labels.entity'), cell: (row: AuditRow) => `${row.entity} (${row.entity_id})` },
          {
            id: 'timestamp',
            header: t('labels.date'),
            cell: (row: AuditRow) => new Date(row.created_at).toLocaleString(),
          },
          {
            id: 'cid',
            header: t('labels.correlationId'),
            cell: (row: AuditRow) => row.correlation_id ?? '—',
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />
    </section>
  );
}
