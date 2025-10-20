import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { StatsCard } from '../components/data/StatsCard';

interface Opportunity {
  id: string;
  value: number;
  stage: string;
  created_at: string;
}

interface Contract {
  id: string;
  status: string;
}

interface Task {
  id: string;
  status: string;
  due_date: string | null;
}

interface Ticket {
  id: string;
  status: string;
}

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'qualifying', label: 'Qualifying' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

export default function DashboardPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  // Inbox (latest activities for current seller)
  const inboxQuery = useQuery({
    queryKey: ['dashboard-inbox'],
    queryFn: async () => {
      const response = await apiClient<{ data: any[] }>('activities', {
        token,
        searchParams: { limit: 10 },
      });
      return response.data || [];
    },
  });

  // Load opportunities
  const opportunitiesQuery = useQuery({
    queryKey: ['dashboard-opportunities'],
    queryFn: async () => {
      const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  // Load contracts
  const contractsQuery = useQuery({
    queryKey: ['dashboard-contracts'],
    queryFn: async () => {
      const response = await apiClient<{ data: Contract[] }>('contracts', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  // Load tasks
  const tasksQuery = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const response = await apiClient<{ data: Task[] }>('tasks', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  // Load tickets
  const ticketsQuery = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: async () => {
      const response = await apiClient<{ data: Ticket[] }>('tickets', {
        token,
        searchParams: { limit: 1000 },
      });
      return response.data || [];
    },
  });

  const opportunities = opportunitiesQuery.data ?? [];
  const contracts = contractsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const tickets = ticketsQuery.data ?? [];
  const inbox = inboxQuery.data ?? [];

  // Calculate metrics
  const metrics = useMemo(() => {
    // Pipeline value
    const toNumber = (v: unknown): number => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const totalPipelineValue = opportunities
      .filter((opp) => !['closed_won', 'closed_lost'].includes(opp.stage))
      .reduce((sum, opp) => sum + toNumber(opp.value), 0);

    // Won deals value
    const wonValue = opportunities
      .filter((opp) => opp.stage === 'closed_won')
      .reduce((sum, opp) => sum + toNumber(opp.value), 0);

    // Win rate
    const closedOpps = opportunities.filter((opp) => ['closed_won', 'closed_lost'].includes(opp.stage));
    const wonCount = opportunities.filter((opp) => opp.stage === 'closed_won').length;
    const winRate = closedOpps.length > 0 ? (wonCount / closedOpps.length) * 100 : 0;

    // Contracts
    const signedContracts = contracts.filter((c) => c.status === 'signed').length;
    const pendingContracts = contracts.filter((c) => c.status === 'pending').length;

    // Tasks
    const openTasks = tasks.filter((t) => t.status === 'open').length;
    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    ).length;

    // Tickets
    const openTickets = tickets.filter((t) => t.status === 'open').length;

    // Pipeline by stage
    const pipelineByStage = STAGES.map((stage) => {
      const stageOpps = opportunities.filter((opp) => opp.stage === stage.value);
      const stageValue = stageOpps.reduce((sum, opp) => sum + toNumber(opp.value), 0);
      return {
        stage: stage.label,
        count: stageOpps.length,
        value: stageValue,
      };
    });

    const maxStageValue = Math.max(...pipelineByStage.map((s) => s.value), 1);

    return {
      totalPipelineValue,
      wonValue,
      winRate,
      signedContracts,
      pendingContracts,
      openTasks,
      overdueTasks,
      openTickets,
      pipelineByStage,
      maxStageValue,
    };
  }, [opportunities, contracts, tasks, tickets]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{t('dashboard.title')}</h2>
          <p className="text-sm text-slate-500">{format(new Date(), 'PPPP')}</p>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link to="/opportunities" className="block">
          <StatsCard
            title="Total Pipeline Value"
            value={`€${metrics.totalPipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          />
        </Link>
        <Link to="/opportunities?stage=closed_won" className="block">
          <StatsCard
            title="Won Deals Value"
            value={`€${metrics.wonValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          />
        </Link>
        <Link to="/contracts" className="block">
          <StatsCard title="Signed Contracts" value={metrics.signedContracts} />
        </Link>
        <Link to="/contracts?status=pending" className="block">
          <StatsCard title="Pending Contracts" value={metrics.pendingContracts} />
        </Link>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} />
        <Link to="/tasks?status=open" className="block">
          <StatsCard title="Open Tasks" value={metrics.openTasks} />
        </Link>
        <Link to="/tasks" className="block">
          <StatsCard title="Overdue Tasks" value={metrics.overdueTasks} className="text-red-600" />
        </Link>
        <Link to="/tickets?status=open" className="block">
          <StatsCard title="Open Tickets" value={metrics.openTickets} />
        </Link>
      </div>

      {/* Pipeline by Stage */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Sales Pipeline</h3>
          <Link to="/opportunities" className="text-sm text-primary hover:underline">
            View All →
          </Link>
        </div>
        <div className="space-y-4">
          {metrics.pipelineByStage.map((stage) => (
            <div key={stage.stage} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{stage.stage}</span>
                <div className="text-right">
                  <span className="font-semibold text-slate-900">
                    €{stage.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                  <span className="ml-2 text-slate-500">({stage.count})</span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full bg-primary transition-all"
                  style={{ width: `${(stage.value / metrics.maxStageValue) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seller Inbox */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Inbox</h3>
          <Link to="/activities" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {inbox.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activities</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {inbox.map((a) => (
              <li key={a.id} className="py-2 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">{a.type}</span>
                  <span className="text-slate-800">{a.content ?? '—'}</span>
                </div>
                <span className="text-xs text-slate-500">{new Date(a.occurred_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/opportunities"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <h4 className="font-semibold text-slate-900">Opportunities</h4>
          <p className="mt-1 text-sm text-slate-600">Manage your sales pipeline</p>
          <p className="mt-2 text-2xl font-bold text-primary">{opportunities.length}</p>
        </Link>
        <Link
          to="/contacts"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <h4 className="font-semibold text-slate-900">Contacts</h4>
          <p className="mt-1 text-sm text-slate-600">View all contacts</p>
          <p className="mt-2 text-sm text-primary">Manage contacts →</p>
        </Link>
        <Link
          to="/tasks"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <h4 className="font-semibold text-slate-900">Tasks</h4>
          <p className="mt-1 text-sm text-slate-600">Track your activities</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{metrics.openTasks}</p>
        </Link>
      </div>

      {(opportunitiesQuery.isError ||
        contractsQuery.isError ||
        tasksQuery.isError ||
        ticketsQuery.isError) && (
        <p className="text-sm text-red-600">Error loading dashboard data</p>
      )}
    </section>
  );
}
