import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  ArrowDownToLine, 
  CheckCircle2, 
  Clock, 
  XCircle,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyStatsCardProps {
  date: string;
  totalTransactions: number;
  confirmedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalVolume: number;
  pendingVolume: number;
  isLoading?: boolean;
}

export function DailyStatsCard({
  date,
  totalTransactions,
  confirmedTransactions,
  pendingTransactions,
  failedTransactions,
  totalVolume,
  pendingVolume,
  isLoading = false,
}: DailyStatsCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stats = [
    {
      label: 'Total',
      value: totalTransactions,
      icon: ArrowDownToLine,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Confirmed',
      value: confirmedTransactions,
      icon: CheckCircle2,
      color: 'text-status-confirmed',
      bgColor: 'bg-status-confirmed/10',
    },
    {
      label: 'Pending',
      value: pendingTransactions,
      icon: Clock,
      color: 'text-status-pending',
      bgColor: 'bg-status-pending/10',
    },
    {
      label: 'Failed',
      value: failedTransactions,
      icon: XCircle,
      color: 'text-status-failed',
      bgColor: 'bg-status-failed/10',
    },
  ];

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-primary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Today's Activity</CardTitle>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Resets at midnight</p>
            <div className="flex items-center gap-1 text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Live</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Transaction Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'rounded-xl p-3 transition-all hover:scale-[1.02]',
                stat.bgColor
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn('h-4 w-4', stat.color)} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={cn('text-2xl font-bold', stat.color)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Volume Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-status-confirmed/5 border border-status-confirmed/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-status-confirmed" />
              <span className="text-sm text-muted-foreground">Confirmed Volume</span>
            </div>
            <p className="text-xl font-bold text-status-confirmed">
              ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl bg-status-pending/5 border border-status-pending/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-status-pending" />
              <span className="text-sm text-muted-foreground">Pending Volume</span>
            </div>
            <p className="text-xl font-bold text-status-pending">
              ${pendingVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}