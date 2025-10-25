import type { DataScope } from '@hooks/useDataScope';

interface ScopeSwitchProps {
  scope: DataScope;
  onChange: (scope: DataScope) => void;
  disabled?: boolean;
  className?: string;
}

export function ScopeSwitch({ scope, onChange, disabled = false, className = '' }: ScopeSwitchProps) {
  return (
    <div className={`inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 ${className}`}>
      <button
        type="button"
        onClick={() => onChange('personal')}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all
          ${scope === 'personal'
            ? 'bg-white text-primary shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
          }
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>Miei Dati</span>
      </button>
      
      <button
        type="button"
        onClick={() => onChange('team')}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all
          ${scope === 'team'
            ? 'bg-white text-primary shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
          }
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>Dati del Team</span>
      </button>
    </div>
  );
}

