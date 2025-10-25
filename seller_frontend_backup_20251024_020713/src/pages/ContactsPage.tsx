import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/data/DataTable';
import { FiltersToolbar } from '@/components/forms/FiltersToolbar';
import { Modal } from '@/components/ui/Modal';

interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company_id: string;
  company_name: string;
  position?: string;
  source?: string;
  status: 'active' | 'inactive' | 'lead' | 'customer';
  created_at: string;
  last_contact?: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
}

const contactSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company_id: z.string().uuid(),
  position: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['active', 'inactive', 'lead', 'customer']).default('lead'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    query: '',
  });

  // Load contacts for current seller
  const contactsQuery = useQuery({
    queryKey: ['contacts', filters],
    queryFn: async () => {
      setError(null);
      try {
        const response = await apiClient<{ data: Contact[] }>('contacts', {
          token,
          searchParams: {
            ...filters,
            seller_id: user?.id, // Filter by current seller
            limit: 1000,
          },
        });
        return response.data || [];
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
  });

  // Load companies for dropdown
  const companiesQuery = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const response = await apiClient<{ data: Company[] }>('companies', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      apiClient<Contact>('contacts', {
        method: 'POST',
        token,
        body: {
          ...values,
          seller_id: user?.id, // Assign to current seller
        },
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
      apiClient<Contact>(`contacts/${id}`, {
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

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      company_id: '',
      position: '',
      source: '',
      status: 'lead',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    await createMutation.mutateAsync(values);
  });

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    form.reset({
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone || '',
      company_id: contact.company_id,
      position: contact.position || '',
      source: contact.source || '',
      status: contact.status,
    });
    setShowEditModal(true);
  };

  const onEditSubmit = form.handleSubmit(async (values) => {
    if (!editingContact) return;
    setError(null);
    await updateMutation.mutateAsync({ id: editingContact.id, data: values });
  });

  const rows = contactsQuery.data ?? [];
  const companies = companiesQuery.data ?? [];

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-slate-100 text-slate-700',
      lead: 'bg-blue-100 text-blue-700',
      customer: 'bg-purple-100 text-purple-700',
    };
    return colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-700';
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">My Contacts</h2>
          <p className="text-sm text-slate-500">Manage your customer relationships</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Contact'}
        </button>
      </div>

      {/* Contact Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Contacts</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Active Contacts</p>
          <p className="text-2xl font-bold text-slate-900">
            {rows.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Leads</p>
          <p className="text-2xl font-bold text-slate-900">
            {rows.filter(c => c.status === 'lead').length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Customers</p>
          <p className="text-2xl font-bold text-slate-900">
            {rows.filter(c => c.status === 'customer').length}
          </p>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="full_name">
              Full Name *
            </label>
            <input
              id="full_name"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="John Doe"
              {...form.register('full_name')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="email">
              Email *
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="john@company.com"
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
              placeholder="+39 123 456 7890"
              {...form.register('phone')}
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
            <label className="text-xs font-medium text-slate-600" htmlFor="position">
              Position
            </label>
            <input
              id="position"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="CEO, Manager, etc."
              {...form.register('position')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('status')}
            >
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="customer">Customer</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="source">
              Source
            </label>
            <select
              id="source"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('source')}
            >
              <option value="">Select source...</option>
              <option value="referral">Referral</option>
              <option value="cold_outreach">Cold Outreach</option>
              <option value="website">Website</option>
              <option value="social_media">Social Media</option>
              <option value="event">Event</option>
              <option value="partner">Partner</option>
            </select>
          </div>
          <div className="md:col-span-3 text-right">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createMutation.isPending}
            >
              Save Contact
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <FiltersToolbar>
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search contacts..."
          value={filters.query}
          onChange={(event) => setFilters({ ...filters, query: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
        >
          <option value="">All Status</option>
          <option value="lead">Leads</option>
          <option value="active">Active</option>
          <option value="customer">Customers</option>
          <option value="inactive">Inactive</option>
        </select>
        <button 
          type="button" 
          className="rounded-md border border-slate-300 px-3 py-2 text-sm" 
          onClick={() => setFilters({ status: '', query: '' })}
        >
          Reset
        </button>
      </FiltersToolbar>

      {/* Contacts Table */}
      <DataTable<Contact>
        data={rows}
        columns={[
          {
            id: 'full_name',
            header: 'Name',
            cell: (contact: Contact) => (
              <div>
                <p className="font-medium text-slate-900">{contact.full_name}</p>
                <p className="text-sm text-slate-500">{contact.email}</p>
              </div>
            ),
          },
          {
            id: 'company',
            header: 'Company',
            cell: (contact: Contact) => (
              <div>
                <p className="font-medium text-slate-900">{contact.company_name}</p>
                {contact.position && (
                  <p className="text-sm text-slate-500">{contact.position}</p>
                )}
              </div>
            ),
          },
          {
            id: 'phone',
            header: 'Phone',
            cell: (contact: Contact) => contact.phone || '—',
          },
          {
            id: 'status',
            header: 'Status',
            cell: (contact: Contact) => (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(contact.status)}`}>
                {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
              </span>
            ),
          },
          {
            id: 'source',
            header: 'Source',
            cell: (contact: Contact) => contact.source || '—',
          },
          {
            id: 'last_contact',
            header: 'Last Contact',
            cell: (contact: Contact) => 
              contact.last_contact ? new Date(contact.last_contact).toLocaleDateString() : '—',
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (contact: Contact) => (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(contact)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
            ),
          },
        ]}
        emptyState={<span>No contacts found</span>}
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
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_full_name">
                Full Name *
              </label>
              <input
                id="edit_full_name"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('full_name')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_email">
                Email *
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
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_position">
                Position
              </label>
              <input
                id="edit_position"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('position')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_status">
                Status
              </label>
              <select
                id="edit_status"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('status')}
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="customer">Customer</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_source">
                Source
              </label>
              <select
                id="edit_source"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('source')}
              >
                <option value="">Select source...</option>
                <option value="referral">Referral</option>
                <option value="cold_outreach">Cold Outreach</option>
                <option value="website">Website</option>
                <option value="social_media">Social Media</option>
                <option value="event">Event</option>
                <option value="partner">Partner</option>
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
    </section>
  );
}
