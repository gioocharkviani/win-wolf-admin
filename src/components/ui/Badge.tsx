interface BadgeProps {
  label: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'gray' | 'purple';
}

const VARIANT: Record<NonNullable<BadgeProps['variant']>, string> = {
  success: 'bg-emerald-900/50 text-emerald-300',
  danger:  'bg-red-900/50 text-red-300',
  warning: 'bg-amber-900/50 text-amber-300',
  info:    'bg-sky-900/50 text-sky-300',
  gray:    'bg-gray-700 text-gray-300',
  purple:  'bg-purple-900/50 text-purple-300',
};

export default function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`badge ${VARIANT[variant]}`}>{label}</span>
  );
}

export function statusBadge(
  isBlocked: boolean,
  verified: boolean,
): BadgeProps {
  if (isBlocked) return { label: 'Blocked', variant: 'danger' };
  if (verified)  return { label: 'Active',  variant: 'success' };
  return           { label: 'Unverified', variant: 'warning' };
}

export function txTypeBadge(type: string): BadgeProps {
  const map: Record<string, BadgeProps['variant']> = {
    DEPOSIT:    'success',
    WITHDRAWAL: 'danger',
    CREDIT:     'info',
    DEBIT:      'warning',
    BONUS:      'purple',
    ROLLBACK:   'warning',
    ADJUSTMENT: 'gray',
    deposit:    'success',
    withdrawal: 'danger',
    credit:     'info',
    debit:      'warning',
    bonus:      'purple',
    rollback:   'warning',
    adjustment: 'gray',
  };
  return { label: type.toUpperCase(), variant: map[type] ?? 'gray' };
}

export function txStatusBadge(status?: string): BadgeProps {
  const map: Record<string, BadgeProps['variant']> = {
    succeeded: 'success',
    succeeded2: 'success',
    SUCCEEDED: 'success',
    pending:    'warning',
    PENDING:    'warning',
    processing: 'info',
    PROCESSING: 'info',
    failed:     'danger',
    faild:      'danger',
    FAILD:      'danger',
    FAILED:     'danger',
  };
  return { label: (status ?? 'N/A').toUpperCase(), variant: map[status ?? ''] ?? 'gray' };
}

export function promoStatusBadge(status: string): BadgeProps {
  const map: Record<string, BadgeProps['variant']> = {
    active:   'success', ACTIVE:   'success',
    draft:    'gray',    DRAFT:    'gray',
    paused:   'warning', PAUSED:   'warning',
    archived: 'danger',  ARCHIVED: 'danger',
  };
  return { label: status, variant: map[status] ?? 'gray' };
}
