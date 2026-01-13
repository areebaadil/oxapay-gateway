import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentMerchants } from '@/hooks/useAgents';
import { useSettlements } from '@/hooks/useSettlements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AgentSettlements() {
  const { agentId } = useAuth();
  const { data: agentMerchants, isLoading: merchantsLoading } = useAgentMerchants(agentId);
  const { data: allSettlements, isLoading: settlementsLoading } = useSettlements();

  const isLoading = merchantsLoading || settlementsLoading;

  // Get merchant IDs for this agent
  const merchantIds = (agentMerchants || []).map(am => am.merchant_id);
  
  // Filter settlements for agent's merchants
  const settlements = (allSettlements || []).filter(s => 
    merchantIds.includes(s.merchant_id)
  );

  if (isLoading) {
    return (
      <DashboardLayout role="agent" title="Settlements">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent" title="Settlements">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settlements</h1>
          <p className="text-muted-foreground">
            View settlement requests from your merchants
          </p>
        </div>

        <div className="space-y-4">
          {settlements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">No settlements yet</p>
                <p className="text-sm">Settlements from your merchants will appear here</p>
              </CardContent>
            </Card>
          ) : (
            settlements.map(settlement => (
              <Card key={settlement.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <CoinBadge coin={settlement.coin} />
                    <div>
                      <CardTitle className="text-base">
                        {Number(settlement.amount).toFixed(8)} {settlement.coin}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        ${Number(settlement.usd_value_at_request).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={settlement.status} />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet</span>
                    <span className="font-mono text-xs">{settlement.wallet_address.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested</span>
                    <span>{format(new Date(settlement.requested_at), 'PPp')}</span>
                  </div>
                  {settlement.processed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processed</span>
                      <span>{format(new Date(settlement.processed_at), 'PPp')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
