import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { DataTable } from '@components/data/DataTable';
import { FiltersToolbar } from '@components/forms/FiltersToolbar';
import { usePersistentFilters } from '@hooks/usePersistentFilters';

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
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UsersPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ query: '' });
  const [error, setError] = useState<string | null>(null);

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

  const resetMutation = useMutation({
    mutationFn: (userId: string) => apiClient(`users/${userId}/reset-password`, { method: 'POST', token }),
    onSuccess: () => {
      setError(null);
    },
    onError: (err: any) => setError(err.message),
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: '', role: 'seller', code11: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    await createMutation.mutateAsync(values);
    form.reset({ email: '', role: 'seller', code11: '' });
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

      <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3" onSubmit={onSubmit}>
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
        <div className="md:col-span-3 text-right">
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
            header: t('users.actions.resetPassword'),
            cell: (user: UserRow) => (
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1 text-xs text-primary"
                onClick={() => resetMutation.mutate(user.id)}
              >
                {t('users.actions.resetPassword')}
              </button>
            ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
