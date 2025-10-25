import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { DataTable } from '@/components/data/DataTable';
import { FiltersToolbar } from '@/components/forms/FiltersToolbar';
import { Modal } from '@/components/ui/Modal';

interface OpportunityRow {
  id: string;
  company_id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  owner_id: string | null;
  expected_close_date: string | null;
  source: string | null;
  referral_id: string | null;
  created_at: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
}

const STAGES = [
  { value: 'new', label: 'New', color: 'bg-slate-100 text-slate-700' },
  { value: 'qualifying', label: 'Qualifying', color: 'bg-blue-100 text-blue-700' },
  { value: 'discovery', label: 'Discovery', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-700' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-700' },
];

const opportunitySchema = z.object({
  company_id: z.string().uuid(),
  title: z.string().min(3),
  value: z.number().min(0),
  currency: z.string().default('EUR'),
  stage: z.string().default('new'),
  probability: z.number().min(0).max(100).default(50),
  expected_close_date: z.string().optional(),
  source: z.string().optional(),
  referral_id: z.string().uuid().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

export default function OpportunitiesPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState<OpportunityRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filters, setFilters] = useState({
    stage: '',
    query: '',
  });

  // Load opportunities for current seller
  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', filters],
    queryFn: async () => {
      setError(null);
      try {
        const response = await apiClient<{ data: OpportunityRow[] }>('opportunities', {
          token,
          searchParams: {
            ...filters,
            owner_id: user?.id, // Filter by current seller
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
    mutationFn: (values: OpportunityFormValues) =>
      apiClient<OpportunityRow>('opportunities', {
        method: 'POST',
        token,
        body: {
          ...values,
          owner_id: user?.id, // Assign to current seller
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setShowCreateForm(false);
      form.reset();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OpportunityFormValues> }) =>
      apiClient<OpportunityRow>(`opportunities/${id}`, {
        method: 'PATCH',
        token,
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setShowEditModal(false);
      setEditingOpp(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      company_id: '',
      title: '',
      value: 0,
      currency: 'EUR',
      stage: 'new',
      probability: 50,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    await createMutation.mutateAsync(values);
  });

  const handleEdit = (opp: OpportunityRow) => {
    setEditingOpp(opp);
    form.reset({
      company_id: opp.company_id,
      title: opp.title,
      value: opp.value,
      currency: opp.currency,
      stage: opp.stage,
      probability: opp.probability,
      expected_close_date: opp.expected_close_date || '',
      source: opp.source || '',
      referral_id: opp.referral_id || '',
    });
    setShowEditModal(true);
  };

  const onEditSubmit = form.handleSubmit(async (values) => {
    if (!editingOpp) return;
    setError(null);
    await updateMutation.mutateAsync({ id: editingOpp.id, data: values });
  });

  const rows = opportunitiesQuery.data ?? [];
  const companies = companiesQuery.data ?? [];

  // Calculate metrics
  const metrics = useMemo(() => {
    const toNumber = (v: unknown): number => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const activeOpportunities = rows.filter((opp: OpportunityRow) => opp.stage !== 'closed_lost');
    const totalValue = activeOpportunities.reduce((sum: number, opp: OpportunityRow) => sum + toNumber(opp.value), 0);
    const avgValue = activeOpportunities.length > 0 ? totalValue / activeOpportunities.length : 0;
    
    const byStage = STAGES.map((stage) => ({
      stage: stage.label,
      count: rows.filter((opp: OpportunityRow) => opp.stage === stage.value).length,
      value: rows.filter((opp: OpportunityRow) => opp.stage === stage.value).reduce((sum: number, opp: OpportunityRow) => sum + toNumber(opp.value), 0),
    }));
    
    const wonCount = rows.filter((opp: OpportunityRow) => opp.stage === 'closed_won').length;
    const lostCount = rows.filter((opp: OpportunityRow) => opp.stage === 'closed_lost').length;
    const winRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    return { totalValue, avgValue, byStage, winRate, activeCount: activeOpportunities.length };
  }, [rows]);

  const getStageColor = (stage: string) => {
    return STAGES.find((s) => s.value === stage)?.color || 'bg-slate-100 text-slate-700';
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.ragione_sociale || 'Unknown';
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">My Opportunities</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              viewMode === 'table' ? 'bg-primary text-white' : 'bg-white border border-slate-300 text-slate-700'
            }`}
            onClick={() => setViewMode('table')}
          >
            Table View
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              viewMode === 'kanban' ? 'bg-primary text-white' : 'bg-white border border-slate-300 text-slate-700'
            }`}
            onClick={() => setViewMode('kanban')}
          >
            Kanban View
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : '+ New Opportunity'}
          </button>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">My Pipeline Value</p>
          <p className="text-2xl font-bold text-slate-900">
            €{metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">Excludes closed lost</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Average Deal Size</p>
          <p className="text-2xl font-bold text-slate-900">
            €{metrics.avgValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">{metrics.activeCount} active deals</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Opportunities</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
          <p className="text-xs text-slate-400 mt-1">All stages</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Win Rate</p>
          <p className="text-2xl font-bold text-green-600">{metrics.winRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-1">Won vs Lost</p>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. New Enterprise Deal"
              {...form.register('title')}
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
            <label className="text-xs font-medium text-slate-600" htmlFor="value">
              Value (€) *
            </label>
            <input
              id="value"
              type="number"
              step="0.01"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="10000"
              {...form.register('value', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="stage">
              Stage
            </label>
            <select
              id="stage"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('stage')}
            >
              {STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="probability">
              Probability (%)
            </label>
            <input
              id="probability"
              type="number"
              min="0"
              max="100"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('probability', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="expected_close_date">
              Expected Close Date
            </label>
            <input
              id="expected_close_date"
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('expected_close_date')}
            />
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
              <option value="organic">Organic</option>
              <option value="referral">Referral</option>
              <option value="ads">Advertising</option>
              <option value="partner">Partner</option>
              <option value="cold_outreach">Cold Outreach</option>
              <option value="event">Event</option>
            </select>
          </div>
          <div className="md:col-span-3 text-right">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createMutation.isPending}
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <FiltersToolbar>
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search opportunities..."
          value={filters.query}
          onChange={(event) => setFilters({ ...filters, query: event.target.value })}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.stage}
          onChange={(event) => setFilters({ ...filters, stage: event.target.value })}
        >
          <option value="">All Stages</option>
          {STAGES.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
        <button 
          type="button" 
          className="rounded-md border border-slate-300 px-3 py-2 text-sm" 
          onClick={() => setFilters({ stage: '', query: '' })}
        >
          Reset
        </button>
      </FiltersToolbar>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
            {STAGES.map((stage) => {
              const stageOpps = rows.filter((opp: OpportunityRow) => opp.stage === stage.value);
              const stageValue = stageOpps.reduce((sum: number, opp: OpportunityRow) => sum + (typeof opp.value === 'number' ? opp.value : Number(opp.value) || 0), 0);
              return (
                <div key={stage.value} className="w-80 flex-shrink-0">
                  <div className="mb-3 rounded-lg bg-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-900">{stage.label}</h3>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700">
                        {stageOpps.length}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      €{stageValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {stageOpps.map((opp) => (
                      <div key={opp.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                        <Link to={`/contacts/${opp.company_id}`} className="font-medium text-primary hover:underline">
                          {opp.title}
                        </Link>
                        <p className="mt-1 text-xs text-slate-600">{getCompanyName(opp.company_id)}</p>
                        <p className="mt-1 text-sm font-semibold text-green-600">
                          €{opp.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{opp.probability}% probability</span>
                          {opp.expected_close_date && (
                            <span>{new Date(opp.expected_close_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <DataTable<OpportunityRow>
          data={rows}
          columns={[
            {
              id: 'title',
              header: 'Title',
              cell: (opp: OpportunityRow) => (
                <div>
                  <p className="font-medium text-slate-900">{opp.title}</p>
                  <Link to={`/contacts/${opp.company_id}`} className="text-xs text-primary hover:underline">
                    {getCompanyName(opp.company_id)}
                  </Link>
                </div>
              ),
            },
            {
              id: 'value',
              header: 'Value',
              cell: (opp: OpportunityRow) => (
                <div>
                  <p className="font-semibold text-slate-900">
                    €{opp.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ),
            },
            {
              id: 'stage',
              header: 'Stage',
              cell: (opp: OpportunityRow) => (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStageColor(opp.stage)}`}>
                  {STAGES.find((s) => s.value === opp.stage)?.label || opp.stage}
                </span>
              ),
            },
            { id: 'probability', header: 'Probability', cell: (opp: OpportunityRow) => `${opp.probability}%` },
            {
              id: 'expected_close',
              header: 'Expected Close',
              cell: (opp: OpportunityRow) =>
                opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '—',
            },
            { id: 'source', header: 'Source', cell: (opp: OpportunityRow) => opp.source || '—' },
            {
              id: 'actions',
              header: 'Actions',
              cell: (opp: OpportunityRow) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(opp)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ),
            },
          ]}
          emptyState={<span>No opportunities found</span>}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingOpp(null);
        }}
        title="Edit Opportunity"
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
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_title">
                Title *
              </label>
              <input
                id="edit_title"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('title')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_value">
                Value *
              </label>
              <input
                id="edit_value"
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('value', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_stage">
                Stage *
              </label>
              <select
                id="edit_stage"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('stage')}
              >
                {STAGES.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_probability">
                Probability (%)
              </label>
              <input
                id="edit_probability"
                type="number"
                min="0"
                max="100"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('probability', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_expected_close_date">
                Expected Close Date
              </label>
              <input
                id="edit_expected_close_date"
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('expected_close_date')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="edit_source">
                Source
              </label>
              <input
                id="edit_source"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register('source')}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingOpp(null);
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