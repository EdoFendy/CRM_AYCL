import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { StatsCard } from '@/components/data/StatsCard';

interface Opportunity {
  id: string;
  value: number;
  stage: string;
  created_at: string;
}

interface Contract {
  id: string;
  status: string;
  value: number;
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
  const { token, user } = useAuth();

  // Load opportunities for current seller
  const opportunitiesQuery = useQuery({
    queryKey: ['dashboard-opportunities'],
    queryFn: async () => {
      const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: { 
          limit: 1000,
          owner_id: user?.id // Filter by current seller
        },
      });
      return response.data || [];
    },
  });

  // Load contracts for current seller
  const contractsQuery = useQuery({
    queryKey: ['dashboard-contracts'],
    queryFn: async () => {
      const response = await apiClient<{ data: Contract[] }>('contracts', {
        token,
        searchParams: { 
          limit: 1000,
          seller_id: user?.id // Filter by current seller
        },
      });
      return response.data || [];
    },
  });

  // Load tasks for current seller
  const tasksQuery = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const response = await apiClient<{ data: Task[] }>('tasks', {
        token,
        searchParams: { 
          limit: 1000,
          assigned_to: user?.id // Filter by current seller
        },
      });
      return response.data || [];
    },
  });

  // Load tickets for current seller
  const ticketsQuery = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: async () => {
      const response = await apiClient<{ data: Ticket[] }>('tickets', {
        token,
        searchParams: { 
          limit: 1000,
          user_id: user?.id // Filter by current seller
        },
      });
      return response.data || [];
    },
  });

  const opportunities = opportunitiesQuery.data ?? [];
  const contracts = contractsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const tickets = ticketsQuery.data ?? [];

  // Calculate metrics
  const metrics = useMemo(() => {
    const toNumber = (v: unknown): number => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // Pipeline value (exclude closed_lost)
    const activeOpportunities = opportunities.filter(opp => opp.stage !== 'closed_lost');
    const totalPipelineValue = activeOpportunities.reduce((sum, opp) => sum + toNumber(opp.value), 0);
    
    // Won value
    const wonOpportunities = opportunities.filter(opp => opp.stage === 'closed_won');
    const wonValue = wonOpportunities.reduce((sum, opp) => sum + toNumber(opp.value), 0);
    
    // Win rate
    const closedOpportunities = opportunities.filter(opp => opp.stage === 'closed_won' || opp.stage === 'closed_lost');
    const winRate = closedOpportunities.length > 0 
      ? (wonOpportunities.length / closedOpportunities.length) * 100 
      : 0;

    // Contracts
    const signedContracts = contracts.filter(contract => contract.status === 'signed').length;
    const pendingContracts = contracts.filter(contract => contract.status === 'pending').length;
    const contractValue = contracts
      .filter(contract => contract.status === 'signed')
      .reduce((sum, contract) => sum + toNumber(contract.value), 0);

    // Tasks
    const openTasks = tasks.filter(task => task.status === 'open').length;
    const overdueTasks = tasks.filter(task => {
      if (!task.due_date) return false;
      return new Date(task.due_date) < new Date() && task.status !== 'completed';
    }).length;

    // Tickets
    const openTickets = tickets.filter(ticket => ticket.status === 'open').length;

    // Pipeline by stage
    const pipelineByStage = STAGES.map(stage => {
      const stageOpps = opportunities.filter(opp => opp.stage === stage.value);
      const stageValue = stageOpps.reduce((sum, opp) => sum + toNumber(opp.value), 0);
      return {
        stage: stage.label,
        count: stageOpps.length,
        value: stageValue,
      };
    });

    const maxStageValue = Math.max(...pipelineByStage.map(s => s.value), 1);

    return {
      totalPipelineValue,
      wonValue,
      winRate,
      signedContracts,
      pendingContracts,
      contractValue,
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
          <h2 className="text-2xl font-semibold text-slate-900">Seller Dashboard</h2>
          <p className="text-sm text-slate-500">
            Welcome back, {user?.email} • {format(new Date(), 'PPPP')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Referral Code:</span>
          <span className="font-mono text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
            {user?.referralCode || 'N/A'}
          </span>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link to="/opportunities" className="block">
          <StatsCard
            title="My Pipeline Value"
            value={`€${metrics.totalPipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle="Active opportunities"
            icon="🎯"
          />
        </Link>
        <Link to="/opportunities?stage=closed_won" className="block">
          <StatsCard
            title="Won Deals Value"
            value={`€${metrics.wonValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle="Closed won opportunities"
            icon="🏆"
          />
        </Link>
        <Link to="/contracts" className="block">
          <StatsCard 
            title="Signed Contracts" 
            value={metrics.signedContracts}
            subtitle={`€${metrics.contractValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} value`}
            icon="📄"
          />
        </Link>
        <Link to="/tasks" className="block">
          <StatsCard 
            title="Open Tasks" 
            value={metrics.openTasks}
            subtitle={`${metrics.overdueTasks} overdue`}
            icon="✅"
          />
        </Link>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          subtitle="Success rate"
          icon="📈"
        />
        <StatsCard
          title="Pending Contracts"
          value={metrics.pendingContracts}
          subtitle="Awaiting signature"
          icon="⏳"
        />
        <StatsCard
          title="Support Tickets"
          value={metrics.openTickets}
          subtitle="Open tickets"
          icon="🎫"
        />
        <StatsCard
          title="Total Opportunities"
          value={opportunities.length}
          subtitle="All stages"
          icon="📊"
        />
      </div>

      {/* Pipeline Visualization */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Pipeline by Stage</h3>
        <div className="space-y-3">
          {metrics.pipelineByStage.map((stage) => (
            <div key={stage.stage} className="flex items-center">
              <div className="w-24 text-sm font-medium text-slate-600">{stage.stage}</div>
              <div className="flex-1 mx-4">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(stage.value / metrics.maxStageValue) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-right">
                <div className="text-sm font-semibold text-slate-900">
                  €{stage.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-slate-500">{stage.count} deals</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/opportunities"
          className="block p-6 rounded-lg border border-slate-200 bg-white hover:border-primary/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Manage Opportunities</h3>
              <p className="text-sm text-slate-500">Track and manage your sales pipeline</p>
            </div>
          </div>
        </Link>

        <Link
          to="/contacts"
          className="block p-6 rounded-lg border border-slate-200 bg-white hover:border-primary/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Manage Contacts</h3>
              <p className="text-sm text-slate-500">Organize your customer relationships</p>
            </div>
          </div>
        </Link>

        <Link
          to="/referrals"
          className="block p-6 rounded-lg border border-slate-200 bg-white hover:border-primary/50 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🔗</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Referral Program</h3>
              <p className="text-sm text-slate-500">Track and manage your referrals</p>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}