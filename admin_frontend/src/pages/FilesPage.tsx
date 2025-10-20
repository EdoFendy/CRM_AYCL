import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient, PaginatedResponse } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { useCursorPagination } from '../hooks/useCursorPagination';
import { PaginationControls } from '../components/navigation/PaginationControls';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface FileRow {
  id: string;
  name: string;
  mime: string | null;
  size: number;
  storage_url: string;
  tags: string[];
  company_id: string | null;
  opportunity_id: string | null;
  contract_id: string | null;
  created_at: string;
}

export default function FilesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const pagination = useCursorPagination();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ query: '' });
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ['files', filters, pagination.cursor, pagination.limit],
    [filters, pagination.cursor, pagination.limit]
  );

  const filesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<PaginatedResponse<FileRow>>('files', {
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`files/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setDeletingId(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const rows = filesQuery.data?.data ?? [];
  const pageInfo = filesQuery.data?.pageInfo;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const totalSize = useMemo(() => {
    return rows.reduce((sum, file) => sum + file.size, 0);
  }, [rows]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Files Repository</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Files</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Storage</p>
          <p className="text-2xl font-bold text-slate-900">{formatFileSize(totalSize)}</p>
        </div>
      </div>

      {/* Filters */}
      <FiltersToolbar>
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search files by name or tags..."
          value={filters.query ?? ''}
          onChange={(event) => setFilters({ query: event.target.value })}
        />
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={resetFilters}>
          {t('forms.reset')}
        </button>
      </FiltersToolbar>

      {/* Table */}
      <DataTable
        data={rows}
        columns={[
          {
            id: 'name',
            header: 'File Name',
            cell: (file) => (
              <div>
                <p className="font-medium text-slate-900">{file.name}</p>
                {file.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {file.tags.map((tag, idx) => (
                      <span key={idx} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          { id: 'type', header: 'Type', cell: (file) => file.mime || '—' },
          { id: 'size', header: 'Size', cell: (file) => formatFileSize(file.size) },
          {
            id: 'related',
            header: 'Related To',
            cell: (file) => (
              <div className="text-xs space-y-0.5">
                {file.company_id && (
                  <Link to={`/portfolio/${file.company_id}`} className="text-primary hover:underline block">
                    Company
                  </Link>
                )}
                {file.opportunity_id && (
                  <Link to={`/opportunities?id=${file.opportunity_id}`} className="text-primary hover:underline block">
                    Opportunity
                  </Link>
                )}
                {file.contract_id && (
                  <Link to={`/contracts?id=${file.contract_id}`} className="text-primary hover:underline block">
                    Contract
                  </Link>
                )}
                {!file.company_id && !file.opportunity_id && !file.contract_id && <span className="text-slate-500">—</span>}
              </div>
            ),
          },
          {
            id: 'created',
            header: 'Uploaded',
            cell: (file) => new Date(file.created_at).toLocaleDateString(),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (file) => (
              <div className="flex gap-2">
                <a
                  href={file.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Download
                </a>
                <button
                  onClick={() => setDeletingId(file.id)}
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

      <PaginationControls
        hasNext={Boolean(pageInfo?.hasNextPage)}
        hasPrevious={Boolean(pageInfo?.hasPreviousPage)}
        onNext={() => pagination.update({ cursor: pageInfo?.nextCursor ?? undefined })}
        onPrevious={() => pagination.update({ cursor: pageInfo?.prevCursor ?? undefined })}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete File"
        message="Are you sure you want to delete this file? This action cannot be undone."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}

