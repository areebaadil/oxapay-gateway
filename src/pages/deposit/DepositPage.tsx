import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CoinBadge } from '@/components/ui/CoinBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Copy, 
  CheckCircle2, 
  Clock, 
  QrCode,
  ArrowLeft,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type CoinType = Database['public']['Enums']['coin_type'];

// Only USDT is supported for deposits
const SUPPORTED_COINS: { coin: CoinType; network: string }[] = [
  { coin: 'USDT', network: 'Tron (TRC-20)' },
];

type DepositStep = 'loading' | 'select' | 'payment' | 'confirming' | 'complete' | 'expired' | 'error';

interface DepositIntent {
  id: string;
  coin: CoinType;
  expected_amount: number;
  deposit_address: string | null;
  expires_at: string;
  merchant_name: string | null;
  success_url: string | null;
  failure_url: string | null;
}

interface PaymentData {
  address: string;
  pay_amount: number;
  pay_currency: string;
  network: string;
  qr_code: string;
  rate: number;
  expires_at: string;
  transaction_id: string;
}

interface TransactionData {
  id: string;
  status: string;
  crypto_amount: number;
  usd_value: number;
  tx_hash: string | null;
  confirmed_at: string | null;
}

export default function DepositPage() {
  const { intentId } = useParams<{ intentId: string }>();
  const [step, setStep] = useState<DepositStep>('loading');
  const [selectedCoin, setSelectedCoin] = useState<CoinType | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositIntent, setDepositIntent] = useState<DepositIntent | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('--:--');

  const { data: ratesData } = useExchangeRates();
  const exchangeRates = ratesData?.ratesMap || {};

  // Load deposit intent on mount
  useEffect(() => {
    if (intentId) {
      loadDepositIntent();
    } else {
      setStep('select');
    }
  }, [intentId]);

  // Poll for transaction status updates (public RLS policy allows reading by deposit_intent_id)
  useEffect(() => {
    if (!intentId || !transaction?.id || step === 'complete' || step === 'expired' || step === 'error') return;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('deposit_intent_id', intentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setTransaction({
            id: data.id,
            status: data.status,
            crypto_amount: Number(data.crypto_amount),
            usd_value: Number(data.usd_value),
            tx_hash: data.tx_hash,
            confirmed_at: data.confirmed_at,
          });

          if (data.status === 'CONFIRMED') {
            setStep('complete');
          } else if (data.status === 'EXPIRED') {
            setStep('expired');
          } else if (data.status === 'FAILED') {
            setError('Payment failed');
            setStep('error');
          }
        }
      } catch (err) {
        console.error('Error polling transaction status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [intentId, transaction?.id, step]);

  // Auto-redirect after payment completion
  useEffect(() => {
    if (step === 'complete' && depositIntent?.success_url) {
      const timer = setTimeout(() => {
        window.location.href = depositIntent.success_url!;
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (step === 'expired' && depositIntent?.failure_url) {
      const timer = setTimeout(() => {
        window.location.href = depositIntent.failure_url!;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, depositIntent?.success_url, depositIntent?.failure_url]);

  // Countdown timer
  useEffect(() => {
    if (!paymentData?.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(paymentData.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        setStep('expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [paymentData?.expires_at]);

  const loadDepositIntent = async () => {
    try {
      // Public RLS policy allows reading deposit_intents by ID
      const { data, error: fetchError } = await supabase
        .from('deposit_intents')
        .select('*, merchants(name)')
        .eq('id', intentId!)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Deposit intent not found');
        setStep('error');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setDepositIntent({
          id: data.id,
          coin: data.coin,
          expected_amount: Number(data.expected_amount),
          deposit_address: data.deposit_address,
          expires_at: data.expires_at,
          merchant_name: (data.merchants as { name: string } | null)?.name || null,
          success_url: data.success_url,
          failure_url: data.failure_url,
        });
        setStep('expired');
        return;
      }

      setDepositIntent({
        id: data.id,
        coin: data.coin,
        expected_amount: Number(data.expected_amount),
        deposit_address: data.deposit_address,
        expires_at: data.expires_at,
        merchant_name: (data.merchants as { name: string } | null)?.name || null,
        success_url: data.success_url,
        failure_url: data.failure_url,
      });

      // Check for existing transaction (public RLS allows reading by deposit_intent_id)
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('deposit_intent_id', intentId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (txData) {
        setTransaction({
          id: txData.id,
          status: txData.status,
          crypto_amount: Number(txData.crypto_amount),
          usd_value: Number(txData.usd_value),
          tx_hash: txData.tx_hash,
          confirmed_at: txData.confirmed_at,
        });

        if (txData.status === 'CONFIRMED') {
          setStep('complete');
          return;
        }

        if (data.deposit_address) {
          setSelectedCoin(data.coin);
          setPaymentData({
            address: data.deposit_address,
            pay_amount: Number(txData.crypto_amount),
            pay_currency: data.coin,
            network: '',
            qr_code: '',
            rate: Number(txData.exchange_rate),
            expires_at: data.expires_at,
            transaction_id: txData.id,
          });
          setStep('payment');
          return;
        }
      }

      // Pre-select coin if specified in intent
      if (data.coin) {
        setSelectedCoin(data.coin);
      }

      setStep('select');
    } catch (err) {
      console.error('Error loading deposit intent:', err);
      setError('Failed to load deposit details');
      setStep('error');
    }
  };

  const handleCoinSelect = async (coin: CoinType) => {
    setSelectedCoin(coin);
    
    if (!intentId) {
      setStep('payment');
      return;
    }

    await createPayment(coin);
  };

  const createPayment = async (coin: CoinType) => {
    if (!depositIntent) return;

    setIsCreatingPayment(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('create-payment', {
        body: {
          deposit_intent_id: depositIntent.id,
          amount: depositIntent.expected_amount,
          currency: 'USD',
          pay_currency: coin,
          user_reference: `deposit_${depositIntent.id}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create payment');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to create payment');
      }

      setPaymentData({
        address: result.data.address,
        pay_amount: result.data.pay_amount,
        pay_currency: result.data.pay_currency,
        network: result.data.network,
        qr_code: result.data.qr_code,
        rate: result.data.rate,
        expires_at: result.data.expires_at,
        transaction_id: result.data.transaction_id,
      });

      if (result.data.transaction_id) {
        setTransaction({
          id: result.data.transaction_id,
          status: 'PENDING',
          crypto_amount: result.data.pay_amount,
          usd_value: depositIntent.expected_amount,
          tx_hash: null,
          confirmed_at: null,
        });
      }

      setStep('payment');
    } catch (err) {
      console.error('Error creating payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create payment');
      setStep('error');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleCopy = () => {
    const address = paymentData?.address || 'TJYXRvfR5C6xY1uyPJB8p1bC7iSmKWZvKr';
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const merchantName = depositIntent?.merchant_name || 'Demo Merchant';
  const expectedAmount = depositIntent?.expected_amount || 100;
  const cryptoAmount = paymentData?.pay_amount || 
    (selectedCoin ? (expectedAmount / (exchangeRates[selectedCoin] || 1)).toFixed(8) : '0');

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
          
          {step === 'payment' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expires in {timeLeft}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">Payment to</p>
          <h1 className="text-2xl font-bold">{merchantName}</h1>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <Card className="border-border/50 animate-fade-in">
            <CardContent className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading payment details...</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {step === 'error' && (
          <Card className="border-destructive/30 animate-fade-in">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Error</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

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
                  <span className="text-3xl font-bold">${expectedAmount.toLocaleString()}</span>
                </div>
              </div>
              
              {SUPPORTED_COINS.map((item) => (
                <button
                  key={item.coin}
                  onClick={() => handleCoinSelect(item.coin)}
                  disabled={isCreatingPayment}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <CoinBadge coin={item.coin} />
                    <div className="text-left">
                      <p className="font-medium">{item.coin}</p>
                      <p className="text-xs text-muted-foreground">{item.network}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    ≈ {(expectedAmount / (exchangeRates[item.coin] || 1)).toFixed(6)}
                  </span>
                </button>
              ))}

              {isCreatingPayment && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">Creating payment...</span>
                </div>
              )}
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
                <p className="text-sm text-muted-foreground mt-1">≈ ${expectedAmount.toLocaleString()} USD</p>
              </div>

              {/* QR Code - plain address only */}
              <div className="flex justify-center">
                {paymentData?.address ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentData.address)}`}
                    alt="Payment QR Code" 
                    className="w-48 h-48 rounded-xl border border-border/50"
                  />
                ) : (
                  <div className="w-48 h-48 bg-muted/50 rounded-xl flex items-center justify-center border border-border/50">
                    <QrCode className="h-32 w-32 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Address */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">To this address</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="font-mono text-sm flex-1 break-all">
                    {paymentData?.address || 'TJYXRvfR5C6xY1uyPJB8p1bC7iSmKWZvKr'}
                  </span>
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

              {/* Waiting indicator */}
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Waiting for payment...</span>
              </div>
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
                  <span className="font-mono font-semibold">
                    {transaction?.crypto_amount.toFixed(6)} {selectedCoin}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status="CONFIRMED" />
                </div>
              </div>

              {depositIntent?.success_url ? (
                <div className="mt-8 space-y-2">
                  <p className="text-sm text-muted-foreground">Redirecting you back...</p>
                  <Button 
                    onClick={() => window.location.href = depositIntent.success_url!}
                  >
                    Return to {depositIntent.merchant_name || 'Merchant'}
                  </Button>
                </div>
              ) : (
                <Button 
                  className="mt-8" 
                  variant="outline"
                  onClick={() => window.close()}
                >
                  Close Window
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Expired */}
        {step === 'expired' && (
          <Card className="border-border/50 border-status-expired/30 animate-fade-in">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-status-expired/10 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-status-expired" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Expired</h2>
              <p className="text-muted-foreground mb-6">
                This payment link has expired. Please request a new payment.
              </p>

              {depositIntent?.failure_url ? (
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = depositIntent.failure_url!}
                >
                  Return to {depositIntent.merchant_name || 'Merchant'}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => window.close()}
                >
                  Close Window
                </Button>
              )}
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
