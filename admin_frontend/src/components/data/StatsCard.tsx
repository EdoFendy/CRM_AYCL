import { ReactNode } from 'react';

interface StatsCardProps {
  title: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
}

export function StatsCard({ title, value, helper }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}
