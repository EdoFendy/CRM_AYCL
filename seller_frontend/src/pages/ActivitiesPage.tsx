import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { useDataScope } from '@hooks/useDataScope';
import { ScopeSwitch } from '@components/ui/ScopeSwitch';
import { StatsCard } from '@components/data/StatsCard';
import type { Activity } from '@models/index';

const ACTIVITY_TYPES = [
  { value: 'all', label: 'Tutte' },
  { value: 'opportunity', label: 'Opportunità' },
  { value: 'contact', label: 'Contatti' },
  { value: 'task', label: 'Task' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'payment', label: 'Pagamenti' },
];

export default function ActivitiesPage() {
  const { token } = useAuth();
  const { scope, setScope, hasTeam } = useDataScope();
  const [selectedType, setSelectedType] = useState('all');

  const activitiesQuery = useQuery({
    queryKey: ['seller-activities', scope],
    queryFn: async () => {
      const response = await apiClient<{ data: Activity[] }>('activities', {
        token,
        searchParams: { limit: 500 },
      });
      return response.data || [];
    },
    enabled: Boolean(token),
  });

  const activities = activitiesQuery.data ?? [];

  const filteredActivities = useMemo(() => {
    if (selectedType === 'all') return activities;
    return activities.filter((a) => a.type.toLowerCase() === selectedType.toLowerCase());
  }, [activities, selectedType]);

  const typeStats = useMemo(() => {
    return ACTIVITY_TYPES
      .filter((type) => type.value !== 'all')
      .map((type) => ({
        type: type.value,
        label: type.label,
        count: activities.filter((a) => a.type.toLowerCase() === type.value.toLowerCase()).length,
      }))
      .filter((t) => t.count > 0);
  }, [activities]);

  const getActivityColor = (type: string) => {
    const colorMap: Record<string, string> = {
      opportunity: 'bg-blue-100 text-blue-700 border-blue-200',
      contact: 'bg-green-100 text-green-700 border-green-200',
      task: 'bg-purple-100 text-purple-700 border-purple-200',
      checkout: 'bg-orange-100 text-orange-700 border-orange-200',
      payment: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      default: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colorMap[type.toLowerCase()] || colorMap.default;
  };

  return (
    <section className="space-y-6">
      {/* Header with Scope Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Attività {scope === 'team' && '(Team)'}
          </h1>
          <p className="text-sm text-slate-600">
            {scope === 'personal' 
              ? 'Timeline delle tue attività' 
              : 'Timeline attività del team'}
          </p>
        </div>
        {hasTeam && <ScopeSwitch scope={scope} onChange={setScope} />}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Totale Attività"
          value={activities.length}
          description="Ultimi 500 eventi"
        />
        <StatsCard
          title="Oggi"
          value={activities.filter(a => {
            const date = new Date(a.occurred_at);
            const today = new Date();
            return date.toDateString() === today.toDateString();
          }).length}
          description="Eventi di oggi"
        />
        <StatsCard
          title="Questa Settimana"
          value={activities.filter(a => {
            const date = new Date(a.occurred_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date >= weekAgo;
          }).length}
          description="Ultimi 7 giorni"
        />
        <StatsCard
          title="Questo Mese"
          value={activities.filter(a => {
            const date = new Date(a.occurred_at);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
          }).length}
          description="Mese corrente"
        />
      </div>

      {/* Type Filter */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">Filtra per tipo:</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type.label}
              {type.value !== 'all' && (
                <span className="ml-2 text-xs font-bold">
                  ({activities.filter((a) => a.type.toLowerCase() === type.value.toLowerCase()).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Type Distribution */}
      {typeStats.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Distribuzione per Tipo</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {typeStats.map((stat) => (
              <div key={stat.type} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <span className="text-sm font-medium text-slate-700">{stat.label}</span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                  {stat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities Feed */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">
            Feed Attività ({filteredActivities.length})
          </h3>
        </div>
        {activitiesQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            <p className="mt-2 text-sm text-slate-500">Caricamento attività...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Nessuna attività trovata</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getActivityColor(activity.type)}`}>
                    {activity.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{activity.content}</p>
                    {scope === 'team' && activity.actor_name && (
                      <p className="mt-1 text-xs text-slate-500">
                        da <span className="font-medium">{activity.actor_name}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(activity.occurred_at).toLocaleString('it-IT', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activitiesQuery.isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Errore nel caricamento delle attività
        </p>
      )}
    </section>
  );
}
