import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface ReferralRow {
  id: string;
  code: string;
  owner_user_id: string | null;
  created_at: string;
}

export default function ReferralsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const referralsQuery = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<{ data: ReferralRow[] }>('referrals', { token });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
  });

  const rows = referralsQuery.data?.data ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Referral Tracking</h2>
      </div>

      {/* Summary Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium text-slate-500">Total Referral Codes</p>
        <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
      </div>

      {/* Table */}
      <DataTable
        data={rows}
        columns={[
          { id: 'code', header: 'Referral Code', cell: (referral) => <code className="rounded bg-slate-100 px-2 py-1 text-sm font-mono">{referral.code}</code> },
          { id: 'owner', header: 'Owner User ID', cell: (referral) => referral.owner_user_id ? referral.owner_user_id.substring(0, 8) + '...' : '—' },
          {
            id: 'created',
            header: 'Created',
            cell: (referral) => new Date(referral.created_at).toLocaleDateString(),
          },
          {
            id: 'link',
            header: 'Referral Link',
            cell: (referral) => (
              <a
                href={`https://allyoucanleads.com/r/${referral.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View Link
              </a>
            ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

