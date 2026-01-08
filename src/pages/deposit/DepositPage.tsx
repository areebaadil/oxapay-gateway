import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CoinType } from '@/types';
import { exchangeRates } from '@/lib/mock-data';
import { 
  Shield, 
  Copy, 
  CheckCircle2, 
  Clock, 
  QrCode,
  ArrowLeft,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPPORTED_COINS: { coin: CoinType; network: string }[] = [
  { coin: 'BTC', network: 'Bitcoin' },
  { coin: 'ETH', network: 'Ethereum (ERC-20)' },
  { coin: 'USDT', network: 'Tron (TRC-20)' },
  { coin: 'USDC', network: 'Ethereum (ERC-20)' },
  { coin: 'LTC', network: 'Litecoin' },
  { coin: 'TRX', network: 'Tron' },
];

type DepositStep = 'select' | 'payment' | 'confirming' | 'complete';

export default function DepositPage() {
  const [step, setStep] = useState<DepositStep>('select');
  const [selectedCoin, setSelectedCoin] = useState<CoinType | null>(null);
  const [copied, setCopied] = useState(false);

  // Mock data
  const merchantName = 'GameFi Exchange';
  const expectedAmount = 100; // USD
  const depositAddress = 'TJYXRvfR5C6xY1uyPJB8p1bC7iSmKWZvKr';
  const expiresIn = '14:32';

  const handleCoinSelect = (coin: CoinType) => {
    setSelectedCoin(coin);
    setStep('payment');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulatePayment = () => {
    setStep('confirming');
    setTimeout(() => setStep('complete'), 3000);
  };

  const cryptoAmount = selectedCoin 
    ? (expectedAmount / exchangeRates[selectedCoin]).toFixed(8)
    : '0';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">CryptoGate</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expires in {expiresIn}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">Payment to</p>
          <h1 className="text-2xl font-bold">{merchantName}</h1>
        </div>

        {/* Step: Select Coin */}
        {step === 'select' && (
          <Card className="border-border/50 animate-fade-in">
            <CardHeader className="text-center pb-4">
              <CardTitle>Select Payment Method</CardTitle>
              <p className="text-muted-foreground text-sm">
                Choose your preferred cryptocurrency
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount to pay</span>
                  <span className="text-3xl font-bold">${expectedAmount}.00</span>
                </div>
              </div>
              
              {SUPPORTED_COINS.map((item) => (
                <button
                  key={item.coin}
                  onClick={() => handleCoinSelect(item.coin)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <CoinBadge coin={item.coin} />
                    <div className="text-left">
                      <p className="font-medium">{item.coin}</p>
                      <p className="text-xs text-muted-foreground">{item.network}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    ≈ {(expectedAmount / exchangeRates[item.coin]).toFixed(6)}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step: Payment */}
        {step === 'payment' && selectedCoin && (
          <Card className="border-border/50 animate-fade-in">
            <CardHeader>
              <button 
                onClick={() => setStep('select')}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Change coin
              </button>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Send <CoinBadge coin={selectedCoin} />
                </CardTitle>
                <StatusBadge status="PENDING" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm text-muted-foreground mb-1">Send exactly</p>
                <p className="text-3xl font-bold font-mono">{cryptoAmount} {selectedCoin}</p>
                <p className="text-sm text-muted-foreground mt-1">≈ ${expectedAmount}.00 USD</p>
              </div>

              {/* QR Code placeholder */}
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-muted/50 rounded-xl flex items-center justify-center border border-border/50">
                  <QrCode className="h-32 w-32 text-muted-foreground" />
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">To this address</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="font-mono text-sm flex-1 break-all">{depositAddress}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleCopy}
                    className={cn(copied && 'text-status-confirmed')}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-status-pending/10 border border-status-pending/30">
                <AlertCircle className="h-5 w-5 text-status-pending flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-status-pending">Important</p>
                  <p className="text-muted-foreground">
                    Send only {selectedCoin} to this address. Sending any other coin may result in permanent loss.
                  </p>
                </div>
              </div>

              {/* Demo button */}
              <Button 
                className="w-full glow-primary" 
                size="lg"
                onClick={simulatePayment}
              >
                I've sent the payment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirming */}
        {step === 'confirming' && (
          <Card className="border-border/50 animate-fade-in">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Confirming Payment</h2>
              <p className="text-muted-foreground">
                Waiting for blockchain confirmation...
              </p>
              <p className="text-sm text-muted-foreground mt-4 font-mono">
                0/3 confirmations
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <Card className="border-border/50 border-status-confirmed/30 animate-fade-in">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-status-confirmed/10 flex items-center justify-center animate-pulse-glow">
                  <CheckCircle2 className="h-10 w-10 text-status-confirmed" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Your payment has been confirmed and credited.
              </p>
              
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 max-w-xs mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-semibold">{cryptoAmount} {selectedCoin}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status="CONFIRMED" />
                </div>
              </div>

              <Button 
                className="mt-8" 
                variant="outline"
                onClick={() => window.close()}
              >
                Close Window
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="container max-w-2xl mx-auto px-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Secured by CryptoGate</span>
        </div>
      </footer>
    </div>
  );
}
