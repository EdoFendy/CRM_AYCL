import { ReactNode } from 'react';

interface FiltersToolbarProps {
  children: ReactNode;
}

export function FiltersToolbar({ children }: FiltersToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}
