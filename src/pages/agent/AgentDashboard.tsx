import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent, useAgentMerchants } from '@/hooks/useAgents';
import { useAgentRevenue } from '@/hooks/useAgentRevenue';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowDownToLine, DollarSign, Loader2, TrendingUp, Wallet, PiggyBank, BarChart3 } from 'lucide-react';

export default function AgentDashboard() {
  const { agentId } = useAuth();
  const { data: agent, isLoading: agentLoading } = useAgent(agentId);
  const { data: agentMerchants, isLoading: merchantsLoading } = useAgentMerchants(agentId);
  const { 
    totalEarnedRevenue, 
    totalPotentialRevenue,
    totalVolume,
    confirmedVolume,
    averageDepositMargin,
    averageWithdrawalMargin,
    merchantBreakdown,
    revenueByStatus,
    agentDepositFee,
    agentWithdrawalFee,
    isLoading: revenueLoading 
  } = useAgentRevenue(agentId);

  const isLoading = agentLoading || merchantsLoading || revenueLoading;
  const merchantCount = agentMerchants?.length || 0;
  const transactionCount = merchantBreakdown.reduce((sum, m) => sum + m.transactionCount, 0);

  if (isLoading) {
    return (
      <DashboardLayout role="agent" title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent" title="Agent Dashboard">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {agent?.name}</h1>
          <p className="text-muted-foreground">
            Manage your merchants and track your revenue
          </p>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Earned Revenue"
            value={`$${totalEarnedRevenue.toFixed(2)}`}
            icon={PiggyBank}
            subtitle={`Margin: merchant fee − your ${agentDepositFee}% platform fee`}
            iconClassName="bg-green-500/10"
          />
          <StatCard
            title="Merchants' Net Volume"
            value={`$${confirmedVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            subtitle={`$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} total processed`}
          />
          <StatCard
            title="My Merchants"
            value={String(merchantCount)}
            icon={Users}
            subtitle={`${transactionCount} transactions`}
          />
          <StatCard
            title="Avg. Deposit Margin"
            value={`${averageDepositMargin.toFixed(2)}%`}
            icon={TrendingUp}
            subtitle={`Withdrawal: ${averageWithdrawalMargin.toFixed(2)}%`}
          />
        </div>

        {/* Revenue Breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Revenue by Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Confirmed</span>
                  <span className="font-semibold text-green-500">${revenueByStatus.confirmed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Settled</span>
                  <span className="font-semibold text-blue-500">${revenueByStatus.settled.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-yellow-500">${revenueByStatus.pending.toFixed(2)}</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Potential</span>
                  <span className="font-bold text-lg">${totalPotentialRevenue.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Your Fee Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform Fees (What you pay)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Deposit</p>
                    <p className="text-lg font-bold">{agentDepositFee}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Withdrawal</p>
                    <p className="text-lg font-bold">{agentWithdrawalFee}%</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Merchant Fees (Your limits)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Max Deposit</p>
                    <p className="text-lg font-bold">{agent?.max_deposit_fee_percentage}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Max Withdrawal</p>
                    <p className="text-lg font-bold">{agent?.max_withdrawal_fee_percentage}%</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Your margin = Merchant fee - Platform fee. Set merchant fees above your platform fees to earn revenue.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* My Merchants List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              My Merchants ({merchantCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!agentMerchants || agentMerchants.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No merchants assigned yet.
              </p>
            ) : (
              <div className="space-y-3">
                {agentMerchants.map((am: any) => (
                  <div key={am.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {am.merchant?.name?.charAt(0)?.toUpperCase() || 'M'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{am.merchant?.name}</p>
                        <p className="text-xs text-muted-foreground">{am.merchant?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Deposit Fee</p>
                      <p className="font-medium">{am.merchant?.deposit_fee_percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Merchant Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              Merchant Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {merchantBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No merchants yet. Create merchants to start earning revenue.
              </p>
            ) : (
              <div className="space-y-4">
                {merchantBreakdown.map(merchant => (
                  <div key={merchant.merchantId} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{merchant.merchantName}</h4>
                        <p className="text-xs text-muted-foreground">
                          {merchant.transactionCount} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-500">${merchant.earnedRevenue.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">earned</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Volume</p>
                        <p className="font-medium">${merchant.confirmedVolume.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deposit Fee</p>
                        <p className="font-medium">{merchant.depositFeeSet}% <span className="text-xs text-green-500">(+{merchant.depositMargin}%)</span></p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Withdrawal Fee</p>
                        <p className="font-medium">{merchant.withdrawalFeeSet}% <span className="text-xs text-green-500">(+{merchant.withdrawalMargin}%)</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}