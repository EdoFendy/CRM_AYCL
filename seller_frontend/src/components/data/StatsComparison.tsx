interface StatsComparisonProps {
  title: string;
  personalValue: number;
  teamAverage?: number;
  rank?: number;
  totalMembers?: number;
  format?: 'currency' | 'number' | 'percentage';
  description?: string;
  className?: string;
}

export function StatsComparison({
  title,
  personalValue,
  teamAverage,
  rank,
  totalMembers,
  format = 'currency',
  description,
  className = '',
}: StatsComparisonProps) {
  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return value.toLocaleString('it-IT');
    }
  };

  const isAboveAverage = teamAverage !== undefined && personalValue > teamAverage;
  const showComparison = teamAverage !== undefined && teamAverage > 0;

  const getRankBadge = () => {
    if (!rank || !totalMembers) return null;

    if (rank === 1) {
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
          <span>🥇</span>
          <span>1° Posto</span>
        </div>
      );
    }

    if (rank === 2) {
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
          <span>🥈</span>
          <span>2° Posto</span>
        </div>
      );
    }

    if (rank === 3) {
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
          <span>🥉</span>
          <span>3° Posto</span>
        </div>
      );
    }

    if (rank <= 5) {
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          <span>⭐</span>
          <span>Top 5</span>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        <span>{rank}° di {totalMembers}</span>
      </div>
    );
  };

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatValue(personalValue)}</p>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        {rank && totalMembers && (
          <div className="ml-4">
            {getRankBadge()}
          </div>
        )}
      </div>

      {showComparison && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
          <div className={`flex items-center gap-1 text-sm font-medium ${isAboveAverage ? 'text-green-600' : 'text-orange-600'}`}>
            {isAboveAverage ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span>
              {isAboveAverage ? 'Sopra' : 'Sotto'} la media
            </span>
          </div>
          <span className="text-sm text-slate-500">
            Media team: {formatValue(teamAverage)}
          </span>
        </div>
      )}
    </div>
  );
}

