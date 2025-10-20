import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';

interface ReportJob {
  id: string;
  scope: string;
  format: string;
  status: string;
  file_url?: string;
  created_at: string;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient<{ data: ReportJob[] }>('reports', { token }),
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      apiClient<ReportJob>('reports/export', {
        method: 'POST',
        token,
        body: { format, scope: 'admin-dashboard' },
      }),
    onSuccess: () => reportsQuery.refetch(),
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">{t('reports.title')}</h2>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={format}
            onChange={(event) => setFormat(event.target.value as any)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {t('reports.actions.create')}
          </button>
        </div>
      </div>

      <DataTable
        data={reportsQuery.data?.data ?? []}
        columns={[
          { id: 'id', header: t('labels.id'), cell: (report: ReportJob) => report.id },
          { id: 'scope', header: t('labels.scope'), cell: (report: ReportJob) => report.scope },
          { id: 'format', header: t('labels.format'), cell: (report: ReportJob) => report.format?.toUpperCase() || '—' },
          { id: 'status', header: t('labels.status'), cell: (report: ReportJob) => <StatusBadge status={report.status} /> },
          {
            id: 'download',
            header: t('labels.download'),
            cell: (report: ReportJob) =>
              report.file_url ? (
                <a className="text-primary hover:underline" href={report.file_url} target="_blank" rel="noreferrer">
                  {t('reports.actions.download')}
                </a>
              ) : (
                <span>—</span>
              ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />
    </section>
  );
}
