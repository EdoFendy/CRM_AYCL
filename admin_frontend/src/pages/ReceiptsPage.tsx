import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface ReceiptRow {
  id: string;
  invoice_id: string | null;
  status: string;
  provider: string | null;
  amount: number;
  currency: string;
  issued_at: string | null;
  pdf_url: string | null;
  created_at: string;
}

export default function ReceiptsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const receiptsQuery = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<{ data: ReceiptRow[] }>('receipts', { token });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
  });

  const rows = receiptsQuery.data?.data ?? [];
  const totalAmount = rows.reduce((sum: number, receipt: any) => sum + (typeof receipt.amount === 'number' ? receipt.amount : Number(receipt.amount) || 0), 0);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Receipts</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Receipts</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Amount</p>
          <p className="text-2xl font-bold text-slate-900">€{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={[
          { id: 'id', header: 'ID', cell: (receipt) => receipt.id.substring(0, 8) + '...' },
          { id: 'amount', header: 'Amount', cell: (receipt) => `€${receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          {
            id: 'status',
            header: 'Status',
            cell: (receipt) => (
              <span className="rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                {receipt.status}
              </span>
            ),
          },
          { id: 'provider', header: 'Provider', cell: (receipt) => receipt.provider || '—' },
          { id: 'issued', header: 'Issued', cell: (receipt) => receipt.issued_at ? new Date(receipt.issued_at).toLocaleDateString() : '—' },
          {
            id: 'pdf',
            header: 'PDF',
            cell: (receipt) => receipt.pdf_url ? (
              <a href={receipt.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Download
              </a>
            ) : '—',
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

