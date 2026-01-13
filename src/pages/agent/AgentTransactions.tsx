import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentMerchants } from '@/hooks/useAgents';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionsTable } from '@/components/tables/TransactionsTable';
import { Loader2 } from 'lucide-react';

export default function AgentTransactions() {
  const { agentId } = useAuth();
  const { data: agentMerchants, isLoading: merchantsLoading } = useAgentMerchants(agentId);
  const { data: allTransactions, isLoading: txLoading } = useTransactions();

  const isLoading = merchantsLoading || txLoading;

  // Get merchant IDs for this agent
  const merchantIds = (agentMerchants || []).map(am => am.merchant_id);
  
  // Filter transactions for agent's merchants
  const transactions = (allTransactions || []).filter(tx => 
    merchantIds.includes(tx.merchant_id)
  );

  if (isLoading) {
    return (
      <DashboardLayout role="agent" title="Transactions">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent" title="Transactions">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            View all transactions from your merchants
          </p>
        </div>

        <TransactionsTable transactions={transactions} showMerchant />
      </div>
    </DashboardLayout>
  );
}
