import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { formatDistanceToNow } from 'date-fns';
import { useLedgerEntries } from '@/hooks/useLedger';
import { useMerchants } from '@/hooks/useMerchants';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Download,
  Wallet,
  TrendingUp,
  Minus,
  Loader2,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminLedger() {
  const [selectedMerchant, setSelectedMerchant] = useState<string>('ALL');
  const { data: entries, isLoading } = useLedgerEntries(
    selectedMerchant !== 'ALL' ? selectedMerchant : undefined
  );
  const { data: merchants } = useMerchants();
  const { data: exchangeRates } = useExchangeRates();

  const merchantNames = Object.fromEntries(
    (merchants || []).map(m => [m.id, m.name])
  );

  // Calculate balances by coin
  const balancesByCoin = (entries || []).reduce((acc, entry) => {
    const coin = entry.coin;
    if (!acc[coin]) {
      acc[coin] = { credits: 0, debits: 0 };
    }
    if (entry.entry_type === 'CREDIT') {
      acc[coin].credits += Number(entry.amount);
    } else {
      acc[coin].debits += Number(entry.amount);
    }
    return acc;
  }, {} as Record<string, { credits: number; debits: number }>);

  const rateMap = exchangeRates?.ratesMap || {};

  const coinBalances = Object.entries(balancesByCoin).map(([coin, { credits, debits }]) => ({
    coin: coin as 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'LTC' | 'TRX',
    balance: credits - debits,
    usdValue: (credits - debits) * (rateMap[coin] || 1),
  }));

  const totalUsdBalance = coinBalances.reduce((sum, b) => sum + b.usdValue, 0);

  if (isLoading) {
    return (
      <DashboardLayout role="admin" title="Ledger">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Ledger">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Ledger</h1>
            <p className="text-muted-foreground">
              Complete financial record of all platform transactions
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Merchants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Merchants</SelectItem>
                {(merchants || []).map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
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
                  <p className="text-sm text-muted-foreground">
                    {selectedMerchant === 'ALL' ? 'Total Platform Balance' : 'Merchant Balance'}
                  </p>
                  <p className="text-3xl font-bold">
                    ${totalUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {coinBalances.slice(0, 3).map((balance) => (
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
              {(entries || []).map((entry, index) => (
                <div 
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/10 animate-fade-in",
                    entry.entry_type === 'CREDIT' ? 'hover:bg-status-confirmed/5' : 'hover:bg-status-pending/5'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "rounded-full p-2",
                      entry.entry_type === 'CREDIT' 
                        ? 'bg-status-confirmed/10' 
                        : 'bg-status-pending/10'
                    )}>
                      {entry.entry_type === 'CREDIT' ? (
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
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">
                          {merchantNames[entry.merchant_id] || 'Unknown'}
                        </span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={cn(
                      "font-mono font-semibold text-lg",
                      entry.entry_type === 'CREDIT' ? 'text-status-confirmed' : 'text-status-pending'
                    )}>
                      {entry.entry_type === 'CREDIT' ? '+' : '-'}{Number(entry.amount).toFixed(6)} {entry.coin}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      ${Number(entry.usd_value_at_time).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {(!entries || entries.length === 0) && (
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