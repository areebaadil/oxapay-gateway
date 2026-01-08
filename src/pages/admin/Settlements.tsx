import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockSettlements, mockMerchants } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wallet,
  Copy,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Settlements() {
  const merchantNames = Object.fromEntries(
    mockMerchants.map(m => [m.id, m.name])
  );

  const pendingSettlements = mockSettlements.filter(s => s.status === 'PENDING');
  const processedSettlements = mockSettlements.filter(s => s.status !== 'PENDING');

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 12)}...${address.slice(-10)}`;
  };

  return (
    <DashboardLayout role="admin" title="Settlements">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Settlement Management</h1>
          <p className="text-muted-foreground">
            Review and approve merchant settlement requests
          </p>
        </div>

        {/* Pending Settlements */}
        <Card className="border-border/50 border-status-pending/30">
          <CardHeader className="flex flex-row items-center gap-3 pb-4">
            <div className="rounded-lg bg-status-pending/10 p-2">
              <Clock className="h-5 w-5 text-status-pending" />
            </div>
            <div>
              <CardTitle className="text-lg">Pending Approval</CardTitle>
              <p className="text-sm text-muted-foreground">
                {pendingSettlements.length} settlement{pendingSettlements.length !== 1 ? 's' : ''} awaiting review
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingSettlements.map((settlement, index) => (
              <div 
                key={settlement.id}
                className={cn(
                  "flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 animate-fade-in",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-status-pending/10 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-status-pending" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {merchantNames[settlement.merchantId]}
                      </span>
                      <CoinBadge coin={settlement.coin} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono">{truncateAddress(settlement.walletAddress)}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested {formatDistanceToNow(settlement.requestedAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">
                      {settlement.amount.toFixed(6)} {settlement.coin}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      ≈ ${settlement.usdValueAtRequest.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-status-confirmed hover:bg-status-confirmed/90"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {pendingSettlements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No pending settlements
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Settlements */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Settlement History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Merchant</th>
                    <th>Coin</th>
                    <th>Amount</th>
                    <th>USD Value</th>
                    <th>Status</th>
                    <th>Wallet</th>
                    <th>Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {processedSettlements.map((settlement, index) => (
                    <tr 
                      key={settlement.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="font-mono text-sm text-muted-foreground">
                        {settlement.id}
                      </td>
                      <td className="font-medium">
                        {merchantNames[settlement.merchantId]}
                      </td>
                      <td>
                        <CoinBadge coin={settlement.coin} />
                      </td>
                      <td className="font-mono font-semibold">
                        {settlement.amount.toFixed(6)}
                      </td>
                      <td className="font-mono text-muted-foreground">
                        ${settlement.usdValueAtRequest.toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge status={settlement.status} />
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {truncateAddress(settlement.walletAddress)}
                          </span>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {settlement.processedAt 
                          ? formatDistanceToNow(settlement.processedAt, { addSuffix: true })
                          : '—'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
