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

interface TeamRow {
  id: string;
  name: string;
  type: string;
  parent_team_id: string | null;
  created_at: string;
}

const teamSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['seller', 'reseller']),
  parent_team_id: z.string().uuid().nullable().optional(),
});

type TeamFormValues = z.infer<typeof teamSchema>;

export default function TeamsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ type: '' });
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const teamsQuery = useQuery({
    queryKey: ['teams', filters],
    queryFn: () =>
      apiClient<{ data: TeamRow[] }>('teams', {
        token,
        searchParams: { type: filters.type },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: TeamFormValues) =>
      apiClient<TeamRow>('teams', {
        method: 'POST',
        token,
        body: values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreateForm(false);
      form.reset();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      type: 'seller',
      parent_team_id: null,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    await createMutation.mutateAsync(values);
  });

  const rows = teamsQuery.data?.data ?? [];

  const sellerTeams = rows.filter((team) => team.type === 'seller');
  const resellerTeams = rows.filter((team) => team.type === 'reseller');

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Teams Management</h2>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Team'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Teams</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Seller Teams</p>
          <p className="text-2xl font-bold text-blue-600">{sellerTeams.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Reseller Teams</p>
          <p className="text-2xl font-bold text-green-600">{resellerTeams.length}</p>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="name">
              Team Name *
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Sales Team North"
              {...form.register('name')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="type">
              Team Type *
            </label>
            <select id="type" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...form.register('type')}>
              <option value="seller">Seller</option>
              <option value="reseller">Reseller</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="parent_team_id">
              Parent Team (optional)
            </label>
            <select
              id="parent_team_id"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('parent_team_id')}
            >
              <option value="">None</option>
              {rows.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.type})
                </option>
              ))}
            </select>
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
      )}

      {/* Filters */}
      <FiltersToolbar>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.type ?? ''}
          onChange={(event) => setFilters({ type: event.target.value })}
        >
          <option value="">All Types</option>
          <option value="seller">Seller Teams</option>
          <option value="reseller">Reseller Teams</option>
        </select>
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={resetFilters}>
          {t('forms.reset')}
        </button>
      </FiltersToolbar>

      {/* Seller Teams Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Seller Teams ({sellerTeams.length})</h3>
        <DataTable
          data={sellerTeams}
          columns={[
            { id: 'name', header: 'Team Name', cell: (team) => team.name },
            { id: 'type', header: 'Type', cell: (team) => <span className="capitalize">{team.type}</span> },
            {
              id: 'parent',
              header: 'Parent Team',
              cell: (team) => {
                if (!team.parent_team_id) return '—';
                const parent = rows.find((t) => t.id === team.parent_team_id);
                return parent ? parent.name : '—';
              },
            },
            {
              id: 'created',
              header: 'Created',
              cell: (team) => new Date(team.created_at).toLocaleDateString(),
            },
          ]}
          emptyState={<span>No seller teams found</span>}
        />
      </div>

      {/* Reseller Teams Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Reseller Teams ({resellerTeams.length})</h3>
        <DataTable
          data={resellerTeams}
          columns={[
            { id: 'name', header: 'Team Name', cell: (team) => team.name },
            { id: 'type', header: 'Type', cell: (team) => <span className="capitalize">{team.type}</span> },
            {
              id: 'parent',
              header: 'Parent Team',
              cell: (team) => {
                if (!team.parent_team_id) return '—';
                const parent = rows.find((t) => t.id === team.parent_team_id);
                return parent ? parent.name : '—';
              },
            },
            {
              id: 'created',
              header: 'Created',
              cell: (team) => new Date(team.created_at).toLocaleDateString(),
            },
          ]}
          emptyState={<span>No reseller teams found</span>}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

