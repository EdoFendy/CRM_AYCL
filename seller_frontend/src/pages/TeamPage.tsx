import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { StatsCard } from '@components/data/StatsCard';
import { DataTable } from '@components/data/DataTable';
import { StatusBadge } from '@components/ui/StatusBadge';
import { Leaderboard } from '@components/data/Leaderboard';
import { calculateTeamRankings, calculateTeamAverages } from '@utils/metricsService';
import type { TeamMember, Team, Opportunity, Activity } from '@models/index';

export default function TeamPage() {
  const { token, user } = useAuth();
  const teamId = user?.teamId || user?.resellerTeamId;

  const [teamQuery, membersQuery, opportunitiesQuery, activitiesQuery] = useQueries({
    queries: [
      {
        queryKey: ['team-detail', teamId],
        queryFn: async () => {
          if (!teamId) return null;
          const response = await apiClient<Team>(`teams/${teamId}`, { token });
          return response;
        },
        enabled: Boolean(token && teamId),
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
        enabled: Boolean(token && teamId),
      },
      {
        queryKey: ['team-opportunities', teamId],
        queryFn: async () => {
          if (!teamId) return [];
          const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
            token,
            searchParams: { team_id: teamId, limit: 10000 },
          });
          return response.data || [];
        },
        enabled: Boolean(token && teamId),
      },
      {
        queryKey: ['team-activities', teamId],
        queryFn: async () => {
          if (!teamId) return [];
          const response = await apiClient<{ data: Activity[] }>('activities', {
            token,
            searchParams: { limit: 100 },
          });
          return response.data || [];
        },
        enabled: Boolean(token && teamId),
      },
    ],
  });

  const team = teamQuery.data;
  const members = membersQuery.data ?? [];
  const opportunities = opportunitiesQuery.data ?? [];
  const activities = activitiesQuery.data ?? [];

  // Calculate team metrics
  const teamMetrics = useMemo(() => {
    return calculateTeamAverages(opportunities, members);
  }, [opportunities, members]);

  // Calculate rankings
  const rankings = useMemo(() => {
    return calculateTeamRankings(opportunities, members, user?.id);
  }, [opportunities, members, user?.id]);

  // Recent activities filtered by team members
  const teamActivities = useMemo(() => {
    const memberIds = members.map(m => m.id);
    return activities.filter(a => a.actor_id && memberIds.includes(a.actor_id)).slice(0, 10);
  }, [activities, members]);

  const headers = ['Nome', 'Email', 'Ruolo', 'Status', 'Data Ingresso'];
  const rows = members.map((member) => [
    <div key="name" className="flex items-center gap-2">
      {member.id === user?.id && (
        <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" title="Tu" />
      )}
      <span className="font-medium">{member.full_name || member.email}</span>
    </div>,
    member.email,
    <span key="role" className="capitalize">{member.role}</span>,
    <StatusBadge
      key={member.id}
      status={member.status === 'active' ? 'Attivo' : member.status === 'suspended' ? 'Sospeso' : 'Invitato'}
      variant={member.status === 'active' ? 'success' : member.status === 'suspended' ? 'error' : 'warning'}
    />,
    new Date(member.created_at).toLocaleDateString('it-IT'),
  ]);

  if (!teamId) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-900">Nessun Team Assegnato</h2>
          <p className="mt-2 text-sm text-yellow-700">
            Non sei attualmente assegnato a nessun team. Contatta l'amministratore per maggiori informazioni.
          </p>
        </div>
      </section>
    );
  }

  const isLoading = teamQuery.isLoading || membersQuery.isLoading;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Il Mio Team</h1>
        <p className="text-sm text-slate-600">Informazioni e performance del team</p>
      </div>

      {/* Team Info Card */}
      {team && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{team.name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Tipo: <span className="font-medium capitalize">{team.type}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Creato il: <span className="font-medium">{new Date(team.created_at).toLocaleDateString('it-IT')}</span>
              </p>
            </div>
            <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              {members.length} {members.length === 1 ? 'Membro' : 'Membri'}
            </div>
          </div>
        </div>
      )}

      {/* Team Performance Metrics */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Performance del Team</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Valore Totale"
            value={`€${teamMetrics.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`}
            description="Deal vinti"
          />
          <StatsCard
            title="Deal Medi"
            value={`€${teamMetrics.avgDealSize.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`}
            description="Valore medio"
          />
          <StatsCard
            title="Win Rate"
            value={`${teamMetrics.winRate.toFixed(1)}%`}
            description="Tasso di conversione"
          />
          <StatsCard
            title="Deal Totali"
            value={teamMetrics.totalDeals}
            description={`${teamMetrics.wonDeals} vinti`}
          />
        </div>
      </div>

      {/* Leaderboard */}
      <Leaderboard
        title="🏆 Top Performers del Team"
        entries={rankings}
        loading={opportunitiesQuery.isLoading}
        emptyMessage="Nessun dato disponibile"
      />

      {/* Team Members Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Membri del Team ({members.length})</h3>
          <p className="mt-1 text-xs text-slate-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 mr-1" />
            Indica il tuo profilo
          </p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            <p className="mt-2 text-sm text-slate-500">Caricamento membri...</p>
          </div>
        ) : (
          <DataTable
            headers={headers}
            rows={rows}
            emptyMessage="Nessun membro nel team"
          />
        )}
      </div>

      {/* Recent Team Activities */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Attività Recenti del Team</h3>
        {activitiesQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-6 w-16 rounded-full bg-slate-200" />
                <div className="h-4 flex-1 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : teamActivities.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna attività recente</p>
        ) : (
          <ul className="space-y-3 divide-y divide-slate-200">
            {teamActivities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                    {activity.type}
                  </span>
                  <div>
                    <p className="text-slate-800">{activity.content}</p>
                    {activity.actor_name && (
                      <p className="text-xs text-slate-500">
                        da <span className="font-medium">{activity.actor_name}</span>
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(activity.occurred_at).toLocaleString('it-IT', { timeStyle: 'short', dateStyle: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>ℹ️ Nota:</strong> Questa è una visualizzazione di sola lettura. Per modifiche al team (aggiungere/rimuovere membri, cambiare impostazioni), contatta l'amministratore del sistema.
        </p>
      </div>

      {(teamQuery.isError || membersQuery.isError) && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Errore nel caricamento dei dati del team
        </p>
      )}
    </section>
  );
}
