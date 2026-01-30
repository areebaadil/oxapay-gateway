import { useState } from 'react';
import { Transaction } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Copy, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useUpdateTransactionStatus } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';

interface TransactionsTableProps {
  transactions: Transaction[];
  showMerchant?: boolean;
  merchantNames?: Record<string, string>;
  showActions?: boolean;
}

export function TransactionsTable({ 
  transactions, 
  showMerchant = false,
  merchantNames = {},
  showActions = false,
}: TransactionsTableProps) {
  const { toast } = useToast();
  const updateStatus = useUpdateTransactionStatus();
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [txHash, setTxHash] = useState('');

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const handleApproveClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setTxHash('');
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setRejectDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedTransaction) return;
    
    updateStatus.mutate({
      transactionId: selectedTransaction.id,
      status: 'CONFIRMED',
      txHash: txHash || undefined,
    }, {
      onSuccess: () => {
        setApproveDialogOpen(false);
        setSelectedTransaction(null);
        setTxHash('');
      }
    });
  };

  const handleReject = () => {
    if (!selectedTransaction) return;
    
    updateStatus.mutate({
      transactionId: selectedTransaction.id,
      status: 'FAILED',
    }, {
      onSuccess: () => {
        setRejectDialogOpen(false);
        setSelectedTransaction(null);
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              {showMerchant && <th>Merchant</th>}
              <th>Coin</th>
              <th>Amount</th>
              <th>USD Value</th>
              <th>Status</th>
              <th>User Ref</th>
              <th>Time</th>
              <th>TX Hash</th>
              {showActions && <th>Actions</th>}
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
                {showMerchant && (
                  <td>
                    <span className="font-medium">
                      {merchantNames[tx.merchantId] || tx.merchantId}
                    </span>
                  </td>
                )}
                <td>
                  <CoinBadge coin={tx.coin} />
                </td>
                <td>
                  <span className="font-mono font-semibold">
                    {tx.cryptoAmount.toFixed(6)}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-muted-foreground">
                    ${tx.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td>
                  <StatusBadge status={tx.status} />
                </td>
                <td>
                  <span className="text-sm text-muted-foreground">
                    {tx.userReference}
                  </span>
                </td>
                <td>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(tx.createdAt, { addSuffix: true })}
                  </span>
                </td>
                <td>
                  {tx.txHash ? (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {truncateHash(tx.txHash)}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(tx.txHash!)}
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
                {showActions && (
                  <td>
                    {tx.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-green-600 border-green-600/30 hover:bg-green-600/10 hover:text-green-500"
                          onClick={() => handleApproveClick(tx)}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleRejectClick(tx)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                )}
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

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Transaction</DialogTitle>
            <DialogDescription>
              Confirm this transaction as successful. Optionally add the blockchain transaction hash.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedTransaction && (
              <div className="rounded-lg bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-semibold">
                    {selectedTransaction.cryptoAmount.toFixed(6)} {selectedTransaction.coin}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">USD Value</span>
                  <span className="font-mono">${selectedTransaction.usdValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User Reference</span>
                  <span className="font-mono text-xs">{selectedTransaction.userReference}</span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Transaction Hash (Optional)</Label>
              <Input
                placeholder="Enter blockchain transaction hash..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={updateStatus.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateStatus.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Transaction
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this transaction? This will mark it as failed and cannot be undone.
              {selectedTransaction && (
                <span className="block mt-2 font-mono text-sm">
                  {selectedTransaction.cryptoAmount.toFixed(6)} {selectedTransaction.coin} 
                  (${selectedTransaction.usdValue.toLocaleString()})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={updateStatus.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {updateStatus.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Transaction'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}