import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
  created_at: string;
}

export default function RolesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<{ data: RoleRow[] }>('users/roles/list', { token });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
  });

  const rows = rolesQuery.data?.data ?? [];

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Roles & Permissions (RBAC)</h2>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium text-slate-500">Total Roles</p>
        <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
      </div>

      <DataTable
        data={rows}
        columns={[
          { id: 'name', header: 'Role Name', cell: (role) => <span className="font-medium capitalize">{role.name}</span> },
          { id: 'description', header: 'Description', cell: (role) => role.description || '—' },
          {
            id: 'permissions',
            header: 'Permissions',
            cell: (role) => {
              const permCount = typeof role.permissions === 'object' && role.permissions ? Object.keys(role.permissions).length : 0;
              return <span className="text-xs text-slate-600">{permCount} permissions</span>;
            },
          },
          { id: 'created', header: 'Created', cell: (role) => new Date(role.created_at).toLocaleDateString() },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

