import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Book, 
  Key, 
  CreditCard, 
  List, 
  Wallet, 
  Info,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/merchant-api`;

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestBody?: object;
  responseBody: object;
  queryParams?: { name: string; type: string; description: string; required?: boolean }[];
  notes?: string;
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button 
        size="icon" 
        variant="ghost" 
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    POST: 'bg-green-500/10 text-green-500 border-green-500/30',
    PUT: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    DELETE: 'bg-red-500/10 text-red-500 border-red-500/30',
  };
  
  return (
    <Badge variant="outline" className={cn('font-mono font-bold', colors[method])}>
      {method}
    </Badge>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointProps }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <MethodBadge method={endpoint.method} />
              <code className="text-sm font-mono flex-1">{endpoint.path}</code>
            </div>
            <CardDescription className="ml-8 mt-1">{endpoint.description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {endpoint.notes && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{endpoint.notes}</span>
              </div>
            )}

            {endpoint.queryParams && endpoint.queryParams.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Query Parameters</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  {endpoint.queryParams.map((param) => (
                    <div key={param.name} className="flex items-start gap-2 text-sm">
                      <code className="font-mono text-primary">{param.name}</code>
                      <Badge variant="outline" className="text-xs">{param.type}</Badge>
                      {param.required && <Badge variant="secondary" className="text-xs">required</Badge>}
                      <span className="text-muted-foreground">{param.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {endpoint.requestBody && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Request Body</h4>
                <CodeBlock code={JSON.stringify(endpoint.requestBody, null, 2)} />
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-semibold mb-2">Response</h4>
              <CodeBlock code={JSON.stringify(endpoint.responseBody, null, 2)} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

const endpoints: Record<string, EndpointProps[]> = {
  payments: [
    {
      method: 'POST',
      path: '/payments',
      description: 'Create a hosted payment page and redirect users to complete payment (Recommended)',
      notes: 'When success_url or failure_url is provided, the API returns a hosted_payment_url. Without these, the API creates a direct OxaPay payment and returns the blockchain address.',
      requestBody: {
        amount: 100,
        currency: 'USD',
        pay_currency: 'USDT',
        order_id: 'order_123',
        description: 'Payment for Order #123',
        callback_url: 'https://yoursite.com/webhook',
        success_url: 'https://yoursite.com/payment/success',
        failure_url: 'https://yoursite.com/payment/failed'
      },
      responseBody: {
        success: true,
        data: {
          payment_id: 'uuid',
          deposit_intent_id: 'uuid',
          hosted_payment_url: 'https://gateway.com/deposit/uuid',
          hosted_deposit_page_url: 'https://gateway.com/deposit/uuid',
          coin: 'USDT',
          expected_amount: 100,
          expires_at: '2024-01-08T12:00:00Z',
          merchant_name: 'Your Store'
        }
      }
    },
    {
      method: 'POST',
      path: '/payments (Direct Mode)',
      description: 'Create payment and get blockchain address directly — do NOT pass success_url or failure_url',
      notes: 'Direct mode is triggered by omitting success_url and failure_url. The API calls OxaPay immediately and returns the wallet address, QR code, and payment details for your custom UI.',
      requestBody: {
        amount: 100,
        currency: 'USD',
        pay_currency: 'USDT',
        network: 'TRC20',
        order_id: 'order_123',
        description: 'Payment for Order #123',
        callback_url: 'https://yoursite.com/webhook'
      },
      responseBody: {
        success: true,
        data: {
          payment_id: 'uuid',
          transaction_id: 'uuid',
          track_id: 'oxapay_track_id',
          address: 'TRC20_wallet_address',
          amount: 100.5,
          currency: 'USDT',
          network: 'TRC20',
          qr_code: 'base64_qr_image',
          rate: 0.995,
          expires_at: '2024-01-08T12:00:00Z',
          hosted_payment_url: 'https://gateway.com/deposit/uuid'
        }
      }
    },
    {
      method: 'GET',
      path: '/payments/{payment_id}',
      description: 'Get the status and details of a specific payment',
      responseBody: {
        success: true,
        data: {
          payment_id: 'uuid',
          status: 'CONFIRMED',
          coin: 'USDT',
          expected_amount: 100,
          deposit_address: 'TRC20_wallet_address',
          expires_at: '2024-01-08T12:00:00Z',
          created_at: '2024-01-08T11:00:00Z',
          transaction: {
            id: 'uuid',
            crypto_amount: 100.5,
            usd_value: 100,
            exchange_rate: 0.995,
            tx_hash: 'blockchain_hash',
            confirmed_at: '2024-01-08T11:30:00Z'
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/payments',
      description: 'List all payments with pagination',
      queryParams: [
        { name: 'limit', type: 'number', description: 'Number of results (default: 20, max: 100)' },
        { name: 'offset', type: 'number', description: 'Pagination offset' },
        { name: 'status', type: 'string', description: 'Filter by status: PENDING, CONFIRMED, FAILED, EXPIRED' }
      ],
      responseBody: {
        success: true,
        data: {
          payments: [
            {
              payment_id: 'uuid',
              status: 'CONFIRMED',
              coin: 'USDT',
              expected_amount: 100,
              deposit_address: 'TRC20_wallet_address',
              expires_at: '2024-01-08T12:00:00Z',
              created_at: '2024-01-08T11:00:00Z'
            }
          ],
          pagination: { total: 50, limit: 20, offset: 0 }
        }
      }
    }
  ],
  transactions: [
    {
      method: 'GET',
      path: '/transactions',
      description: 'List all transactions with filtering options',
      queryParams: [
        { name: 'limit', type: 'number', description: 'Number of results (default: 20)' },
        { name: 'offset', type: 'number', description: 'Pagination offset' },
        { name: 'status', type: 'string', description: 'Filter by status: PENDING, CONFIRMED, FAILED, EXPIRED, SETTLED' },
        { name: 'coin', type: 'string', description: 'Filter by coin (only USDT is currently supported)' }
      ],
      responseBody: {
        success: true,
        data: {
          transactions: [
            {
              id: 'uuid',
              coin: 'USDT',
              crypto_amount: 100.5,
              usd_value: 100,
              exchange_rate: 0.995,
              status: 'CONFIRMED',
              tx_hash: 'blockchain_hash',
              user_reference: 'order_123',
              created_at: '2024-01-08T11:00:00Z',
              confirmed_at: '2024-01-08T11:30:00Z'
            }
          ],
          pagination: { total: 150, limit: 20, offset: 0 }
        }
      }
    },
    {
      method: 'GET',
      path: '/transactions/{transaction_id}',
      description: 'Get details of a specific transaction',
      responseBody: {
        success: true,
        data: {
          id: 'uuid',
          coin: 'USDT',
          crypto_amount: 100.5,
          usd_value: 100,
          exchange_rate: 0.995,
          status: 'CONFIRMED',
          tx_hash: 'blockchain_hash',
          user_reference: 'order_123',
          created_at: '2024-01-08T11:00:00Z',
          confirmed_at: '2024-01-08T11:30:00Z'
        }
      }
    }
  ],
  balance: [
    {
      method: 'GET',
      path: '/balance',
      description: 'Get current balance calculated from ledger entries',
      notes: 'Balance is calculated from all CREDIT and DEBIT ledger entries. Only USDT is supported for new deposits, but historical entries for other coins may appear.',
      responseBody: {
        success: true,
        data: {
          balances: [
            {
              coin: 'USDT',
              amount: 1500.50,
              usd_value_at_deposit: 1500.50,
              current_usd_value: 1500.50
            }
          ],
          total_usd_value: 1500.50
        }
      }
    }
  ],
  info: [
    {
      method: 'GET',
      path: '/info',
      description: 'Get merchant account information',
      responseBody: {
        success: true,
        data: {
          merchant_id: 'uuid',
          name: 'Acme Corp',
          fee_percentage: 1.5,
          is_enabled: true
        }
      }
    }
  ]
};

export default function ApiDocs() {
  return (
    <DashboardLayout role="admin" title="API Documentation">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Book className="h-6 w-6 text-primary" />
            Merchant API Documentation
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete reference for integrating with the CryptoGate payment gateway
          </p>
        </div>

        {/* Base URL */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              <span className="font-semibold">Base URL</span>
            </div>
            <CodeBlock code={BASE_URL} language="bash" />
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Authentication
            </CardTitle>
            <CardDescription>
              All API requests require authentication using your merchant API key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Include your API key in the request headers using one of these methods:
            </p>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold mb-2">Option 1: Authorization Header (Recommended)</h4>
                <CodeBlock code={`Authorization: Bearer pk_xxxxxxxx_your_secret_key`} language="bash" />
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Option 2: X-API-Key Header</h4>
                <CodeBlock code={`X-API-Key: pk_xxxxxxxx_your_secret_key`} language="bash" />
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="text-sm font-semibold">API Key Format</h4>
              <p className="text-sm text-muted-foreground">
                API keys follow the format: <code className="text-primary">pk_&lt;8-char-prefix&gt;_&lt;64-char-secret&gt;</code>
              </p>
              <p className="text-sm text-muted-foreground">
                The key is hashed with SHA-256 before storage. You can only see the full key once during generation.
              </p>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Example Request (cURL)</h4>
              <CodeBlock 
                code={`curl -X POST ${BASE_URL}/payments \\
  -H "Authorization: Bearer pk_abc12345_your_secret_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100,
    "currency": "USD",
    "pay_currency": "USDT",
    "order_id": "order_123",
    "success_url": "https://yoursite.com/success",
    "failure_url": "https://yoursite.com/failed"
  }'`} 
                language="bash" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Supported Currencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Supported Cryptocurrency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border max-w-xs">
              <Badge variant="outline" className="font-mono bg-[#26A17B]/20 text-[#26A17B] border-[#26A17B]/30">USDT</Badge>
              <div>
                <p className="text-sm font-medium">Tether</p>
                <p className="text-xs text-muted-foreground">TRC-20 Network</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Currently, only USDT on the TRC-20 network is supported for payments. All amounts are in USD.
            </p>
          </CardContent>
        </Card>

        {/* Integration Flows */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-primary" />
              Integration Flows
            </CardTitle>
            <CardDescription>
              Choose between Hosted Payment Page (recommended) or Direct API integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hosted Flow */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="secondary">Recommended</Badge>
                Hosted Payment Page
              </h4>
              <p className="text-sm text-muted-foreground">
                Pass <code className="text-primary">success_url</code> and <code className="text-primary">failure_url</code> to get a hosted payment page URL. The user is redirected to our branded page to complete payment.
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>User clicks "Pay" on your site</li>
                <li>Your backend calls <code className="text-primary">POST /payments</code> with <code className="text-primary">success_url</code> and <code className="text-primary">failure_url</code></li>
                <li>Redirect user to <code className="text-primary">hosted_payment_url</code> from the response</li>
                <li>User completes payment on our hosted page (QR code + countdown timer)</li>
                <li>User is redirected to your <code className="text-primary">success_url</code> or <code className="text-primary">failure_url</code></li>
                <li>You receive a webhook notification at your configured <code className="text-primary">callback_url</code></li>
              </ol>
            </div>

            {/* Direct Flow */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-semibold">Direct API (Custom UI)</h4>
              <p className="text-sm text-muted-foreground">
                Omit <code className="text-primary">success_url</code> and <code className="text-primary">failure_url</code> to receive the blockchain wallet address, QR code, and payment details directly. Build your own payment UI.
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Your backend calls <code className="text-primary">POST /payments</code> without redirect URLs</li>
                <li>You receive <code className="text-primary">address</code>, <code className="text-primary">qr_code</code>, and <code className="text-primary">amount</code> in the response</li>
                <li>Display QR code and address in your own UI</li>
                <li>Poll <code className="text-primary">GET /payments/&#123;payment_id&#125;</code> or wait for webhook</li>
              </ol>
            </div>

            {/* Hosted Example */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Hosted Flow Example (JavaScript)</h4>
              <CodeBlock 
                code={`// Example: Create payment and redirect to hosted page
const response = await fetch('${BASE_URL}/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pk_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 100,
    currency: 'USD',
    pay_currency: 'USDT',
    order_id: 'order_123',
    success_url: 'https://yoursite.com/payment/success?order=123',
    failure_url: 'https://yoursite.com/payment/failed?order=123'
  })
});

const { data } = await response.json();
// Redirect user to hosted payment page
window.location.href = data.hosted_payment_url;`} 
                language="javascript" 
              />
            </div>

            {/* Direct Example */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Direct Flow Example (JavaScript)</h4>
              <CodeBlock 
                code={`// Example: Direct API — get wallet address for custom UI
const response = await fetch('${BASE_URL}/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pk_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 50,
    currency: 'USD',
    pay_currency: 'USDT',
    order_id: 'order_456',
    callback_url: 'https://yoursite.com/api/webhook'
  })
});

const { data } = await response.json();
// Use data.address, data.qr_code, data.amount in your UI
console.log('Send', data.amount, 'USDT to', data.address);`} 
                language="javascript" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <List className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="balance" className="gap-2">
              <Wallet className="h-4 w-4" />
              Balance
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Info className="h-4 w-4" />
              Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Endpoints</h3>
            {endpoints.payments.map((ep, i) => (
              <EndpointCard key={i} endpoint={ep} />
            ))}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <h3 className="text-lg font-semibold">Transaction Endpoints</h3>
            {endpoints.transactions.map((ep, i) => (
              <EndpointCard key={i} endpoint={ep} />
            ))}
          </TabsContent>

          <TabsContent value="balance" className="space-y-4">
            <h3 className="text-lg font-semibold">Balance Endpoints</h3>
            {endpoints.balance.map((ep, i) => (
              <EndpointCard key={i} endpoint={ep} />
            ))}
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <h3 className="text-lg font-semibold">Info Endpoints</h3>
            {endpoints.info.map((ep, i) => (
              <EndpointCard key={i} endpoint={ep} />
            ))}
          </TabsContent>
        </Tabs>

        {/* Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Notifications</CardTitle>
            <CardDescription>
              Receive real-time updates when payment status changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              When a payment status changes, we'll send a POST request to your configured webhook URL (set via <code className="text-primary">callback_url</code> in the payment request or your merchant webhook URL) with the following payload:
            </p>
            <CodeBlock code={JSON.stringify({
              event: 'payment.confirmed',
              payment_id: 'uuid',
              transaction_id: 'uuid',
              status: 'CONFIRMED',
              coin: 'USDT',
              crypto_amount: 100.5,
              usd_value: 100,
              tx_hash: 'blockchain_transaction_hash',
              confirmed_at: '2024-01-08T11:30:00Z'
            }, null, 2)} />
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Webhook Events</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><code className="text-primary">payment.pending</code> - Payment address generated, waiting for deposit</li>
                <li><code className="text-primary">payment.confirmed</code> - Payment confirmed on blockchain</li>
                <li><code className="text-primary">payment.failed</code> - Payment failed or underpaid</li>
                <li><code className="text-primary">payment.expired</code> - Payment address expired</li>
              </ul>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Webhook Retry Policy</h4>
              <p className="text-sm text-muted-foreground">
                Failed webhook deliveries are retried automatically. You can monitor delivery attempts and response status in the admin Webhook Logs page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Request Body Fields Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Request Fields Reference</CardTitle>
            <CardDescription>
              Complete list of fields for <code>POST /payments</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-3 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">amount</code>
                <Badge variant="outline" className="text-xs">number</Badge>
                <Badge variant="secondary" className="text-xs">required</Badge>
                <span className="text-muted-foreground">Payment amount in the specified currency</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">currency</code>
                <Badge variant="outline" className="text-xs">string</Badge>
                <span className="text-muted-foreground">Fiat currency code (default: "USD")</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">pay_currency</code>
                <Badge variant="outline" className="text-xs">string</Badge>
                <span className="text-muted-foreground">Cryptocurrency to pay with (default: "USDT", only USDT supported)</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">network</code>
                <Badge variant="outline" className="text-xs">string</Badge>
                <span className="text-muted-foreground">Blockchain network (default: "TRC20")</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">order_id</code>
                <Badge variant="outline" className="text-xs">string</Badge>
                <span className="text-muted-foreground">Your internal order or reference ID</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">description</code>
                <Badge variant="outline" className="text-xs">string</Badge>
                <span className="text-muted-foreground">Human-readable description for the payment</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">callback_url</code>
                <Badge variant="outline" className="text-xs">string</Badge>
                <span className="text-muted-foreground">URL for webhook notifications on payment status changes</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">success_url</code>
                <Badge variant="outline" className="text-xs">string</Badge>
                <span className="text-muted-foreground">Redirect URL after successful payment (enables hosted page flow)</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="font-mono text-primary min-w-[120px]">failure_url</code>
                <Badge variant="outline" className="text-xs">string</Badge>
                <span className="text-muted-foreground">Redirect URL after failed/expired payment (enables hosted page flow)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Handling */}
        <Card>
          <CardHeader>
            <CardTitle>Error Handling</CardTitle>
            <CardDescription>
              All errors follow a consistent format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock code={JSON.stringify({
              error: 'Description of the error'
            }, null, 2)} />
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">HTTP Status Codes</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><code className="text-green-500">200</code> - Success</li>
                <li><code className="text-green-500">201</code> - Payment created successfully</li>
                <li><code className="text-yellow-500">400</code> - Bad request / validation error (e.g., missing amount, unsupported coin)</li>
                <li><code className="text-yellow-500">401</code> - Unauthorized / invalid or missing API key</li>
                <li><code className="text-yellow-500">404</code> - Resource not found / unknown endpoint</li>
                <li><code className="text-yellow-500">405</code> - Method not allowed</li>
                <li><code className="text-red-500">500</code> - Internal server error / payment processor failure</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Rate Limits & Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
              <li>Always verify payment status via <code className="text-primary">GET /payments/&#123;payment_id&#125;</code> before fulfilling orders — do not rely solely on redirect URLs.</li>
              <li>Use <code className="text-primary">callback_url</code> webhooks for server-to-server confirmation of payment status.</li>
              <li>Store the <code className="text-primary">payment_id</code> returned from <code className="text-primary">POST /payments</code> to track and query payment status.</li>
              <li>Payments expire after 1 hour. Create a new payment if the previous one expires.</li>
              <li>Keep your API key secret. Never expose it in frontend code — always call the API from your backend.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
