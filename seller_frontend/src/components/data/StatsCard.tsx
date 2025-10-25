interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function StatsCard({ title, value, description, className }: StatsCardProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className || ''}`}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
    </div>
  );
}
