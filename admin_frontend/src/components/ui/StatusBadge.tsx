interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  text?: string;
}

export function StatusBadge({ status, variant, text }: StatusBadgeProps) {
  // Auto-detect variant from common status values if not provided
  const autoVariant = variant || detectVariant(status);
  
  const classes = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${classes[autoVariant]}`}>
      {text || formatStatus(status)}
    </span>
  );
}

function detectVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' {
  const lower = status.toLowerCase();
  
  // Success states
  if (lower.includes('won') || lower.includes('success') || lower.includes('paid') || 
      lower.includes('completed') || lower.includes('signed') || lower.includes('active') ||
      lower.includes('delivered') || lower.includes('accepted')) {
    return 'success';
  }
  
  // Danger states
  if (lower.includes('lost') || lower.includes('failed') || lower.includes('error') ||
      lower.includes('cancelled') || lower.includes('rejected') || lower.includes('declined') ||
      lower.includes('overdue')) {
    return 'danger';
  }
  
  // Warning states
  if (lower.includes('pending') || lower.includes('draft') || lower.includes('warning') ||
      lower.includes('qualifying') || lower.includes('discovery')) {
    return 'warning';
  }
  
  // Info states
  if (lower.includes('sent') || lower.includes('processing') || lower.includes('proposal') ||
      lower.includes('negotiation') || lower.includes('new') || lower.includes('open')) {
    return 'info';
  }
  
  return 'default';
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

