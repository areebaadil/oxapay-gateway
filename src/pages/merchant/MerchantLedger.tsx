import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockLedgerEntries, exchangeRates } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Download,
  Wallet,
  TrendingUp,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoinType } from '@/types';

export default function MerchantLedger() {
  const merchantId = 'merch_001';
  const merchantEntries = mockLedgerEntries.filter(e => e.merchantId === merchantId);

  // Calculate balances by coin
  const balancesByCoin = merchantEntries.reduce((acc, entry) => {
    const coin = entry.coin;
    if (!acc[coin]) {
      acc[coin] = { credits: 0, debits: 0 };
    }
    if (entry.entryType === 'CREDIT') {
      acc[coin].credits += entry.amount;
    } else {
      acc[coin].debits += entry.amount;
    }
    return acc;
  }, {} as Record<CoinType, { credits: number; debits: number }>);

  const coinBalances = Object.entries(balancesByCoin).map(([coin, { credits, debits }]) => ({
    coin: coin as CoinType,
    balance: credits - debits,
    usdValue: (credits - debits) * exchangeRates[coin as CoinType],
  }));

  const totalUsdBalance = coinBalances.reduce((sum, b) => sum + b.usdValue, 0);

  return (
    <DashboardLayout role="merchant" title="Ledger">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ledger</h1>
            <p className="text-muted-foreground">
              Complete financial record of all transactions
            </p>
          </div>
          
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Ledger
          </Button>
        </div>

        {/* Balance Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 col-span-full lg:col-span-1 bg-gradient-to-br from-primary/10 via-card to-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-primary/20 p-3">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-3xl font-bold">${totalUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {coinBalances.map((balance) => (
            <Card key={balance.coin} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CoinBadge coin={balance.coin} />
                  <TrendingUp className="h-4 w-4 text-status-confirmed" />
                </div>
                <p className="text-2xl font-bold font-mono">
                  {balance.balance.toFixed(6)}
                </p>
                <p className="text-sm text-muted-foreground">
                  ≈ ${balance.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ledger Entries */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {merchantEntries.map((entry, index) => (
                <div 
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/10 animate-fade-in",
                    entry.entryType === 'CREDIT' ? 'hover:bg-status-confirmed/5' : 'hover:bg-status-pending/5'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "rounded-full p-2",
                      entry.entryType === 'CREDIT' 
                        ? 'bg-status-confirmed/10' 
                        : 'bg-status-pending/10'
                    )}>
                      {entry.entryType === 'CREDIT' ? (
                        <ArrowDownRight className="h-5 w-5 text-status-confirmed" />
                      ) : entry.category === 'FEE' ? (
                        <Minus className="h-5 w-5 text-status-pending" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-status-pending" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.description}</span>
                        <CoinBadge coin={entry.coin} showIcon={false} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{entry.transactionId}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(entry.createdAt, { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={cn(
                      "font-mono font-semibold text-lg",
                      entry.entryType === 'CREDIT' ? 'text-status-confirmed' : 'text-status-pending'
                    )}>
                      {entry.entryType === 'CREDIT' ? '+' : '-'}{entry.amount.toFixed(6)} {entry.coin}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      ${entry.usdValueAtTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {merchantEntries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No ledger entries yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
