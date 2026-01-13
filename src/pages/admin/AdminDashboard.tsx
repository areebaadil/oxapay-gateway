import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { DailyStatsCard } from '@/components/ui/DailyStatsCard';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { CoinDistributionChart } from '@/components/charts/CoinDistributionChart';
import { TransactionsTable } from '@/components/tables/TransactionsTable';
import { useMerchants } from '@/hooks/useMerchants';
import { useTransactions, useTransactionStats, useDailyTransactionStats } from '@/hooks/useTransactions';
import { useSettlements } from '@/hooks/useSettlements';
import { 
  DollarSign, 
  ArrowDownToLine, 
  Users, 
  TrendingUp,
  Wallet,
  Clock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: merchants, isLoading: merchantsLoading } = useMerchants();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: stats, isLoading: statsLoading } = useTransactionStats();
  const { data: dailyStats, isLoading: dailyLoading } = useDailyTransactionStats();
  const { data: settlements } = useSettlements('PENDING');

  const recentTransactions = transactions?.slice(0, 5) || [];
  const merchantNames = Object.fromEntries(
    (merchants || []).map(m => [m.id, m.name])
  );

  // Transform transactions for table component
  const tableTransactions = recentTransactions.map(tx => ({
    id: tx.id,
    merchantId: tx.merchant_id,
    depositIntentId: tx.deposit_intent_id || '',
    coin: tx.coin,
    cryptoAmount: Number(tx.crypto_amount),
    usdValue: Number(tx.usd_value),
    exchangeRate: Number(tx.exchange_rate),
    status: tx.status,
    txHash: tx.tx_hash,
    userReference: tx.user_reference,
    createdAt: new Date(tx.created_at),
    confirmedAt: tx.confirmed_at ? new Date(tx.confirmed_at) : null,
  }));

  // Generate volume by day data (last 7 days)
  const volumeByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const dayTxs = (transactions || []).filter(tx => {
      const txDate = new Date(tx.created_at).toISOString().split('T')[0];
      return txDate === dateStr && (tx.status === 'CONFIRMED' || tx.status === 'SETTLED');
    });
    return {
      date: dateStr,
      volume: dayTxs.reduce((sum, tx) => sum + Number(tx.usd_value), 0),
      count: dayTxs.length,
    };
  });

  // Transform coin distribution data
  const coinDistribution = (stats?.volumeByCoin || []).map(item => ({
    coin: item.coin as 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'LTC' | 'TRX',
    volume: 0,
    usdVolume: item.usdVolume,
  }));

  const isLoading = merchantsLoading || txLoading || statsLoading;
  const activeMerchants = (merchants || []).filter(m => m.is_enabled).length;
  const totalVolume = stats?.totalVolume || 0;
  const platformFees = totalVolume * 0.015;

  if (isLoading) {
    return (
      <DashboardLayout role="admin" title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Dashboard">
      <div className="space-y-6">
        {/* Daily Stats Card */}
        <DailyStatsCard
          date={dailyStats?.date || new Date().toISOString().split('T')[0]}
          totalTransactions={dailyStats?.totalTransactions || 0}
          confirmedTransactions={dailyStats?.confirmedTransactions || 0}
          pendingTransactions={dailyStats?.pendingTransactions || 0}
          failedTransactions={dailyStats?.failedTransactions || 0}
          totalVolume={dailyStats?.totalVolume || 0}
          pendingVolume={dailyStats?.pendingVolume || 0}
          isLoading={dailyLoading}
        />

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-r from-card via-card to-primary/5 p-6">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
          <div className="relative">
            <h2 className="text-2xl font-bold mb-2">Welcome back, Admin</h2>
            <p className="text-muted-foreground max-w-lg">
              Your gateway processed <span className="text-primary font-semibold">${totalVolume.toLocaleString()}</span> in 
              the last 7 days across <span className="text-primary font-semibold">{stats?.confirmedTransactions || 0}</span> confirmed transactions.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Volume (7d)"
            value={`$${(totalVolume / 1000).toFixed(1)}k`}
            icon={DollarSign}
            trend={{ value: 12.5, isPositive: true }}
            subtitle="vs last week"
          />
          <StatCard
            title="Total Transactions"
            value={(stats?.totalTransactions || 0).toString()}
            icon={ArrowDownToLine}
            trend={{ value: 8.2, isPositive: true }}
            subtitle="vs last week"
          />
          <StatCard
            title="Active Merchants"
            value={activeMerchants.toString()}
            icon={Users}
            subtitle={`${merchants?.length || 0} total`}
          />
          <StatCard
            title="Platform Revenue"
            value={`$${platformFees.toFixed(0)}`}
            icon={TrendingUp}
            trend={{ value: 15.3, isPositive: true }}
            subtitle="from fees"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Volume Trend</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs">7D</Button>
                <Button variant="secondary" size="sm" className="text-xs">30D</Button>
                <Button variant="ghost" size="sm" className="text-xs">90D</Button>
              </div>
            </CardHeader>
            <CardContent>
              <VolumeChart data={volumeByDay} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Coin Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {coinDistribution.length > 0 ? (
                <CoinDistributionChart data={coinDistribution} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No transaction data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card 
            className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
            onClick={() => navigate('/admin/settlements')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-status-pending/10 p-3 group-hover:bg-status-pending/20 transition-colors">
                <Clock className="h-6 w-6 text-status-pending" />
              </div>
              <div>
                <p className="font-semibold">Pending Settlements</p>
                <p className="text-2xl font-bold text-status-pending">{settlements?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-status-confirmed/10 p-3 group-hover:bg-status-confirmed/20 transition-colors">
                <Wallet className="h-6 w-6 text-status-confirmed" />
              </div>
              <div>
                <p className="font-semibold">Today's Deposits</p>
                <p className="text-2xl font-bold text-status-confirmed">
                  {(transactions || []).filter(tx => {
                    const today = new Date().toISOString().split('T')[0];
                    return new Date(tx.created_at).toISOString().split('T')[0] === today;
                  }).length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
            onClick={() => navigate('/admin/merchants')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Total Merchants</p>
                <p className="text-2xl font-bold text-primary">{merchants?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/transactions')}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionsTable 
              transactions={tableTransactions} 
              showMerchant 
              merchantNames={merchantNames}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
