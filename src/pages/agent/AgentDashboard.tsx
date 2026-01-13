import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent, useAgentMerchants } from '@/hooks/useAgents';
import { useTransactions } from '@/hooks/useTransactions';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowDownToLine, DollarSign, Loader2, TrendingUp } from 'lucide-react';

export default function AgentDashboard() {
  const { agentId } = useAuth();
  const { data: agent, isLoading: agentLoading } = useAgent(agentId);
  const { data: agentMerchants, isLoading: merchantsLoading } = useAgentMerchants(agentId);
  const { data: allTransactions } = useTransactions();

  const isLoading = agentLoading || merchantsLoading;

  // Get merchant IDs for this agent
  const merchantIds = (agentMerchants || []).map(am => am.merchant_id);
  
  // Filter transactions for agent's merchants
  const transactions = (allTransactions || []).filter(tx => 
    merchantIds.includes(tx.merchant_id)
  );
  
  const confirmedTxs = transactions.filter(tx => 
    tx.status === 'CONFIRMED' || tx.status === 'SETTLED'
  );
  
  const totalVolume = confirmedTxs.reduce((sum, tx) => sum + Number(tx.usd_value), 0);
  const merchantCount = agentMerchants?.length || 0;

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
            Manage your merchants and track their performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="My Merchants"
            value={merchantCount}
            icon={Users}
            description="Active merchants"
          />
          <StatCard
            title="Total Transactions"
            value={transactions.length}
            icon={ArrowDownToLine}
            description="All time"
          />
          <StatCard
            title="Total Volume"
            value={`$${totalVolume.toLocaleString()}`}
            icon={DollarSign}
            description="Confirmed deposits"
          />
          <StatCard
            title="Fee Limits"
            value={`${agent?.max_deposit_fee_percentage}%`}
            icon={TrendingUp}
            description={`Max: ${agent?.max_deposit_fee_percentage}% / ${agent?.max_withdrawal_fee_percentage}%`}
          />
        </div>

        {/* Quick Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Fee Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Max Deposit Fee</span>
                <span className="font-semibold">{agent?.max_deposit_fee_percentage}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Max Withdrawal Fee</span>
                <span className="font-semibold">{agent?.max_withdrawal_fee_percentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                You can set merchant fees up to these limits. The difference between platform rates and your rates is your revenue.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No transactions yet. Create merchants to start receiving deposits.
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground truncate">
                        {tx.user_reference.slice(0, 20)}...
                      </span>
                      <span className="font-medium">${Number(tx.usd_value).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
