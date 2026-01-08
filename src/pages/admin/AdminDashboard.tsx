import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { CoinDistributionChart } from '@/components/charts/CoinDistributionChart';
import { TransactionsTable } from '@/components/tables/TransactionsTable';
import { mockTransactions, mockMerchants, getAnalyticsData } from '@/lib/mock-data';
import { 
  DollarSign, 
  ArrowDownToLine, 
  Users, 
  TrendingUp,
  Wallet,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const analytics = getAnalyticsData();
  const recentTransactions = mockTransactions.slice(0, 5);
  const merchantNames = Object.fromEntries(
    mockMerchants.map(m => [m.id, m.name])
  );

  return (
    <DashboardLayout role="admin" title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-r from-card via-card to-primary/5 p-6">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
          <div className="relative">
            <h2 className="text-2xl font-bold mb-2">Welcome back, Admin</h2>
            <p className="text-muted-foreground max-w-lg">
              Your gateway processed <span className="text-primary font-semibold">${analytics.totalVolume.toLocaleString()}</span> in 
              the last 7 days across <span className="text-primary font-semibold">{analytics.confirmedTransactions}</span> confirmed transactions.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Volume (7d)"
            value={`$${(analytics.totalVolume / 1000).toFixed(1)}k`}
            icon={DollarSign}
            trend={{ value: 12.5, isPositive: true }}
            subtitle="vs last week"
          />
          <StatCard
            title="Total Transactions"
            value={analytics.totalTransactions.toString()}
            icon={ArrowDownToLine}
            trend={{ value: 8.2, isPositive: true }}
            subtitle="vs last week"
          />
          <StatCard
            title="Active Merchants"
            value={mockMerchants.filter(m => m.isEnabled).length.toString()}
            icon={Users}
            subtitle={`${mockMerchants.length} total`}
          />
          <StatCard
            title="Platform Revenue"
            value={`$${analytics.totalFees.toFixed(0)}`}
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
              <VolumeChart data={analytics.volumeByDay} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Coin Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <CoinDistributionChart data={analytics.volumeByCoin} />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-status-pending/10 p-3 group-hover:bg-status-pending/20 transition-colors">
                <Clock className="h-6 w-6 text-status-pending" />
              </div>
              <div>
                <p className="font-semibold">Pending Settlements</p>
                <p className="text-2xl font-bold text-status-pending">3</p>
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
                <p className="text-2xl font-bold text-status-confirmed">12</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">New Merchants</p>
                <p className="text-2xl font-bold text-primary">2</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionsTable 
              transactions={recentTransactions} 
              showMerchant 
              merchantNames={merchantNames}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
