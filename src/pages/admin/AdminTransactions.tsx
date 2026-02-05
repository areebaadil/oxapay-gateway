import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TransactionsTable } from '@/components/tables/TransactionsTable';
import { useTransactions } from '@/hooks/useTransactions';
import { useMerchants } from '@/hooks/useMerchants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Download, RefreshCw, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminTransactions() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [coinFilter, setCoinFilter] = useState('ALL');
  const [merchantFilter, setMerchantFilter] = useState('ALL');

  const { data: merchants } = useMerchants();
  const { data: transactions, isLoading } = useTransactions({
    status: statusFilter,
    coin: coinFilter,
    merchantId: merchantFilter,
  });

  const merchantNames = Object.fromEntries(
    (merchants || []).map(m => [m.id, m.name])
  );
  
  const merchantEmails = Object.fromEntries(
    (merchants || []).map(m => [m.id, m.email])
  );

  // Filter by search query
  const filteredTransactions = (transactions || []).filter(tx => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.id.toLowerCase().includes(query) ||
      tx.user_reference.toLowerCase().includes(query) ||
      tx.tx_hash?.toLowerCase().includes(query)
    );
  });

  // Transform for table
  const tableTransactions = filteredTransactions.map(tx => ({
    id: tx.id,
    merchantId: tx.merchant_id,
    depositIntentId: tx.deposit_intent_id || '',
    coin: tx.coin,
    cryptoAmount: Number(tx.crypto_amount),
    usdValue: Number(tx.usd_value),
    exchangeRate: Number(tx.exchange_rate),
    status: tx.status,
    txHash: tx.tx_hash,
    userReference: tx.user_reference,
    createdAt: new Date(tx.created_at),
    confirmedAt: tx.confirmed_at ? new Date(tx.confirmed_at) : null,
  }));

  const allTransactions = transactions || [];
  const statusCounts = {
    ALL: allTransactions.length,
    PENDING: allTransactions.filter(tx => tx.status === 'PENDING').length,
    CONFIRMED: allTransactions.filter(tx => tx.status === 'CONFIRMED').length,
    FAILED: allTransactions.filter(tx => tx.status === 'FAILED').length,
    EXPIRED: allTransactions.filter(tx => tx.status === 'EXPIRED').length,
    SETTLED: allTransactions.filter(tx => tx.status === 'SETTLED').length,
  };

  if (isLoading) {
    return (
      <DashboardLayout role="admin" title="Transactions">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Transactions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">All Transactions</h1>
            <p className="text-muted-foreground">
              Monitor and manage all gateway transactions
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'SETTLED'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? 'glow-primary' : ''}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              <span className="ml-2 text-xs opacity-70">
                {statusCounts[status]}
              </span>
            </Button>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search by ID, user ref, or hash..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={coinFilter} onValueChange={setCoinFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Coin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Coins</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="LTC">LTC</SelectItem>
                  <SelectItem value="TRX">TRX</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Merchant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Merchants</SelectItem>
                  {(merchants || []).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <TransactionsTable 
          transactions={tableTransactions}
          showMerchant
          merchantNames={merchantNames}
          merchantEmails={merchantEmails}
          showActions
        />

        {/* Pagination placeholder */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredTransactions.length} transactions
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
