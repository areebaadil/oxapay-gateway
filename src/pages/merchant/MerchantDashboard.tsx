import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { CoinDistributionChart } from '@/components/charts/CoinDistributionChart';
import { TransactionsTable } from '@/components/tables/TransactionsTable';
import { mockTransactions, getAnalyticsData } from '@/lib/mock-data';
import { 
  DollarSign, 
  ArrowDownToLine, 
  Clock,
  TrendingUp,
  Wallet,
  Key,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export default function MerchantDashboard() {
  const merchantId = 'merch_001';
  const analytics = getAnalyticsData(merchantId);
  const merchantTransactions = mockTransactions.filter(tx => tx.merchantId === merchantId);
  const recentTransactions = merchantTransactions.slice(0, 5);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const apiKey = 'pk_live_51Hx...r9Kd';
  const maskedKey = 'pk_live_••••••••••••••••r9Kd';

  return (
    <DashboardLayout role="merchant" title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-r from-card via-card to-primary/5 p-6">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">GameFi Exchange</h2>
              <p className="text-muted-foreground">
                You've received <span className="text-primary font-semibold">${analytics.totalVolume.toLocaleString()}</span> in 
                deposits this week
              </p>
            </div>
            
            {/* Quick API Key Access */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border border-border/50">
              <Key className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">API Key</p>
                <p className="font-mono text-sm">{showApiKey ? apiKey : maskedKey}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Received"
            value={`$${(analytics.totalVolume / 1000).toFixed(1)}k`}
            icon={DollarSign}
            trend={{ value: 12.5, isPositive: true }}
            subtitle="this week"
          />
          <StatCard
            title="Confirmed Deposits"
            value={analytics.confirmedTransactions.toString()}
            icon={ArrowDownToLine}
            trend={{ value: 8.2, isPositive: true }}
            subtitle="this week"
          />
          <StatCard
            title="Pending"
            value={analytics.pendingTransactions.toString()}
            icon={Clock}
            subtitle="awaiting confirmation"
          />
          <StatCard
            title="Available Balance"
            value="$18,450"
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
              <VolumeChart data={analytics.volumeByDay} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">By Coin</CardTitle>
            </CardHeader>
            <CardContent>
              <CoinDistributionChart data={analytics.volumeByCoin} />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
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
          
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-secondary p-4 group-hover:bg-secondary/80 transition-colors">
                <TrendingUp className="h-8 w-8 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">View Analytics</p>
                <p className="text-muted-foreground text-sm">
                  Detailed reports and insights
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
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionsTable transactions={recentTransactions} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
