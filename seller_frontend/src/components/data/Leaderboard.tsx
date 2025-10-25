import type { RankingEntry } from '@models/index';

interface LeaderboardProps {
  title: string;
  entries: RankingEntry[];
  metric?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function Leaderboard({ 
  title, 
  entries, 
  metric = '€', 
  loading = false,
  emptyMessage = 'Nessun dato disponibile'
}: LeaderboardProps) {
  const getRankBadge = (rank: number) => {
    const baseClasses = 'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold';
    
    switch (rank) {
      case 1:
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md`}>
            🥇
          </div>
        );
      case 2:
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md`}>
            🥈
          </div>
        );
      case 3:
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md`}>
            🥉
          </div>
        );
      default:
        return (
          <div className={`${baseClasses} bg-slate-100 text-slate-600`}>
            {rank}
          </div>
        );
    }
  };

  const formatValue = (value: number) => {
    if (metric === '€') {
      return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString('it-IT');
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-center text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={`
              flex items-center gap-3 rounded-lg p-3 transition-all
              ${entry.isCurrentUser 
                ? 'bg-blue-50 ring-2 ring-blue-500 ring-opacity-50' 
                : 'hover:bg-slate-50'
              }
            `}
          >
            {getRankBadge(entry.rank)}
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${entry.isCurrentUser ? 'text-blue-900' : 'text-slate-900'}`}>
                {entry.name}
                {entry.isCurrentUser && (
                  <span className="ml-2 text-xs font-medium text-blue-600">(Tu)</span>
                )}
              </p>
              <p className="text-xs text-slate-500 truncate">{entry.email}</p>
            </div>
            
            <div className="text-right">
              <p className={`text-sm font-bold ${entry.isCurrentUser ? 'text-blue-700' : 'text-slate-900'}`}>
                {formatValue(entry.value)}
              </p>
              <p className="text-xs text-slate-500">{entry.deals} deal{entry.deals !== 1 ? 's' : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

