import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { useDataScope } from '@hooks/useDataScope';
import { StatsComparison } from '@components/data/StatsComparison';
import { Leaderboard } from '@components/data/Leaderboard';
import { ScopeSwitch } from '@components/ui/ScopeSwitch';
import { safeToNumber } from '@utils/numberUtils';
import {
  calculatePersonalMetrics,
  calculateTeamAverages,
  calculateTeamRankings,
  calculateGlobalRankings,
  getCurrentUserRank,
  getTopPerformers,
} from '@utils/metricsService';
import type { Opportunity, Task, Activity, TeamMember } from '@models/index';

const STAGES = [
  { value: 'new', label: 'Nuovo' },
  { value: 'qualifying', label: 'In Qualificazione' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'negotiation', label: 'Negoziazione' },
  { value: 'closed_won', label: 'Vinto' },
  { value: 'closed_lost', label: 'Perso' },
];

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { scope, setScope, getFilterParams, hasTeam, teamId, userId } = useDataScope();

  // Load data with scope filtering
  const [opportunitiesQuery, tasksQuery, activitiesQuery, teamMembersQuery, allSellersQuery] = useQueries({
    queries: [
      {
        queryKey: ['dashboard-opportunities', scope],
        queryFn: async () => {
          const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
            token,
            searchParams: { ...getFilterParams(), limit: 1000 },
          });
          return response.data || [];
        },
        enabled: Boolean(token),
      },
      {
        queryKey: ['dashboard-tasks', scope],
        queryFn: async () => {
          const response = await apiClient<{ data: Task[] }>('tasks', {
            token,
            searchParams: { ...getFilterParams(), limit: 1000 },
          });
          return response.data || [];
        },
        enabled: Boolean(token),
      },
      {
        queryKey: ['dashboard-activities', scope],
        queryFn: async () => {
          const response = await apiClient<{ data: Activity[] }>('activities', {
            token,
            searchParams: { limit: 10 },
          });
          return response.data || [];
        },
        enabled: Boolean(token),
      },
      {
        queryKey: ['team-members', teamId],
        queryFn: async () => {
          if (!teamId) return [];
          const response = await apiClient<{ data: TeamMember[] }>('users', {
            token,
            searchParams: { team_id: teamId, limit: 1000 },
          });
          return response.data || [];
        },
        enabled: Boolean(token && teamId && hasTeam),
      },
      {
        queryKey: ['all-sellers'],
        queryFn: async () => {
          const response = await apiClient<{ data: TeamMember[] }>('users', {
        token,
            searchParams: { role: 'seller', limit: 1000 },
          });
          return response.data || [];
        },
        enabled: Boolean(token && hasTeam),
      },
    ],
  });

  // Load personal opportunities for rankings (always personal, not scoped)
  const personalOpportunitiesQuery = useQuery({
    queryKey: ['personal-opportunities'],
    queryFn: async () => {
      const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: { owner: userId, limit: 1000 },
      });
      return response.data || [];
    },
    enabled: Boolean(token && userId),
  });

  // Load all opportunities for rankings calculation
  const allOpportunitiesQuery = useQuery({
    queryKey: ['all-opportunities-for-rankings'],
    queryFn: async () => {
      const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: { limit: 10000 },
      });
      return response.data || [];
    },
    enabled: Boolean(token && hasTeam),
  });

  const opportunities = opportunitiesQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const activities = activitiesQuery.data ?? [];
  const teamMembers = teamMembersQuery.data ?? [];
  const allSellers = allSellersQuery.data ?? [];
  const personalOpportunities = personalOpportunitiesQuery.data ?? [];
  const allOpportunities = allOpportunitiesQuery.data ?? [];

  // Calculate personal metrics
  const personalMetrics = useMemo(() => {
    return calculatePersonalMetrics(personalOpportunities);
  }, [personalOpportunities]);

  // Calculate team metrics
  const teamMetrics = useMemo(() => {
    if (!hasTeam || scope === 'personal') return null;
    return calculateTeamAverages(opportunities, teamMembers);
  }, [hasTeam, scope, opportunities, teamMembers]);

  // Calculate rankings
  const { teamRankings, globalRankings, currentUserTeamRank, currentUserGlobalRank } = useMemo(() => {
    if (!hasTeam || !userId) {
      return {
        teamRankings: [],
        globalRankings: [],
        currentUserTeamRank: null,
        currentUserGlobalRank: null,
      };
    }

    const teamRanks = calculateTeamRankings(allOpportunities, teamMembers, userId);
    const globalRanks = calculateGlobalRankings(allOpportunities, allSellers, userId);

    return {
      teamRankings: teamRanks,
      globalRankings: globalRanks,
      currentUserTeamRank: getCurrentUserRank(teamRanks, userId),
      currentUserGlobalRank: getCurrentUserRank(globalRanks, userId),
    };
  }, [hasTeam, userId, allOpportunities, teamMembers, allSellers]);

  // Calculate display metrics (respects scope)
  const displayMetrics = useMemo(() => {

    const activeOpps = opportunities.filter((opp) => !['closed_won', 'closed_lost'].includes(opp.stage));
    const wonOpps = opportunities.filter((opp) => opp.stage === 'closed_won');
    const lostOpps = opportunities.filter((opp) => opp.stage === 'closed_lost');
    const closedOpps = [...wonOpps, ...lostOpps];

    const totalPipelineValue = activeOpps.reduce((sum, opp) => sum + safeToNumber(opp.value), 0);
    const wonValue = wonOpps.reduce((sum, opp) => sum + safeToNumber(opp.value), 0);
    const winRate = closedOpps.length > 0 ? (wonOpps.length / closedOpps.length) * 100 : 0;

    const openTasks = tasks.filter((t) => t.status === 'open').length;
    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    ).length;

    const pipelineByStage = STAGES.map((stage) => {
      const stageOpps = opportunities.filter((opp) => opp.stage === stage.value);
      const stageValue = stageOpps.reduce((sum, opp) => sum + safeToNumber(opp.value), 0);
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
      openTasks,
      overdueTasks,
      pipelineByStage,
      maxStageValue,
      activeDeals: activeOpps.length,
      wonDeals: wonOpps.length,
    };
  }, [opportunities, tasks]);

  const isLoading =
    opportunitiesQuery.isLoading || tasksQuery.isLoading || activitiesQuery.isLoading;

  return (
    <section className="space-y-6">
      {/* Header with Scope Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {scope === 'personal' ? 'Il tuo Dashboard' : 'Dashboard del Team'}
          </h2>
          <p className="text-sm text-slate-500">{format(new Date(), 'PPPP')}</p>
          </div>
        {hasTeam && <ScopeSwitch scope={scope} onChange={setScope} />}
          </div>

      {/* Main KPIs with Comparison */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsComparison
          title="Valore Pipeline"
          personalValue={scope === 'personal' ? personalMetrics.totalPipelineValue : displayMetrics.totalPipelineValue}
          teamAverage={scope === 'team' && teamMetrics ? teamMetrics.totalValue / teamMetrics.memberCount : undefined}
          rank={currentUserTeamRank?.rank}
          totalMembers={teamMembers.length}
          format="currency"
          description={`${displayMetrics.activeDeals} opportunità attive`}
        />
        
        <StatsComparison
          title="Opportunità Vinte"
          personalValue={scope === 'personal' ? personalMetrics.wonValue : displayMetrics.wonValue}
          teamAverage={scope === 'team' && teamMetrics ? teamMetrics.avgDealSize : undefined}
          format="currency"
          description={`${displayMetrics.wonDeals} deal chiusi`}
        />
        
        <Link to="/tasks" className="block">
          <StatsComparison
            title="Task Aperti"
            personalValue={displayMetrics.openTasks}
            format="number"
            description={displayMetrics.overdueTasks > 0 ? `${displayMetrics.overdueTasks} scaduti` : 'Nessuno scaduto'}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          />
        </Link>
        
        <StatsComparison
          title="Win Rate"
          personalValue={scope === 'personal' ? personalMetrics.winRate : displayMetrics.winRate}
          teamAverage={scope === 'team' && teamMetrics ? teamMetrics.winRate : undefined}
          format="percentage"
          description="Tasso di conversione"
        />
          </div>

      {/* Leaderboards - Only show if user has team */}
      {hasTeam && (
        <div className="grid gap-4 md:grid-cols-2">
          <Leaderboard
            title="🏆 Classifica Team"
            entries={getTopPerformers(teamRankings, 5)}
            loading={teamMembersQuery.isLoading || allOpportunitiesQuery.isLoading}
            emptyMessage="Nessun dato disponibile per il team"
          />
          
          <Leaderboard
            title="🌍 Classifica Globale"
            entries={getTopPerformers(globalRankings, 5)}
            loading={allSellersQuery.isLoading || allOpportunitiesQuery.isLoading}
            emptyMessage="Nessun dato disponibile"
          />
        </div>
      )}

      {/* Pipeline by Stage */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Pipeline per Fase {scope === 'team' && '(Team)'}
          </h3>
          <Link to="/opportunities" className="text-sm text-blue-600 hover:underline">
            Visualizza tutto →
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="h-2 w-full rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {displayMetrics.pipelineByStage.map((stage) => (
              <div key={stage.stage} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{stage.stage}</span>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900">
                      €{stage.value.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                    </span>
                    <span className="ml-2 text-slate-500">({stage.count})</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${(stage.value / displayMetrics.maxStageValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attività Recenti */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Attività Recenti</h3>
          <Link to="/activities" className="text-sm text-blue-600 hover:underline">
            Visualizza tutto →
          </Link>
        </div>
        {activitiesQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-6 w-16 rounded-full bg-slate-200" />
                <div className="h-4 flex-1 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna attività recente</p>
        ) : (
          <ul className="space-y-3 divide-y divide-slate-200">
            {activities.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                    {a.type}
                  </span>
                  <span className="text-slate-800">{a.content ?? '—'}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(a.occurred_at).toLocaleString('it-IT')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/opportunities"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h4 className="font-semibold text-slate-900">Opportunità</h4>
          <p className="mt-1 text-sm text-slate-600">Gestisci il tuo pipeline di vendita</p>
          <p className="mt-3 text-3xl font-bold text-blue-600">{opportunities.length}</p>
          </Link>
        
        <Link
          to="/contacts"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h4 className="font-semibold text-slate-900">Contatti</h4>
          <p className="mt-1 text-sm text-slate-600">Visualizza tutti i contatti</p>
          <p className="mt-3 text-sm font-medium text-blue-600">Gestisci contatti →</p>
          </Link>
        
        <Link
          to="/starter-kit"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h4 className="font-semibold text-slate-900">Starter Kit</h4>
          <p className="mt-1 text-sm text-slate-600">Crea carrelli e preventivi</p>
          <p className="mt-3 text-sm font-medium text-blue-600">Vai al kit →</p>
          </Link>
        </div>

      {/* Error Messages */}
      {(opportunitiesQuery.isError || tasksQuery.isError || activitiesQuery.isError) && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Errore nel caricamento dei dati della dashboard
        </p>
      )}
      </section>
  );
}
