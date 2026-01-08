import { Transaction } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransactionsTableProps {
  transactions: Transaction[];
  showMerchant?: boolean;
  merchantNames?: Record<string, string>;
}

export function TransactionsTable({ 
  transactions, 
  showMerchant = false,
  merchantNames = {} 
}: TransactionsTableProps) {
  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
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
                  {tx.id}
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
                      onClick={() => navigator.clipboard.writeText(tx.txHash!)}
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
  );
}
