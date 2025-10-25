import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { useDataScope } from '@hooks/useDataScope';
import { ScopeSwitch } from '@components/ui/ScopeSwitch';
import { DataTable } from '@components/data/DataTable';
import { StatusBadge } from '@components/ui/StatusBadge';
import { StatsCard } from '@components/data/StatsCard';
import type { Task } from '@models/index';

export default function TasksPage() {
  const { token, user } = useAuth();
  const { scope, setScope, getFilterParams, hasTeam } = useDataScope();
  const [selectedStatus, setSelectedStatus] = useState('open');

  const tasksQuery = useQuery({
    queryKey: ['seller-tasks', scope],
    queryFn: async () => {
      const response = await apiClient<{ data: Task[] }>('tasks', {
        token,
        searchParams: { ...getFilterParams(), limit: 1000 },
      });
      return response.data || [];
    },
    enabled: Boolean(token),
  });

  const tasks = tasksQuery.data ?? [];

  const filteredTasks = useMemo(() => {
    if (selectedStatus === 'all') return tasks;
    return tasks.filter((t) => t.status === selectedStatus);
  }, [tasks, selectedStatus]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      open: tasks.filter((t) => t.status === 'open').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length,
    };
  }, [tasks]);

  const headers = scope === 'team'
    ? ['Titolo', 'Descrizione', 'Assegnato a', 'Status', 'Priorità', 'Scadenza']
    : ['Titolo', 'Descrizione', 'Status', 'Priorità', 'Scadenza'];

  const rows = filteredTasks.map((task) => {
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const now = new Date();
    const isOverdue = dueDate && dueDate < now && task.status !== 'done';
    const isPersonal = task.owner_id === user?.id;

    const baseRow = [
      <div key="title" className="flex items-center gap-2">
        {scope === 'team' && isPersonal && (
          <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" title="Tuo task" />
        )}
        <span className="font-medium">{task.title}</span>
      </div>,
      <span key="desc" className="text-sm text-slate-600">{task.description || '—'}</span>,
    ];

    if (scope === 'team') {
      baseRow.push(
        <span key="owner" className="text-sm text-slate-600">
          {task.owner_name || task.owner_id?.substring(0, 8) || '—'}
        </span>
      );
    }

    baseRow.push(
      <StatusBadge
        key={task.id}
        status={task.status === 'done' ? 'Completato' : task.status === 'in_progress' ? 'In Corso' : 'Aperto'}
        variant={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'info' : isOverdue ? 'error' : 'warning'}
      />,
      task.priority ? (
        <span key="priority" className={`text-sm font-medium ${
          task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Bassa'}
        </span>
      ) : <span key="priority">—</span>,
      dueDate ? (
        <div key="due" className="flex flex-col">
          <span className="text-sm">{dueDate.toLocaleDateString('it-IT')}</span>
          {isOverdue && <span className="text-xs text-red-600 font-medium">⚠️ Scaduta</span>}
        </div>
      ) : <span key="due">—</span>
    );

    return baseRow;
  });

  return (
    <section className="space-y-6">
      {/* Header with Scope Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Task {scope === 'team' && '(Team)'}
          </h1>
          <p className="text-sm text-slate-600">
            {scope === 'personal' ? 'Gestisci le tue attività' : 'Task del team'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasTeam && <ScopeSwitch scope={scope} onChange={setScope} />}
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition">
            + Nuovo Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Aperti" value={stats.open} description="Da iniziare" />
        <StatsCard title="In Corso" value={stats.inProgress} description="In lavorazione" />
        <StatsCard title="Completati" value={stats.done} description="Finiti" />
        <StatsCard
          title="Scaduti"
          value={stats.overdue}
          description="Attenzione richiesta"
          className={stats.overdue > 0 ? 'border-red-300 bg-red-50' : ''}
        />
      </div>

      {/* Status Filter */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">Filtra per status:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Tutti' },
            { value: 'open', label: 'Aperti' },
            { value: 'in_progress', label: 'In Corso' },
            { value: 'done', label: 'Completati' },
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setSelectedStatus(status.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedStatus === status.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status.label}
              {status.value !== 'all' && (
                <span className="ml-2 text-xs font-bold">
                  ({tasks.filter((t) => t.status === status.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">
            Lista Task ({filteredTasks.length})
          </h3>
          {scope === 'team' && (
            <p className="mt-1 text-xs text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 mr-1" />
              Indica i tuoi task
            </p>
          )}
        </div>
        {tasksQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            <p className="mt-2 text-sm text-slate-500">Caricamento task...</p>
          </div>
        ) : (
          <DataTable
            headers={headers}
            rows={rows}
            emptyMessage="Nessun task trovato"
          />
        )}
      </div>

      {tasksQuery.isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Errore nel caricamento dei task
        </p>
      )}
    </section>
  );
}
