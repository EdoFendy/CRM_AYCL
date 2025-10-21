import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface TeamRow {
  id: string;
  name: string;
  type: string;
  parent_team_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
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
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [teamsQuery, usersQuery] = useQueries({
    queries: [
      {
        queryKey: ['teams', filters],
        queryFn: () =>
          apiClient<{ data: TeamRow[] }>('teams', {
            token,
            searchParams: { type: filters.type },
          }),
      },
      {
        queryKey: ['users'],
        queryFn: () => apiClient<{ data: TeamMember[] }>('users', { token, searchParams: { limit: 1000 } }),
      },
    ],
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TeamFormValues> }) =>
      apiClient<TeamRow>(`teams/${id}`, {
        method: 'PATCH',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowEditModal(false);
      setEditingTeam(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`teams/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setDeletingId(null);
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

  const handleEdit = (team: TeamRow) => {
    setEditingTeam(team);
    form.reset({
      name: team.name,
      type: team.type as any,
      parent_team_id: team.parent_team_id,
    });
    setShowEditModal(true);
  };

  const onEditSubmit = form.handleSubmit(async (values) => {
    if (!editingTeam) return;
    setError(null);
    await updateMutation.mutateAsync({ id: editingTeam.id, data: values });
  });

  const rows = teamsQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];

  const sellerTeams = rows.filter((team) => team.type === 'seller');
  const resellerTeams = rows.filter((team) => team.type === 'reseller');

  // Get team member counts
  const getTeamMemberCount = (teamId: string, teamType: string) => {
    const field = teamType === 'seller' ? 'team_id' : 'reseller_team_id';
    return users.filter(user => user[field] === teamId).length;
  };

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
            { 
              id: 'name', 
              header: 'Team Name', 
              cell: (team) => (
                <Link 
                  to={`/teams/${team.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {team.name}
                </Link>
              )
            },
            { 
              id: 'members', 
              header: 'Members', 
              cell: (team) => (
                <span className="text-sm font-semibold text-slate-900">
                  {getTeamMemberCount(team.id, team.type)}
                </span>
              )
            },
            {
              id: 'parent',
              header: 'Parent Team',
              cell: (team) => {
                if (!team.parent_team_id) return '—';
                const parent = rows.find((t) => t.id === team.parent_team_id);
                return parent ? (
                  <Link 
                    to={`/teams/${parent.id}`}
                    className="text-primary hover:underline"
                  >
                    {parent.name}
                  </Link>
                ) : '—';
              },
            },
            {
              id: 'created',
              header: 'Created',
              cell: (team) => new Date(team.created_at).toLocaleDateString(),
            },
            {
              id: 'actions',
              header: 'Actions',
              cell: (team) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(team)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(team.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              ),
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
            { 
              id: 'name', 
              header: 'Team Name', 
              cell: (team) => (
                <Link 
                  to={`/teams/${team.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {team.name}
                </Link>
              )
            },
            { 
              id: 'members', 
              header: 'Members', 
              cell: (team) => (
                <span className="text-sm font-semibold text-slate-900">
                  {getTeamMemberCount(team.id, team.type)}
                </span>
              )
            },
            {
              id: 'parent',
              header: 'Parent Team',
              cell: (team) => {
                if (!team.parent_team_id) return '—';
                const parent = rows.find((t) => t.id === team.parent_team_id);
                return parent ? (
                  <Link 
                    to={`/teams/${parent.id}`}
                    className="text-primary hover:underline"
                  >
                    {parent.name}
                  </Link>
                ) : '—';
              },
            },
            {
              id: 'created',
              header: 'Created',
              cell: (team) => new Date(team.created_at).toLocaleDateString(),
            },
            {
              id: 'actions',
              header: 'Actions',
              cell: (team) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(team)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(team.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          emptyState={<span>No reseller teams found</span>}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTeam(null);
        }}
        title="Edit Team"
      >
        <form onSubmit={onEditSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="edit_name">
              Team Name *
            </label>
            <input
              id="edit_name"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('name')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="edit_type">
              Team Type *
            </label>
            <select
              id="edit_type"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('type')}
            >
              <option value="seller">Seller</option>
              <option value="reseller">Reseller</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="edit_parent_team_id">
              Parent Team (optional)
            </label>
            <select
              id="edit_parent_team_id"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('parent_team_id')}
            >
              <option value="">None</option>
              {rows.filter(team => team.id !== editingTeam?.id).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.type})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingTeam(null);
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
        title="Delete Team"
        message="Are you sure you want to delete this team? All team members will be unassigned. This action cannot be undone."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}

