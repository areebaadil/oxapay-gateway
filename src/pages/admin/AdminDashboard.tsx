import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { DailyStatsCard } from '@/components/ui/DailyStatsCard';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { CoinDistributionChart } from '@/components/charts/CoinDistributionChart';
import { TransactionsTable } from '@/components/tables/TransactionsTable';
import { useMerchants } from '@/hooks/useMerchants';
import { useTransactions, useTransactionStats, useDailyTransactionStats } from '@/hooks/useTransactions';
import { useSettlements } from '@/hooks/useSettlements';
import { useLedgerEntries } from '@/hooks/useLedger';
import { 
  DollarSign, 
  ArrowDownToLine, 
  Users, 
  TrendingUp,
  Wallet,
  Clock,
  Loader2,
  ArrowUpRight
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
  const { data: pendingSettlements } = useSettlements('PENDING');
  const { data: allSettlements } = useSettlements();
  const { data: ledgerEntries } = useLedgerEntries();

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
  const oxapayFeeRate = 0.02;
  const netVolume = totalVolume * (1 - oxapayFeeRate);
  // Total merchant fees collected from ledger
  const totalFeesCollected = (ledgerEntries || [])
    .filter(e => e.category === 'FEE' && e.entry_type === 'DEBIT')
    .reduce((sum, e) => sum + Number(e.usd_value_at_time), 0);
  // Platform revenue = merchant fees minus OxaPay's 2% cut on total volume
  const oxapayFees = totalVolume * oxapayFeeRate;
  const platformRevenue = Math.max(0, totalFeesCollected - oxapayFees);
  // Total withdrawals from completed settlements
  const totalWithdrawals = (allSettlements || [])
    .reduce((sum: number, s: any) => sum + Number(s.usd_value_at_request), 0);

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
              Your gateway processed <span className="text-primary font-semibold">${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> all-time 
              across <span className="text-primary font-semibold">{stats?.confirmedTransactions || 0}</span> confirmed transactions.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <StatCard
            title="Total Volume"
            value={`$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            subtitle="all-time confirmed"
          />
          <StatCard
            title="Net Volume"
            value={`$${netVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Wallet}
            subtitle="after 2% OxaPay fee"
          />
          <StatCard
            title="Total Transactions"
            value={(stats?.totalTransactions || 0).toString()}
            icon={ArrowDownToLine}
            subtitle={`${stats?.confirmedTransactions || 0} confirmed`}
          />
          <StatCard
            title="Active Merchants"
            value={activeMerchants.toString()}
            icon={Users}
            subtitle={`${merchants?.length || 0} total`}
          />
          <StatCard
            title="Total Withdrawals"
            value={`$${totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={ArrowUpRight}
            subtitle="all-time completed"
          />
          <StatCard
            title="Platform Revenue"
            value={`$${platformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            subtitle={`Fees: $${totalFeesCollected.toFixed(2)} − OxaPay: $${oxapayFees.toFixed(2)}`}
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
                <p className="text-2xl font-bold text-status-pending">{pendingSettlements?.length || 0}</p>
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
