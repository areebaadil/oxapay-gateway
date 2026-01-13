import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentMerchants } from '@/hooks/useAgents';
import { useTransactions } from '@/hooks/useTransactions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { Loader2, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

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

        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Coin</th>
                <th>Amount</th>
                <th>USD Value</th>
                <th>Status</th>
                <th>User Ref</th>
                <th>Time</th>
                <th>TX Hash</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr 
                  key={tx.id} 
                  className={cn(
                    'animate-fade-in',
                    index % 2 === 0 ? 'bg-transparent' : 'bg-muted/5'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td>
                    <span className="font-mono text-sm text-muted-foreground">
                      {tx.id.slice(0, 8)}...
                    </span>
                  </td>
                  <td>
                    <CoinBadge coin={tx.coin} />
                  </td>
                  <td>
                    <span className="font-mono font-semibold">
                      {Number(tx.crypto_amount).toFixed(6)}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-muted-foreground">
                      ${Number(tx.usd_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={tx.status} />
                  </td>
                  <td>
                    <span className="text-sm text-muted-foreground">
                      {tx.user_reference}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </span>
                  </td>
                  <td>
                    {tx.tx_hash ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {truncateHash(tx.tx_hash)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => navigator.clipboard.writeText(tx.tx_hash!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <ExternalLink className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
