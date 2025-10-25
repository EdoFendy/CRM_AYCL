import type { ReactNode } from 'react';

interface FiltersToolbarProps {
  children: ReactNode;
  className?: string;
}

export function FiltersToolbar({ children, className = '' }: FiltersToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      {children}
    </div>
  );
}
