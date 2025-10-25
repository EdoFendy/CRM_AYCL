interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'pending';
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
};

export function StatusBadge({ status, variant = 'info', className }: StatusBadgeProps) {
  const baseClasses = 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold';
  const variantClasses = STATUS_STYLES[variant] || STATUS_STYLES.info;
  
  return (
    <span className={`${baseClasses} ${variantClasses} ${className || ''}`}>
      {status}
    </span>
  );
}
