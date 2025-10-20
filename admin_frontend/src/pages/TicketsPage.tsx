import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge } from '../components/ui/StatusBadge';

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
  const [editingTicket, setEditingTicket] = useState<TicketRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; priority?: string; assignee?: string } }) =>
      apiClient(`tickets/${id}`, {
        method: 'PATCH',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowEditModal(false);
      setEditingTicket(null);
    },
    onError: (err: any) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`tickets/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setDeletingId(null);
    },
    onError: (err: any) => setError(err.message),
  });

  const handleEdit = (ticket: TicketRow) => {
    setEditingTicket(ticket);
    setShowEditModal(true);
  };

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
            header: 'Actions',
            cell: (ticket: TicketRow) => (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleEdit(ticket)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedTicket(ticket)}
                  className="text-sm text-green-600 hover:underline"
                >
                  Reply
                </button>
                <button
                  onClick={() => closeMutation.mutate(ticket.id)}
                  className="text-sm text-orange-600 hover:underline"
                >
                  Close
                </button>
                <button
                  onClick={() => setDeletingId(ticket.id)}
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

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTicket(null);
        }}
        title="Edit Ticket"
      >
        {editingTicket && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({
                id: editingTicket.id,
                data: {
                  status: formData.get('status') as string,
                  priority: formData.get('priority') as string,
                },
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_status">
                Status
              </label>
              <select
                id="edit_status"
                name="status"
                defaultValue={editingTicket.status}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="solved">Solved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_priority">
                Priority
              </label>
              <select
                id="edit_priority"
                name="priority"
                defaultValue={editingTicket.priority}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTicket(null);
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
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
