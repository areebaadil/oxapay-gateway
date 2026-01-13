import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useSettlements, useProcessSettlement, useCompleteSettlement } from '@/hooks/useSettlements';
import { useMerchants } from '@/hooks/useMerchants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wallet,
  Copy,
  ExternalLink,
  Loader2,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Settlements() {
  const { data: merchants } = useMerchants();
  const { data: allSettlements, isLoading } = useSettlements();
  const processSettlement = useProcessSettlement();
  const completeSettlement = useCompleteSettlement();
  
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);
  const [txHash, setTxHash] = useState('');

  const merchantNames = Object.fromEntries(
    (merchants || []).map(m => [m.id, m.name])
  );

  const pendingSettlements = (allSettlements || []).filter(s => s.status === 'PENDING');
  const approvedSettlements = (allSettlements || []).filter(s => s.status === 'APPROVED');
  const completedSettlements = (allSettlements || []).filter(s => 
    s.status === 'COMPLETED' || s.status === 'REJECTED'
  );

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 12)}...${address.slice(-10)}`;
  };

  const handleApprove = (id: string) => {
    processSettlement.mutate({ id, status: 'APPROVED' });
  };

  const handleReject = (id: string) => {
    processSettlement.mutate({ id, status: 'REJECTED' });
  };

  const handleComplete = () => {
    if (!selectedSettlement || !txHash) return;
    
    completeSettlement.mutate(
      { settlementId: selectedSettlement, txHash },
      {
        onSuccess: () => {
          setCompleteDialogOpen(false);
          setSelectedSettlement(null);
          setTxHash('');
        }
      }
    );
  };

  const openCompleteDialog = (id: string) => {
    setSelectedSettlement(id);
    setCompleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="admin" title="Settlements">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Settlements">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Settlement Management</h1>
          <p className="text-muted-foreground">
            Review, approve, and process merchant settlement requests
          </p>
        </div>

        {/* Complete Settlement Dialog */}
        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Settlement</DialogTitle>
              <DialogDescription>
                Enter the transaction hash to confirm the settlement has been sent.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Transaction Hash</Label>
                <Input
                  placeholder="Enter blockchain transaction hash"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={!txHash || completeSettlement.isPending}
                className="bg-status-confirmed hover:bg-status-confirmed/90"
              >
                {completeSettlement.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Complete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                        {merchantNames[settlement.merchant_id] || 'Unknown Merchant'}
                      </span>
                      <CoinBadge coin={settlement.coin} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono">{truncateAddress(settlement.wallet_address)}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5"
                        onClick={() => navigator.clipboard.writeText(settlement.wallet_address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested {formatDistanceToNow(new Date(settlement.requested_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">
                      {Number(settlement.amount).toFixed(6)} {settlement.coin}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      ≈ ${Number(settlement.usd_value_at_request).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(settlement.id)}
                      disabled={processSettlement.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-status-confirmed hover:bg-status-confirmed/90"
                      onClick={() => handleApprove(settlement.id)}
                      disabled={processSettlement.isPending}
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

        {/* Approved Settlements - Ready to Send */}
        {approvedSettlements.length > 0 && (
          <Card className="border-border/50 border-blue-500/30">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Ready to Send</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {approvedSettlements.length} approved settlement{approvedSettlements.length !== 1 ? 's' : ''} awaiting payment
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {approvedSettlements.map((settlement, index) => (
                <div 
                  key={settlement.id}
                  className={cn(
                    "flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 animate-fade-in",
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-blue-500" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {merchantNames[settlement.merchant_id] || 'Unknown Merchant'}
                        </span>
                        <CoinBadge coin={settlement.coin} />
                        <StatusBadge status={settlement.status} />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-foreground">{settlement.wallet_address}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={() => navigator.clipboard.writeText(settlement.wallet_address)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono">
                        {Number(settlement.amount).toFixed(6)} {settlement.coin}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        ≈ ${Number(settlement.usd_value_at_request).toLocaleString()}
                      </p>
                    </div>
                    
                    <Button 
                      size="sm"
                      onClick={() => openCompleteDialog(settlement.id)}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Mark as Sent
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Processed Settlements */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Settlement History</CardTitle>
          </CardHeader>
          <CardContent>
            {completedSettlements.length > 0 ? (
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
                    {completedSettlements.map((settlement, index) => (
                      <tr 
                        key={settlement.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="font-mono text-sm text-muted-foreground">
                          {settlement.id.slice(0, 8)}...
                        </td>
                        <td className="font-medium">
                          {merchantNames[settlement.merchant_id] || 'Unknown'}
                        </td>
                        <td>
                          <CoinBadge coin={settlement.coin} />
                        </td>
                        <td className="font-mono font-semibold">
                          {Number(settlement.amount).toFixed(6)}
                        </td>
                        <td className="font-mono text-muted-foreground">
                          ${Number(settlement.usd_value_at_request).toLocaleString()}
                        </td>
                        <td>
                          <StatusBadge status={settlement.status} />
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {truncateAddress(settlement.wallet_address)}
                            </span>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="text-sm text-muted-foreground">
                          {settlement.processed_at 
                            ? formatDistanceToNow(new Date(settlement.processed_at), { addSuffix: true })
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No processed settlements yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
