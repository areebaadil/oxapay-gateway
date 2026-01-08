import { cn } from '@/lib/utils';
import { TransactionStatus } from '@/types';

interface StatusBadgeProps {
  status: TransactionStatus | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'status-pending',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'status-confirmed',
  },
  FAILED: {
    label: 'Failed',
    className: 'status-failed',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'status-expired',
  },
  SETTLED: {
    label: 'Settled',
    className: 'status-settled',
  },
  APPROVED: {
    label: 'Approved',
    className: 'status-confirmed',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'status-failed',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'status-settled',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'status-pending' };
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full mr-1.5',
        status === 'PENDING' && 'bg-status-pending animate-pulse',
        status === 'CONFIRMED' && 'bg-status-confirmed',
        status === 'FAILED' && 'bg-status-failed',
        status === 'EXPIRED' && 'bg-status-expired',
        (status === 'SETTLED' || status === 'COMPLETED') && 'bg-status-settled',
        status === 'APPROVED' && 'bg-status-confirmed',
        status === 'REJECTED' && 'bg-status-failed',
      )} />
      {config.label}
    </span>
  );
}
