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
  ExternalLink
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
      description: 'Create a new payment request and get a blockchain deposit address',
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
          expires_at: '2024-01-08T12:00:00Z'
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
        { name: 'status', type: 'string', description: 'Filter by status' },
        { name: 'coin', type: 'string', description: 'Filter by coin: BTC, ETH, USDT, etc.' }
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
      description: 'Get current balance for all coins',
      responseBody: {
        success: true,
        data: {
          balances: [
            {
              coin: 'USDT',
              amount: 1500.50,
              usd_value_at_deposit: 1500.50,
              current_usd_value: 1500.50
            },
            {
              coin: 'BTC',
              amount: 0.025,
              usd_value_at_deposit: 1000,
              current_usd_value: 1075
            }
          ],
          total_usd_value: 2575.50
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
            Complete reference for integrating with the payment gateway
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
    "order_id": "order_123"
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
              Supported Cryptocurrencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { coin: 'BTC', name: 'Bitcoin', network: 'Bitcoin' },
                { coin: 'ETH', name: 'Ethereum', network: 'ERC20' },
                { coin: 'USDT', name: 'Tether', network: 'TRC20 / ERC20' },
                { coin: 'USDC', name: 'USD Coin', network: 'ERC20' },
                { coin: 'LTC', name: 'Litecoin', network: 'Litecoin' },
                { coin: 'TRX', name: 'Tron', network: 'TRC20' },
              ].map((c) => (
                <div key={c.coin} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                  <Badge variant="outline" className="font-mono">{c.coin}</Badge>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.network}</p>
                  </div>
                </div>
              ))}
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
              When a payment status changes, we'll send a POST request to your configured webhook URL with the following payload:
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
              error: 'Invalid API key'
            }, null, 2)} />
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">HTTP Status Codes</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><code className="text-green-500">200</code> - Success</li>
                <li><code className="text-green-500">201</code> - Resource created</li>
                <li><code className="text-yellow-500">400</code> - Bad request / validation error</li>
                <li><code className="text-yellow-500">401</code> - Unauthorized / invalid API key</li>
                <li><code className="text-yellow-500">404</code> - Resource not found</li>
                <li><code className="text-red-500">500</code> - Internal server error</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
