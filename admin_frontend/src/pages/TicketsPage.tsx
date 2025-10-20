import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { DataTable } from '@components/data/DataTable';

interface TicketRow {
  id: string;
  requester: string;
  subject: string;
  status: string;
  priority: string;
  assignee?: string;
}

export default function TicketsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ['tickets'],
    queryFn: () => apiClient<{ data: TicketRow[] }>('tickets', { token }),
  });

  const replyMutation = useMutation({
    mutationFn: (ticketId: string) =>
      apiClient(`tickets/${ticketId}/reply`, {
        method: 'POST',
        token,
        body: { body: replyMessage },
      }),
    onSuccess: () => {
      setReplyMessage('');
      setSelectedTicket(null);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err: any) => setError(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: (ticketId: string) => apiClient(`tickets/${ticketId}/close`, { method: 'PATCH', token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
    onError: (err: any) => setError(err.message),
  });

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('tickets.title')}</h2>

      <DataTable
        data={ticketsQuery.data?.data ?? []}
        columns={[
          { id: 'subject', header: t('labels.subject'), cell: (ticket: TicketRow) => ticket.subject },
          { id: 'requester', header: t('labels.requester'), cell: (ticket: TicketRow) => ticket.requester },
          { id: 'status', header: t('labels.status'), cell: (ticket: TicketRow) => ticket.status },
          { id: 'priority', header: t('labels.priority'), cell: (ticket: TicketRow) => ticket.priority },
          {
            id: 'actions',
            header: t('tickets.actions.reply'),
            cell: (ticket: TicketRow) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs text-primary"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  {t('tickets.actions.reply')}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600"
                  onClick={() => closeMutation.mutate(ticket.id)}
                >
                  {t('tickets.actions.close')}
                </button>
              </div>
            ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {selectedTicket ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{selectedTicket.subject}</h3>
          <textarea
            className="mt-2 h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={replyMessage}
            onChange={(event) => setReplyMessage(event.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
              onClick={() => replyMutation.mutate(selectedTicket.id)}
            >
              {t('tickets.actions.reply')}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              onClick={() => setSelectedTicket(null)}
            >
              {t('forms.cancel')}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('tickets.missingAssignment')}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
