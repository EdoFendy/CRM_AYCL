import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface SignatureRow {
  id: string;
  contract_id: string;
  signer_name: string;
  signer_email: string;
  method: string | null;
  status: string;
  signed_at: string | null;
  ip: string | null;
  created_at: string;
}

export default function SignaturesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const signaturesQuery = useQuery({
    queryKey: ['signatures'],
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<{ data: SignatureRow[] }>('signatures', { token });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
  });

  const rows = signaturesQuery.data?.data ?? [];
  const completedCount = rows.filter((sig) => sig.status === 'completed').length;

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">E-Signatures</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Signatures</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{rows.length - completedCount}</p>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={[
          { id: 'signer', header: 'Signer', cell: (sig) => (
            <div>
              <p className="font-medium text-slate-900">{sig.signer_name}</p>
              <p className="text-xs text-slate-500">{sig.signer_email}</p>
            </div>
          )},
          {
            id: 'status',
            header: 'Status',
            cell: (sig) => (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${sig.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {sig.status}
              </span>
            ),
          },
          { id: 'method', header: 'Method', cell: (sig) => sig.method || '—' },
          { id: 'signed', header: 'Signed At', cell: (sig) => sig.signed_at ? new Date(sig.signed_at).toLocaleString() : '—' },
          { id: 'ip', header: 'IP Address', cell: (sig) => sig.ip || '—' },
          { id: 'contract', header: 'Contract', cell: (sig) => sig.contract_id.substring(0, 8) + '...' },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

