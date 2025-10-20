import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { StatusBadge } from '../components/ui/StatusBadge';

interface OfferRow {
  id: string;
  opportunity_id: string;
  version: number;
  total: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Opportunity {
  id: string;
  title: string;
  company_id: string;
  value: number;
}

interface LineItem {
  name: string;
  quantity: number;
  unit_price: number;
}

const STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
  { value: 'expired', label: 'Expired', color: 'bg-orange-100 text-orange-700' },
];

export default function OffersPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const pagination = useCursorPagination();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ status: '' });
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [workflowOffer, setWorkflowOffer] = useState<OfferRow | null>(null);
  const [workflowAction, setWorkflowAction] = useState<'send' | 'accept' | 'decline' | null>(null);
  
  // Create form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ name: '', quantity: 1, unit_price: 0 }]);
  const [currency, setCurrency] = useState<string>('EUR');

  const queryKey = useMemo(
    () => ['offers', filters, pagination.cursor, pagination.limit],
    [filters, pagination.cursor, pagination.limit]
  );

  const offersQuery = useQuery({
    queryKey,
    queryFn: async () => {
      setError(null);
      try {
        return await apiClient<PaginatedResponse<OfferRow>>('offers', {
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

  // Load opportunities for dropdown
  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities-list'],
    queryFn: async () => {
      const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  // Get next version for selected opportunity
  const getNextVersion = async (opportunityId: string): Promise<number> => {
    if (!opportunityId) return 1;
    try {
      const response = await apiClient<PaginatedResponse<OfferRow>>('offers', {
        token,
        searchParams: { opportunity_id: opportunityId, limit: 100 },
      });
      const existingOffers = response.data || [];
      if (existingOffers.length === 0) return 1;
      const maxVersion = Math.max(...existingOffers.map(o => o.version));
      return maxVersion + 1;
    } catch {
      return 1;
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`offers/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      setDeletingId(null);
    },
    onError: (err: any) => setError(err.message),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { opportunity_id: string; version: number; items: LineItem[]; total: number; currency: string }) =>
      apiClient<OfferRow>('offers', {
        method: 'POST',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      setShowCreateForm(false);
      setSelectedOpportunity('');
      setLineItems([{ name: '', quantity: 1, unit_price: 0 }]);
      setCurrency('EUR');
      setError(null);
    },
    onError: (err: any) => setError(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient(`offers/${id}`, {
        method: 'PATCH',
        token,
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      setWorkflowOffer(null);
      setWorkflowAction(null);
    },
    onError: (err: any) => setError(err.message),
  });

  // Line items management
  const addLineItem = () => {
    setLineItems([...lineItems, { name: '', quantity: 1, unit_price: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = (): number => {
    return lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price || 0)), 0);
  };

  const handleCreateOffer = async () => {
    if (!selectedOpportunity) {
      setError('Please select an opportunity');
      return;
    }
    if (lineItems.length === 0 || lineItems.every(item => !item.name)) {
      setError('Please add at least one line item');
      return;
    }

    const version = await getNextVersion(selectedOpportunity);
    const total = calculateTotal();

    createMutation.mutate({
      opportunity_id: selectedOpportunity,
      version,
      items: lineItems.filter(item => item.name.trim() !== ''),
      total,
      currency,
    });
  };

  const handleWorkflowAction = (action: 'send' | 'accept' | 'decline') => {
    if (!workflowOffer) return;
    
    const statusMap = {
      send: 'sent',
      accept: 'accepted',
      decline: 'declined',
    };
    
    updateStatusMutation.mutate({ id: workflowOffer.id, status: statusMap[action] });
  };

  const rows = offersQuery.data?.data ?? [];
  const pageInfo = offersQuery.data?.pageInfo;

  const getStatusColor = (status: string) => {
    return STATUSES.find((s) => s.value === status)?.color || 'bg-slate-100 text-slate-700';
  };

  const metrics = useMemo(() => {
    const toNumber = (v: unknown): number => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const totalValue = rows.reduce((sum, offer) => sum + toNumber(offer.total), 0);
    const byStatus = STATUSES.map((status) => ({
      status: status.label,
      count: rows.filter((offer) => offer.status === status.value).length,
      value: rows.filter((offer) => offer.status === status.value).reduce((sum, offer) => sum + toNumber(offer.total), 0),
    }));

    return { totalValue, byStatus };
  }, [rows]);

  const opportunities = opportunitiesQuery.data ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Offers</h2>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Offer'}
        </button>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Offers Value</p>
          <p className="text-2xl font-bold text-slate-900">
            €{metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Offers</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Status Breakdown</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {metrics.byStatus.map((item) => (
            <div key={item.status}>
              <p className="text-xs text-slate-500">{item.status}</p>
              <p className="text-lg font-bold text-slate-900">{item.count}</p>
              <p className="text-xs text-slate-600">€{item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-6">
          <h3 className="text-lg font-semibold text-slate-900">Create New Offer</h3>
          
          {/* Opportunity Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="opportunity">
              Opportunity *
            </label>
            <select
              id="opportunity"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedOpportunity}
              onChange={(e) => setSelectedOpportunity(e.target.value)}
            >
              <option value="">Select an opportunity...</option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.title} - €{opp.value.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Currency Selection */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="currency">
                Currency
              </label>
              <select
                id="currency"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-900">Line Items *</label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-sm text-primary hover:underline font-medium"
              >
                + Add Line Item
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5 space-y-1">
                    <label className="text-xs text-slate-500">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Generation Package"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={item.name}
                      onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-500">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-500">Unit Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-500">Subtotal</label>
                    <div className="px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-50 rounded-md border border-slate-200">
                      {(item.quantity * item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                        title="Remove line item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Calculation */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <div className="text-right">
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}
                  {calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setSelectedOpportunity('');
                setLineItems([{ name: '', quantity: 1, unit_price: 0 }]);
                setCurrency('EUR');
                setError(null);
              }}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateOffer}
              disabled={createMutation.isPending || !selectedOpportunity}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <FiltersToolbar>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.status ?? ''}
          onChange={(event) => setFilters({ status: event.target.value })}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
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
          { id: 'version', header: 'Version', cell: (offer) => `v${offer.version}` },
          { id: 'opportunity', header: 'Opportunity ID', cell: (offer) => offer.opportunity_id.substring(0, 8) + '...' },
          {
            id: 'total',
            header: 'Total',
            cell: (offer) => `€${offer.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          },
          {
            id: 'status',
            header: 'Status',
            cell: (offer) => (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(offer.status)}`}>
                {STATUSES.find((s) => s.value === offer.status)?.label || offer.status}
              </span>
            ),
          },
          {
            id: 'created',
            header: 'Created',
            cell: (offer) => new Date(offer.created_at).toLocaleDateString(),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (offer) => (
              <div className="flex gap-2 flex-wrap">
                {offer.status === 'draft' && (
                  <button
                    onClick={() => {
                      setWorkflowOffer(offer);
                      setWorkflowAction('send');
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Send
                  </button>
                )}
                {offer.status === 'sent' && (
                  <>
                    <button
                      onClick={() => {
                        setWorkflowOffer(offer);
                        setWorkflowAction('accept');
                      }}
                      className="text-sm text-green-600 hover:underline"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        setWorkflowOffer(offer);
                        setWorkflowAction('decline');
                      }}
                      className="text-sm text-orange-600 hover:underline"
                    >
                      Decline
                    </button>
                  </>
                )}
                <button
                  onClick={() => setDeletingId(offer.id)}
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

      <PaginationControls
        hasNext={Boolean(pageInfo?.hasNextPage)}
        hasPrevious={Boolean(pageInfo?.hasPreviousPage)}
        onNext={() => pagination.update({ cursor: pageInfo?.nextCursor ?? undefined })}
        onPrevious={() => pagination.update({ cursor: pageInfo?.prevCursor ?? undefined })}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Workflow Confirmation Dialog */}
      <ConfirmDialog
        isOpen={workflowOffer !== null && workflowAction !== null}
        onClose={() => {
          setWorkflowOffer(null);
          setWorkflowAction(null);
        }}
        onConfirm={() => workflowAction && handleWorkflowAction(workflowAction)}
        title={`${workflowAction === 'send' ? 'Send' : workflowAction === 'accept' ? 'Accept' : 'Decline'} Offer`}
        message={`Are you sure you want to ${workflowAction} this offer?`}
        confirmVariant={workflowAction === 'decline' ? 'danger' : 'primary'}
        isLoading={updateStatusMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Offer"
        message="Are you sure you want to delete this offer? This action cannot be undone."
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}

