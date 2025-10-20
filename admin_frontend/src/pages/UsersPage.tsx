import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface UserRow {
  id: string;
  email: string;
  role: string;
  code11: string;
}

const userSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'seller', 'reseller', 'customer']),
  code11: z.string().length(11),
  password: z.string().min(8),
  fullName: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UsersPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ query: '' });
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', filters],
    queryFn: () =>
      apiClient<{ data: UserRow[] }>('users', {
        token,
        searchParams: { query: filters.query },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      apiClient<UserRow>('users', {
        method: 'POST',
        token,
        body: values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormValues> }) =>
      apiClient<UserRow>(`users/${id}`, {
        method: 'PATCH',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditModal(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`users/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeletingId(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => apiClient(`users/${userId}/reset-password`, { method: 'POST', token }),
    onSuccess: () => {
      setError(null);
    },
    onError: (err: any) => setError(err.message),
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: '', role: 'seller', code11: '', password: '', fullName: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    await createMutation.mutateAsync(values);
    form.reset({ email: '', role: 'seller', code11: '', password: '', fullName: '' });
  });

  const handleEdit = (user: UserRow) => {
    setEditingUser(user);
    form.reset({
      email: user.email,
      role: user.role as any,
      code11: user.code11,
      password: '', // Non mostrare la password
      fullName: '',
    });
    setShowEditModal(true);
  };

  const onEditSubmit = form.handleSubmit(async (values) => {
    if (!editingUser) return;
    setError(null);
    const { password, ...data } = values;
    await updateMutation.mutateAsync({ id: editingUser.id, data });
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">{t('users.title')}</h2>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          onClick={onSubmit}
        >
          {t('users.actions.create')}
        </button>
      </div>

      <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="email">
            {t('labels.email')}
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...form.register('email')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="role">
            {t('labels.role')}
          </label>
          <select id="role" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...form.register('role')}>
            <option value="admin">Admin</option>
            <option value="seller">Seller</option>
            <option value="reseller">Reseller</option>
            <option value="customer">Customer</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="code11">
            {t('labels.code11')}
          </label>
          <input
            id="code11"
            type="text"
            maxLength={11}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...form.register('code11')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...form.register('password')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="fullName">
            {t('labels.fullName')}
          </label>
          <input
            id="fullName"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...form.register('fullName')}
          />
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

      <FiltersToolbar>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={t('forms.search')}
          value={filters.query ?? ''}
          onChange={(event) => setFilters({ query: event.target.value })}
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
        data={usersQuery.data?.data ?? []}
        columns={[
          { id: 'email', header: t('labels.email'), cell: (user: UserRow) => user.email },
          { id: 'role', header: t('labels.role'), cell: (user: UserRow) => user.role },
          { id: 'code', header: t('labels.code11'), cell: (user: UserRow) => user.code11 },
          {
            id: 'actions',
            header: 'Actions',
            cell: (user: UserRow) => (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(user)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingId(user.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
                <button
                  onClick={() => resetMutation.mutate(user.id)}
                  className="text-sm text-orange-600 hover:underline"
                >
                  Reset Pwd
                </button>
              </div>
            ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        title="Edit User"
      >
        <form onSubmit={onEditSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="edit_email">
              Email *
            </label>
            <input
              id="edit_email"
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('email')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="edit_role">
              Role *
            </label>
            <select
              id="edit_role"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('role')}
            >
              <option value="admin">Admin</option>
              <option value="seller">Seller</option>
              <option value="reseller">Reseller</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
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
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
