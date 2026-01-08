import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TransactionsTable } from '@/components/tables/TransactionsTable';
import { mockTransactions } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CoinType, TransactionStatus } from '@/types';

export default function MerchantTransactions() {
  const merchantId = 'merch_001';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'ALL'>('ALL');
  const [coinFilter, setCoinFilter] = useState<CoinType | 'ALL'>('ALL');

  const merchantTransactions = mockTransactions.filter(tx => tx.merchantId === merchantId);

  const filteredTransactions = merchantTransactions.filter(tx => {
    if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
    if (coinFilter !== 'ALL' && tx.coin !== coinFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.id.toLowerCase().includes(query) ||
        tx.userReference.toLowerCase().includes(query) ||
        tx.txHash?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const statusCounts = {
    ALL: merchantTransactions.length,
    PENDING: merchantTransactions.filter(tx => tx.status === 'PENDING').length,
    CONFIRMED: merchantTransactions.filter(tx => tx.status === 'CONFIRMED').length,
    FAILED: merchantTransactions.filter(tx => tx.status === 'FAILED').length,
    SETTLED: merchantTransactions.filter(tx => tx.status === 'SETTLED').length,
  };

  return (
    <DashboardLayout role="merchant" title="Transactions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Transactions</h1>
            <p className="text-muted-foreground">
              View all deposits received through the gateway
            </p>
          </div>
          
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PENDING', 'CONFIRMED', 'FAILED', 'SETTLED'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? 'glow-primary' : ''}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              <span className="ml-2 text-xs opacity-70">
                {statusCounts[status as keyof typeof statusCounts] || 0}
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
              
              <Select value={coinFilter} onValueChange={(v) => setCoinFilter(v as CoinType | 'ALL')}>
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
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <TransactionsTable transactions={filteredTransactions} />

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredTransactions.length} of {merchantTransactions.length} transactions
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
