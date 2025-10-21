import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient, PaginatedResponse } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { useCursorPagination } from '../hooks/useCursorPagination';
import { PaginationControls } from '../components/navigation/PaginationControls';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface ContactRow {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  linkedin: string | null;
  owner_id: string | null;
  created_at: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

const contactSchema = z.object({
  company_id: z.string().uuid(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  owner_id: z.string().uuid().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactsPage() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const pagination = useCursorPagination();
  const { filters, setFilters, resetFilters } = usePersistentFilters({
    query: '',
    company: '',
    filterType: 'all', // all, important, conversations, notes
  });
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Call logging modal state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callContact, setCallContact] = useState<ContactRow | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callRunning, setCallRunning] = useState(false);
  const [callNotes, setCallNotes] = useState('');

  useEffect(() => {
    if (!callRunning) return;
    const id = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callRunning]);

  const queryKey = useMemo(
    () => ['contacts', filters, pagination.cursor, pagination.limit],
    [filters, pagination.cursor, pagination.limit]
  );

  const contactsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<PaginatedResponse<ContactRow>>('contacts', {
          token,
          searchParams: {
            ...filters,
            limit: pagination.limit,
            cursor: pagination.cursor,
          },
        });
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    keepPreviousData: true,
  });

  // Load companies for dropdown
  const companiesQuery = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const response = await apiClient<{ data: Company[] }>('companies', {
        token,
        searchParams: { limit: 1000 },
      });
      return response;
    },
  });

  // Load users for dropdown
  const usersQuery = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const response = await apiClient<{ data: User[] }>('users', {
        token,
        searchParams: { limit: 1000 },
      });
      return response;
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      apiClient<ContactRow>('contacts', {
        method: 'POST',
        token,
        body: values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowCreateForm(false);
      form.reset();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactFormValues> }) =>
      apiClient<ContactRow>(`contacts/${id}`, {
        method: 'PATCH',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowEditModal(false);
      setEditingContact(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`contacts/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setDeletingId(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  // Log call mutation -> create activity
  const logCallMutation = useMutation({
    mutationFn: async () =>
      apiClient('activities', {
        method: 'POST',
        token,
        body: {
          type: 'call',
          company_id: callContact?.company_id,
          contact_id: callContact?.id,
          content: callNotes,
          metadata: { duration_seconds: callSeconds },
          occurred_at: new Date().toISOString(),
        },
      }),
    onSuccess: () => {
      setCallModalOpen(false);
      setCallRunning(false);
      setCallSeconds(0);
      setCallNotes('');
      setCallContact(null);
    },
    onError: (err: any) => setError(err.message),
  });

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      company_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: '',
      linkedin: '',
      owner_id: user?.id || '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    await createMutation.mutateAsync(values);
  });

  const handleEdit = (contact: ContactRow) => {
    setEditingContact(contact);
    form.reset({
      company_id: contact.company_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      role: contact.role || '',
      linkedin: contact.linkedin || '',
      owner_id: contact.owner_id || '',
    });
    setShowEditModal(true);
  };

  const onEditSubmit = form.handleSubmit(async (values) => {
    if (!editingContact) return;
    setError(null);
    await updateMutation.mutateAsync({ id: editingContact.id, data: values });
  });

  const allRows = contactsQuery.data?.data ?? [];
  const pageInfo = contactsQuery.data?.pageInfo;
  const companies = companiesQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];

  // Apply sub-navbar filtering
  const rows = useMemo(() => {
    if (filters.filterType === 'all') {
      return allRows;
    }
    if (filters.filterType === 'important') {
      // Filter for contacts with LinkedIn or important roles
      return allRows.filter((contact) => 
        contact.linkedin || 
        (contact.role && ['CEO', 'CTO', 'CFO', 'COO', 'President', 'Director', 'Manager'].some(title => 
          contact.role?.toLowerCase().includes(title.toLowerCase())
        ))
      );
    }
    if (filters.filterType === 'conversations') {
      // Filter for contacts with phone numbers (potential conversations)
      return allRows.filter((contact) => contact.phone && contact.phone.trim() !== '');
    }
    if (filters.filterType === 'notes') {
      // Filter for contacts with detailed role descriptions (proxy for notes)
      return allRows.filter((contact) => 
        contact.role && contact.role.length > 10 // Assume detailed roles are "notes"
      );
    }
    return allRows;
  }, [allRows, filters.filterType]);

  const getCompanyName = (companyId: string) => {
    if (!companyId) return 'Unknown';
    if (!companies || companies.length === 0) return 'Loading...';
    const company = companies.find((c) => c.id === companyId);
    return company?.ragione_sociale || 'Unknown';
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return '—';
    const owner = users.find((u) => u.id === ownerId);
    return owner?.full_name || owner?.email || '—';
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Contacts</h2>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Contact'}
        </button>
      </div>

      {/* Top sub-navbar (functional filter bar) */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: 'all' },
          { label: 'Important', value: 'important' },
          { label: 'Conversations', value: 'conversations' },
          { label: 'Notes & Summaries', value: 'notes' }
        ].map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setFilters({ filterType: filter.value })}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              filters.filterType === filter.value
                ? 'border-primary bg-primary text-white'
                : 'text-slate-700 border-slate-200 hover:border-primary hover:text-primary'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium text-slate-500">
          {filters.filterType === 'all' ? 'Total Contacts' : 
           filters.filterType === 'important' ? 'Important Contacts' :
           filters.filterType === 'conversations' ? 'Contacts with Phone' :
           'Contacts with Notes'}
        </p>
        <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        {filters.filterType !== 'all' && (
          <p className="text-xs text-slate-400 mt-1">of {allRows.length} total</p>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="first_name">
              First Name *
            </label>
            <input
              id="first_name"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('first_name')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="last_name">
              Last Name *
            </label>
            <input
              id="last_name"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('last_name')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('email')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('phone')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="role">
              Role / Job Title
            </label>
            <input
              id="role"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. CEO, CTO, Sales Manager"
              {...form.register('role')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="company_id">
              Company *
            </label>
            <select
              id="company_id"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('company_id')}
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.ragione_sociale}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="linkedin">
              LinkedIn URL
            </label>
            <input
              id="linkedin"
              type="url"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://linkedin.com/in/..."
              {...form.register('linkedin')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="owner_id">
              Owner (optional)
            </label>
            <select
              id="owner_id"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('owner_id')}
            >
              <option value="">No owner</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
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
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search contacts (name, email, phone)..."
          value={filters.query ?? ''}
          onChange={(event) => setFilters({ query: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.company ?? ''}
          onChange={(event) => setFilters({ company: event.target.value })}
        >
          <option value="">All Companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.ragione_sociale}
            </option>
          ))}
        </select>
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={resetFilters}>
          {t('forms.reset')}
        </button>
      </FiltersToolbar>

      {/* Table */}
      <DataTable
        data={rows}
        columns={[
          {
            id: 'name',
            header: 'Name',
            cell: (contact) => (
              <div>
                <Link 
                  to={`/contacts/${contact.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {contact.first_name} {contact.last_name}
                </Link>
                {contact.role && <p className="text-xs text-slate-500">{contact.role}</p>}
              </div>
            ),
          },
          {
            id: 'email',
            header: 'Email',
            cell: (contact) =>
              contact.email ? (
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                  {contact.email}
                </a>
              ) : (
                '—'
              ),
          },
          { id: 'phone', header: 'Phone', cell: (contact) => contact.phone || '—' },
          {
            id: 'linkedin',
            header: 'LinkedIn',
            cell: (contact) =>
              contact.linkedin ? (
                <a
                  href={contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Profile
                </a>
              ) : (
                '—'
              ),
          },
          {
            id: 'company',
            header: 'Company',
            cell: (contact) => (
              <Link to={`/portfolio/${contact.company_id}`} className="text-primary hover:underline">
                {getCompanyName(contact.company_id)}
              </Link>
            ),
          },
          {
            id: 'owner',
            header: 'Owner',
            cell: (contact) => getOwnerName(contact.owner_id),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (contact) => (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(contact)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingId(contact.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setCallContact(contact);
                    setCallModalOpen(true);
                    setCallSeconds(0);
                    setCallNotes('');
                    setCallRunning(false);
                  }}
                  className="text-sm text-slate-700 hover:underline"
                >
                  Log Call
                </button>
              </div>
            ),
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      <PaginationControls
        hasNext={Boolean(pageInfo?.hasNextPage)}
        hasPrevious={Boolean(pageInfo?.hasPreviousPage)}
        onNext={() => pagination.update({ cursor: pageInfo?.nextCursor ?? undefined })}
        onPrevious={() => pagination.update({ cursor: pageInfo?.prevCursor ?? undefined })}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingContact(null);
        }}
        title="Edit Contact"
        size="lg"
      >
        <form onSubmit={onEditSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_company_id">
                Company *
              </label>
              <select
                id="edit_company_id"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('company_id')}
              >
                <option value="">Select company...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.ragione_sociale}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_first_name">
                First Name *
              </label>
              <input
                id="edit_first_name"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('first_name')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_last_name">
                Last Name *
              </label>
              <input
                id="edit_last_name"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('last_name')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_email">
                Email
              </label>
              <input
                id="edit_email"
                type="email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('email')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_phone">
                Phone
              </label>
              <input
                id="edit_phone"
                type="tel"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('phone')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_role">
                Role
              </label>
              <input
                id="edit_role"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('role')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_linkedin">
                LinkedIn
              </label>
              <input
                id="edit_linkedin"
                type="url"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('linkedin')}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_owner_id">
                Owner
              </label>
              <select
                id="edit_owner_id"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('owner_id')}
              >
                <option value="">Assign to...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingContact(null);
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
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Call Logging Modal */}
      <Modal
        isOpen={callModalOpen}
        onClose={() => {
          setCallModalOpen(false);
          setCallRunning(false);
        }}
        title={callContact ? `Log Call — ${callContact.first_name} ${callContact.last_name}` : 'Log Call'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">
              Duration: {String(Math.floor(callSeconds / 60)).padStart(2, '0')}:{String(callSeconds % 60).padStart(2, '0')}
            </p>
            <div className="flex gap-2">
              {!callRunning ? (
                <button
                  type="button"
                  onClick={() => setCallRunning(true)}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Start
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCallRunning(false)}
                  className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  End
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="call_notes">
              Notes
            </label>
            <textarea
              id="call_notes"
              rows={5}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Add notes, outcomes, next steps..."
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setCallModalOpen(false);
                setCallRunning(false);
              }}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={logCallMutation.isPending}
              onClick={() => logCallMutation.mutate()}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {logCallMutation.isPending ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
