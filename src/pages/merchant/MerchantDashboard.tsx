import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { DailyStatsCard } from '@/components/ui/DailyStatsCard';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { CoinDistributionChart } from '@/components/charts/CoinDistributionChart';
import { TransactionsTable } from '@/components/tables/TransactionsTable';
import { useTransactions, useTransactionStats, useDailyTransactionStats } from '@/hooks/useTransactions';
import { useAuth } from '@/contexts/AuthContext';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useLedgerBalance } from '@/hooks/useLedger';
import { 
  DollarSign, 
  ArrowDownToLine, 
  Clock,
  TrendingUp,
  Wallet,
  Key,
  Copy,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { merchantId } = useAuth();
  const { data: transactions, isLoading: txLoading } = useTransactions({ merchantId: merchantId || undefined });
  const { data: stats, isLoading: statsLoading } = useTransactionStats(merchantId || undefined);
  const { data: dailyStats, isLoading: dailyLoading } = useDailyTransactionStats(merchantId || undefined);
  const { data: apiKeys } = useApiKeys();
  const balances = useLedgerBalance(merchantId || undefined);
  
  const recentTransactions = (transactions || []).slice(0, 5);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const activeApiKey = apiKeys?.find(k => k.is_active);
  const maskedKey = activeApiKey ? `${activeApiKey.key_prefix}••••••••••••` : 'No API key';

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

  const isLoading = txLoading || statsLoading;
  const totalDeposits = stats?.totalVolume || 0;
  // Net balance from ledger (deposits minus fees)
  const netBalance = balances?.reduce((sum, b) => sum + b.balance, 0) || 0;

  const copyApiKeyPrefix = () => {
    if (activeApiKey) {
      navigator.clipboard.writeText(activeApiKey.key_prefix);
      toast({ title: 'Copied', description: 'API key prefix copied to clipboard' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="merchant" title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="merchant" title="Dashboard">
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
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Merchant Dashboard</h2>
              <p className="text-muted-foreground">
              Your net balance is <span className="text-primary font-semibold">${netBalance.toFixed(2)}</span> after fees
              </p>
            </div>
            
            {/* Quick API Key Access */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border border-border/50">
              <Key className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">API Key</p>
                <p className="font-mono text-sm">{maskedKey}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={copyApiKeyPrefix}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Deposits"
            value={`$${totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            subtitle="gross confirmed deposits"
          />
          <StatCard
            title="Net Received"
            value={`$${netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={ArrowDownToLine}
            subtitle="after platform fees"
          />
          <StatCard
            title="Pending"
            value={(stats?.pendingTransactions || 0).toString()}
            icon={Clock}
            subtitle="awaiting confirmation"
          />
          <StatCard
            title="Available Balance"
            value={`$${netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Wallet}
            subtitle="ready for settlement"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Deposit Volume</CardTitle>
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
              <CardTitle className="text-lg font-semibold">By Coin</CardTitle>
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
        <div className="grid gap-4 md:grid-cols-2">
          <Card 
            className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
            onClick={() => navigate('/merchant/settlements')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">Request Settlement</p>
                <p className="text-muted-foreground text-sm">
                  Withdraw your available balance
                </p>
              </div>
              <Button>Request</Button>
            </CardContent>
          </Card>
          
          <Card 
            className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
            onClick={() => navigate('/merchant/transactions')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-secondary p-4 group-hover:bg-secondary/80 transition-colors">
                <TrendingUp className="h-8 w-8 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">View Transactions</p>
                <p className="text-muted-foreground text-sm">
                  Detailed transaction history
                </p>
              </div>
              <Button variant="outline">View</Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Deposits</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/merchant/transactions')}>View All</Button>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionsTable transactions={tableTransactions} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
