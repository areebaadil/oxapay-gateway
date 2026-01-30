import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useSettlements, useCreateSettlement } from '@/hooks/useSettlements';
import { useLedgerBalance } from '@/hooks/useLedger';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { CoinType, SUPPORTED_COIN } from '@/types';

// Only USDT is supported for new settlements
const ALL_COINS: CoinType[] = [SUPPORTED_COIN];

export default function MerchantSettlements() {
  const { merchantId } = useAuth();
  const { data: settlements, isLoading } = useSettlements();
  const { data: exchangeRates } = useExchangeRates();
  const balances = useLedgerBalance(merchantId || undefined);
  const createSettlement = useCreateSettlement();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<CoinType | ''>('');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const ratesMap = exchangeRates?.ratesMap || {};

  const availableBalances = balances?.filter(b => b.balance > 0) || [];

  const selectedBalance = selectedCoin 
    ? availableBalances.find(b => b.coin === selectedCoin)?.balance || 0
    : 0;

  const usdValue = selectedCoin && amount 
    ? Number(amount) * (ratesMap[selectedCoin] || 0)
    : 0;

  const handleSubmit = () => {
    if (!selectedCoin || !amount || !walletAddress) return;
    
    createSettlement.mutate({
      coin: selectedCoin,
      amount: Number(amount),
      usd_value_at_request: usdValue,
      wallet_address: walletAddress,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setSelectedCoin('');
        setAmount('');
        setWalletAddress('');
      }
    });
  };

  const pendingSettlements = settlements?.filter(s => s.status === 'PENDING') || [];
  const otherSettlements = settlements?.filter(s => s.status !== 'PENDING') || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-status-pending" />;
      case 'APPROVED': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-status-confirmed" />;
      case 'REJECTED': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="merchant" title="Settlements">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="merchant" title="Settlements">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Settlements</h1>
            <p className="text-muted-foreground">
              Request withdrawals from your available balance
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Request Settlement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Request Settlement</DialogTitle>
                <DialogDescription>
                  Withdraw funds from your available balance
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Coin Selection */}
                <div className="space-y-2">
                  <Label>Select Coin / Payment Method</Label>
                  <Select value={selectedCoin} onValueChange={(v) => setSelectedCoin(v as CoinType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose cryptocurrency or payment method" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {ALL_COINS.map(coin => {
                        const balance = availableBalances.find(b => b.coin === coin)?.balance || 0;
                        return (
                          <SelectItem key={coin} value={coin}>
                            <div className="flex items-center gap-2">
                              <CoinBadge coin={coin} />
                              {balance > 0 && (
                                <span className="text-muted-foreground">
                                  ({balance.toFixed(6)} available)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-20"
                      step="0.000001"
                      max={selectedBalance}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {selectedCoin || 'COIN'}
                    </div>
                  </div>
                  {selectedCoin && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Available: {selectedBalance.toFixed(6)} {selectedCoin}
                      </span>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0"
                        onClick={() => setAmount(selectedBalance.toString())}
                      >
                        Max
                      </Button>
                    </div>
                  )}
                  {usdValue > 0 && (
                    <p className="text-sm text-muted-foreground">
                      ≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </p>
                  )}
                </div>

                {/* Wallet Address */}
                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <Input
                    placeholder={`Enter your ${selectedCoin || 'crypto'} wallet address`}
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={
                    !selectedCoin || 
                    !amount || 
                    !walletAddress || 
                    Number(amount) <= 0 || 
                    Number(amount) > selectedBalance ||
                    createSettlement.isPending
                  }
                >
                  {createSettlement.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Available Balances */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Available Balances
            </CardTitle>
            <CardDescription>
              Funds available for withdrawal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableBalances.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableBalances.map(balance => (
                  <div 
                    key={balance.coin}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <CoinBadge coin={balance.coin as CoinType} />
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {balance.balance.toFixed(6)}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        ≈ ${(balance.balance * (ratesMap[balance.coin] || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No available balance</p>
                <p className="text-sm">Confirmed deposits will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Settlements */}
        {pendingSettlements.length > 0 && (
          <Card className="border-status-pending/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-status-pending" />
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingSettlements.map((settlement, index) => (
                <div 
                  key={settlement.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 animate-fade-in"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-status-pending/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-status-pending" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">
                          {Number(settlement.amount).toFixed(6)}
                        </span>
                        <CoinBadge coin={settlement.coin} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Requested {formatDistanceToNow(new Date(settlement.requested_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-muted-foreground">
                        ≈ ${Number(settlement.usd_value_at_request).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {settlement.wallet_address.slice(0, 8)}...{settlement.wallet_address.slice(-6)}
                      </p>
                    </div>
                    <StatusBadge status={settlement.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Settlement History */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Settlement History</CardTitle>
          </CardHeader>
          <CardContent>
            {otherSettlements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Coin</th>
                      <th>Amount</th>
                      <th>USD Value</th>
                      <th>Wallet</th>
                      <th>Requested</th>
                      <th>Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherSettlements.map((settlement, index) => (
                      <tr 
                        key={settlement.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(settlement.status)}
                            <StatusBadge status={settlement.status} />
                          </div>
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
                        <td className="font-mono text-xs text-muted-foreground">
                          {settlement.wallet_address.slice(0, 10)}...{settlement.wallet_address.slice(-8)}
                        </td>
                        <td className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(settlement.requested_at), { addSuffix: true })}
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
                No settlement history yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
