import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { useDataScope } from '@hooks/useDataScope';
import { ScopeSwitch } from '@components/ui/ScopeSwitch';
import { DataTable } from '@components/data/DataTable';
import { StatusBadge } from '@components/ui/StatusBadge';
import type { Opportunity } from '@models/index';

const STAGES = [
  { value: 'all', label: 'Tutte' },
  { value: 'new', label: 'Nuovo' },
  { value: 'qualifying', label: 'In Qualificazione' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'negotiation', label: 'Negoziazione' },
  { value: 'closed_won', label: 'Vinto' },
  { value: 'closed_lost', label: 'Perso' },
];

const STAGE_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending'> = {
  new: 'info',
  qualifying: 'info',
  discovery: 'info',
  proposal: 'warning',
  negotiation: 'warning',
  closed_won: 'success',
  closed_lost: 'error',
};

export default function OpportunitiesPage() {
  const { token, user } = useAuth();
  const { scope, setScope, getFilterParams, hasTeam } = useDataScope();
  const [selectedStage, setSelectedStage] = useState('all');

  const opportunitiesQuery = useQuery({
    queryKey: ['seller-opportunities', scope],
    queryFn: async () => {
      const response = await apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: { ...getFilterParams(), limit: 1000 },
      });
      return response.data || [];
    },
    enabled: Boolean(token),
  });

  const opportunities = opportunitiesQuery.data ?? [];

  const filteredOpportunities = useMemo(() => {
    if (selectedStage === 'all') return opportunities;
    return opportunities.filter((o) => o.stage === selectedStage);
  }, [opportunities, selectedStage]);

  const totalValue = useMemo(() => {
    return filteredOpportunities.reduce((sum, opp) => sum + opp.value, 0);
  }, [filteredOpportunities]);

  const stageStats = useMemo(() => {
    return STAGES.map((stage) => {
      if (stage.value === 'all') return null;
      const count = opportunities.filter((o) => o.stage === stage.value).length;
      return { stage: stage.value, label: stage.label, count };
    }).filter(Boolean);
  }, [opportunities]);

  // Build table rows with conditional owner column
  const headers = scope === 'team' 
    ? ['Titolo', 'Azienda', 'Owner', 'Fase', 'Valore', 'Close Date', 'Aggiornamento']
    : ['Titolo', 'Azienda', 'Fase', 'Valore', 'Close Date', 'Aggiornamento'];

  const rows = filteredOpportunities.map((opp) => {
    const isPersonal = opp.owner_id === user?.id;
    const baseRow = [
      <div key="title" className="flex items-center gap-2">
        {scope === 'team' && isPersonal && (
          <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" title="Tua opportunità" />
        )}
        <span>{opp.title}</span>
      </div>,
      opp.company_name || '—',
    ];

    if (scope === 'team') {
      baseRow.push(
        <span key="owner" className="text-sm text-slate-600">
          {opp.owner_name || opp.owner_id?.substring(0, 8) || '—'}
        </span>
      );
    }

    baseRow.push(
      <StatusBadge 
        key={opp.id} 
        status={STAGES.find(s => s.value === opp.stage)?.label || opp.stage}
        variant={STAGE_VARIANTS[opp.stage] || 'info'}
      />,
      `€${opp.value.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`,
      opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString('it-IT') : '—',
      new Date(opp.updated_at).toLocaleDateString('it-IT')
    );

    return baseRow;
  });

  return (
    <section className="space-y-6">
      {/* Header with Scope Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Opportunità {scope === 'team' && '(Team)'}
          </h1>
          <p className="text-sm text-slate-600">
            {scope === 'personal' 
              ? 'Gestisci il tuo pipeline di vendita' 
              : 'Pipeline del team'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasTeam && <ScopeSwitch scope={scope} onChange={setScope} />}
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition">
            + Nuova Opportunità
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Totale Opportunità</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{opportunities.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Valore Pipeline</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            €{totalValue.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Chiuse (Vinte)</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {opportunities.filter(o => o.stage === 'closed_won').length}
          </p>
        </div>
      </div>

      {/* Stage Filter */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">Filtra per fase:</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage) => (
            <button
              key={stage.value}
              onClick={() => setSelectedStage(stage.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedStage === stage.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {stage.label}
              {stage.value !== 'all' && (
                <span className="ml-2 text-xs font-bold">
                  ({opportunities.filter((o) => o.stage === stage.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stage Statistics */}
      {stageStats && stageStats.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-slate-700">Distribuzione per fase:</p>
          <div className="space-y-3">
            {stageStats.map((stat: any) => (
              <div key={stat.stage} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{stat.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{stat.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${(stat.count / Math.max(...stageStats.map((s: any) => s.count), 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">
            {selectedStage === 'all' ? 'Tutte le Opportunità' : `Fase: ${STAGES.find(s => s.value === selectedStage)?.label}`}
          </h3>
          {scope === 'team' && (
            <p className="mt-1 text-xs text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 mr-1" />
              Indica le tue opportunità
            </p>
          )}
        </div>
        {opportunitiesQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            <p className="mt-2 text-sm text-slate-500">Caricamento opportunità...</p>
          </div>
        ) : (
          <DataTable
            headers={headers}
            rows={rows}
            emptyMessage="Nessuna opportunità trovata"
          />
        )}
      </div>

      {opportunitiesQuery.isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Errore nel caricamento delle opportunità
        </p>
      )}
    </section>
  );
}
