import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient, PaginatedResponse } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { useCursorPagination } from '../hooks/useCursorPagination';
import { PaginationControls } from '../components/navigation/PaginationControls';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  owner_id: string | null;
  company_id: string | null;
  opportunity_id: string | null;
  status: string;
  priority: string;
  created_at: string;
  completed_at: string | null;
}

interface Company {
  id: string;
  ragione_sociale: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Opportunity {
  id: string;
  title: string;
}

const STATUSES = [
  { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-slate-600' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
];

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  due_date: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  status: z.string().default('open'),
  priority: z.string().default('medium'),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function TasksPage() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const pagination = useCursorPagination();
  const { filters, setFilters, resetFilters } = usePersistentFilters({
    status: '',
    priority: '',
    query: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load companies for dropdown
  const companiesQuery = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const response = await apiClient<{ data: Company[] }>('companies', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  // Load users for dropdown
  const usersQuery = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const response = await apiClient<{ data: User[] }>('users', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  // Load opportunities for dropdown
  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities-list'],
    queryFn: async () => {
      const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  const queryKey = useMemo(
    () => ['tasks', filters, pagination.cursor, pagination.limit],
    [filters, pagination.cursor, pagination.limit]
  );

  const tasksQuery = useQuery({
    queryKey,
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<PaginatedResponse<TaskRow>>('tasks', {
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

  const createMutation = useMutation({
    mutationFn: (values: TaskFormValues) =>
      apiClient<TaskRow>('tasks', {
        method: 'POST',
        token,
        body: values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateForm(false);
      form.reset();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient<TaskRow>(`tasks/${id}`, {
        method: 'PATCH',
        token,
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskFormValues> }) =>
      apiClient<TaskRow>(`tasks/${id}`, {
        method: 'PATCH',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowEditModal(false);
      setEditingTask(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`tasks/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeletingId(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'open',
      priority: 'medium',
      owner_id: user?.id || '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    await createMutation.mutateAsync(values);
  });

  const handleEdit = (task: TaskRow) => {
    setEditingTask(task);
    form.reset({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      owner_id: task.owner_id || '',
      company_id: task.company_id || '',
      opportunity_id: task.opportunity_id || '',
      status: task.status,
      priority: task.priority,
    });
    setShowEditModal(true);
  };

  const onEditSubmit = form.handleSubmit(async (values) => {
    if (!editingTask) return;
    setError(null);
    await updateMutation.mutateAsync({ id: editingTask.id, data: values });
  });

  const rows = tasksQuery.data?.data ?? [];
  const pageInfo = tasksQuery.data?.pageInfo;
  const companies = companiesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const opportunities = opportunitiesQuery.data ?? [];

  const metrics = useMemo(() => {
    const openCount = rows.filter((task) => task.status === 'open').length;
    const inProgressCount = rows.filter((task) => task.status === 'in_progress').length;
    const doneCount = rows.filter((task) => task.status === 'done').length;
    const overdueCount = rows.filter(
      (task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
    ).length;

    return { openCount, inProgressCount, doneCount, overdueCount };
  }, [rows]);

  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority)?.color || 'text-slate-600';
  };

  const getStatusColor = (status: string) => {
    return STATUSES.find((s) => s.value === status)?.color || 'bg-slate-100 text-slate-700';
  };

  const isOverdue = (task: TaskRow) => {
    return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Tasks</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              viewMode === 'kanban' ? 'bg-primary text-white' : 'bg-white border border-slate-300 text-slate-700'
            }`}
            onClick={() => setViewMode('kanban')}
          >
            Kanban View
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              viewMode === 'table' ? 'bg-primary text-white' : 'bg-white border border-slate-300 text-slate-700'
            }`}
            onClick={() => setViewMode('table')}
          >
            Table View
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : '+ New Task'}
          </button>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Open</p>
          <p className="text-2xl font-bold text-blue-600">{metrics.openCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">{metrics.inProgressCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Done</p>
          <p className="text-2xl font-bold text-green-600">{metrics.doneCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{metrics.overdueCount}</p>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('title')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="due_date">
              Due Date
            </label>
            <input
              id="due_date"
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('due_date')}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('description')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="priority">
              Priority
            </label>
            <select
              id="priority"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('priority')}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('status')}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="owner_id">
              Assign To (optional)
            </label>
            <select
              id="owner_id"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('owner_id')}
            >
              <option value="">No owner</option>
              {usersQuery.data?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="company_id">
              Related Company (optional)
            </label>
            <select
              id="company_id"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('company_id')}
            >
              <option value="">None</option>
              {companiesQuery.data?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.ragione_sociale}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="opportunity_id">
              Related Opportunity (optional)
            </label>
            <select
              id="opportunity_id"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('opportunity_id')}
            >
              <option value="">None</option>
              {opportunitiesQuery.data?.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.title}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 text-right">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createMutation.isPending}
            >
              {t('forms.save')}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <FiltersToolbar>
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search tasks..."
          value={filters.query ?? ''}
          onChange={(event) => setFilters({ query: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.status ?? ''}
          onChange={(event) => setFilters({ status: event.target.value })}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.priority ?? ''}
          onChange={(event) => setFilters({ priority: event.target.value })}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority.value} value={priority.value}>
              {priority.label}
            </option>
          ))}
        </select>
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={resetFilters}>
          {t('forms.reset')}
        </button>
      </FiltersToolbar>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STATUSES.map((status) => {
            const statusTasks = rows.filter((task) => task.status === status.value);
            return (
              <div key={status.value} className="flex flex-col">
                <div className="mb-3 rounded-lg bg-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">{status.label}</h3>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700">
                      {statusTasks.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {statusTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-lg border bg-white p-3 shadow-sm ${
                        isOverdue(task) ? 'border-red-300' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-slate-900">{task.title}</h4>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => {
                            if (confirm('Delete this task?')) {
                              deleteMutation.mutate(task.id);
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                      {task.description && <p className="mt-1 text-xs text-slate-600">{task.description}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {PRIORITIES.find((p) => p.value === task.priority)?.label}
                        </span>
                        {task.due_date && (
                          <span className={`text-xs ${isOverdue(task) ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-1">
                        {STATUSES.filter((s) => s.value !== task.status).map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                            onClick={() => updateStatusMutation.mutate({ id: task.id, status: s.value })}
                          >
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          <DataTable
            data={rows}
            columns={[
              {
                id: 'title',
                header: 'Title',
                cell: (task) => (
                  <div>
                    <p className={`font-medium ${isOverdue(task) ? 'text-red-600' : 'text-slate-900'}`}>{task.title}</p>
                    {task.description && <p className="text-xs text-slate-500">{task.description}</p>}
                  </div>
                ),
              },
              {
                id: 'status',
                header: 'Status',
                cell: (task) => (
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}>
                    {STATUSES.find((s) => s.value === task.status)?.label}
                  </span>
                ),
              },
              {
                id: 'priority',
                header: 'Priority',
                cell: (task) => (
                  <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                    {PRIORITIES.find((p) => p.value === task.priority)?.label}
                  </span>
                ),
              },
              {
                id: 'due_date',
                header: 'Due Date',
                cell: (task) =>
                  task.due_date ? (
                    <span className={isOverdue(task) ? 'font-semibold text-red-600' : ''}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  ) : (
                    '—'
                  ),
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (task) => (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(task)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(task.id)}
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
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        title="Edit Task"
        size="lg"
      >
        <form onSubmit={onEditSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_title">
                Title *
              </label>
              <input
                id="edit_title"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('title')}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_description">
                Description
              </label>
              <textarea
                id="edit_description"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('description')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_status">
                Status *
              </label>
              <select
                id="edit_status"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('status')}
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_priority">
                Priority *
              </label>
              <select
                id="edit_priority"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('priority')}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_due_date">
                Due Date
              </label>
              <input
                id="edit_due_date"
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('due_date')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_owner_id">
                Owner
              </label>
              <select
                id="edit_owner_id"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('owner_id')}
              >
                <option value="">Assign to...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingTask(null);
              }}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}

