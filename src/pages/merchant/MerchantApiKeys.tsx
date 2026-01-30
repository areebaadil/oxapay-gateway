import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { 
  Key, 
  Loader2,
  Shield,
  FileText,
  Download,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/merchant-api`;

export default function MerchantApiKeys() {
  const { merchantId } = useAuth();
  const { data: apiKeys, isLoading } = useApiKeys(merchantId || undefined);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const generatePdfContent = () => {
    // Create downloadable HTML content that can be saved/printed as PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CryptoGate API Documentation</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
    h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #3b82f6; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; }
    .endpoint { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    .method-post { background: #dcfce7; color: #166534; }
    .method-get { background: #dbeafe; color: #1d4ed8; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background: #f8fafc; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🔐 CryptoGate Payment Gateway API</h1>
  <p><strong>Version:</strong> 1.0 | <strong>Base URL:</strong> <code>${BASE_URL}</code></p>
  
  <h2>🔑 Authentication</h2>
  <p>All API requests require authentication using your merchant API key. Include your key in the request headers:</p>
  <pre>Authorization: Bearer pk_xxxxxxxx_your_secret_key</pre>
  <p>Or alternatively:</p>
  <pre>X-API-Key: pk_xxxxxxxx_your_secret_key</pre>
  
  <div class="warning">
    <strong>⚠️ Security Notice:</strong> Keep your API key secure. Never expose it in client-side code. Make API calls only from your server.
  </div>

  <h2>💰 Supported Currency</h2>
  <p>The system currently supports <strong>USDT (TRC-20)</strong> for all payments and settlements.</p>

  <h2>📡 API Endpoints</h2>
  
  <h3>Create Payment</h3>
  <div class="endpoint">
    <span class="method method-post">POST</span> <code>/payments</code>
    <p>Create a new payment request and receive a blockchain deposit address.</p>
    <p><strong>Request Body:</strong></p>
    <pre>{
  "amount": 100,
  "currency": "USD",
  "pay_currency": "USDT",
  "network": "TRC20",
  "order_id": "order_123",
  "description": "Payment for Order #123",
  "callback_url": "https://yoursite.com/webhook"
}</pre>
    <p><strong>Response:</strong></p>
    <pre>{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "transaction_id": "uuid",
    "address": "TRC20_wallet_address",
    "amount": 100.5,
    "currency": "USDT",
    "qr_code": "base64_qr_image",
    "expires_at": "2024-01-08T12:00:00Z"
  }
}</pre>
  </div>

  <h3>Get Payment Status</h3>
  <div class="endpoint">
    <span class="method method-get">GET</span> <code>/payments/{payment_id}</code>
    <p>Retrieve the current status and details of a specific payment.</p>
    <p><strong>Response:</strong></p>
    <pre>{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "status": "CONFIRMED",
    "coin": "USDT",
    "expected_amount": 100,
    "transaction": {
      "crypto_amount": 100.5,
      "usd_value": 100,
      "tx_hash": "blockchain_hash",
      "confirmed_at": "2024-01-08T11:30:00Z"
    }
  }
}</pre>
  </div>

  <h3>List Transactions</h3>
  <div class="endpoint">
    <span class="method method-get">GET</span> <code>/transactions</code>
    <p>List all transactions with optional filtering.</p>
    <table>
      <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
      <tr><td>limit</td><td>number</td><td>Results per page (default: 20, max: 100)</td></tr>
      <tr><td>offset</td><td>number</td><td>Pagination offset</td></tr>
      <tr><td>status</td><td>string</td><td>Filter: PENDING, CONFIRMED, FAILED, EXPIRED</td></tr>
    </table>
  </div>

  <h3>Get Balance</h3>
  <div class="endpoint">
    <span class="method method-get">GET</span> <code>/balance</code>
    <p>Get your current USDT balance available for settlement.</p>
  </div>

  <h2>🔔 Webhooks</h2>
  <p>Configure a webhook URL to receive real-time payment notifications:</p>
  <pre>{
  "event": "payment.confirmed",
  "payment_id": "uuid",
  "transaction_id": "uuid",
  "status": "CONFIRMED",
  "coin": "USDT",
  "crypto_amount": 100.5,
  "usd_value": 100,
  "tx_hash": "blockchain_hash",
  "confirmed_at": "2024-01-08T11:30:00Z"
}</pre>

  <h3>Webhook Events</h3>
  <table>
    <tr><th>Event</th><th>Description</th></tr>
    <tr><td><code>payment.pending</code></td><td>Payment address generated, awaiting deposit</td></tr>
    <tr><td><code>payment.confirmed</code></td><td>Payment confirmed on blockchain</td></tr>
    <tr><td><code>payment.failed</code></td><td>Payment failed or underpaid</td></tr>
    <tr><td><code>payment.expired</code></td><td>Payment address expired</td></tr>
  </table>

  <h2>❌ Error Handling</h2>
  <p>All errors return a consistent format:</p>
  <pre>{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid"
  }
}</pre>

  <h3>Error Codes</h3>
  <table>
    <tr><th>Code</th><th>HTTP Status</th><th>Description</th></tr>
    <tr><td>INVALID_API_KEY</td><td>401</td><td>Invalid or missing API key</td></tr>
    <tr><td>MERCHANT_DISABLED</td><td>403</td><td>Merchant account is suspended</td></tr>
    <tr><td>NOT_FOUND</td><td>404</td><td>Resource not found</td></tr>
    <tr><td>VALIDATION_ERROR</td><td>400</td><td>Invalid request parameters</td></tr>
    <tr><td>RATE_LIMITED</td><td>429</td><td>Too many requests</td></tr>
  </table>

  <div class="footer">
    <p>📧 For support, contact your administrator</p>
    <p>Generated by CryptoGate Payment Gateway</p>
  </div>
</body>
</html>`;
    return htmlContent;
  };

  const handleDownloadPdf = () => {
    const content = generatePdfContent();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'CryptoGate-API-Documentation.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeKeys = apiKeys?.filter(k => k.is_active) || [];

  if (isLoading) {
    return (
      <DashboardLayout role="merchant" title="API Keys">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="merchant" title="API Keys">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">API Integration</h1>
            <p className="text-muted-foreground">
              Your API key and integration documentation
            </p>
          </div>
          
          <Button onClick={handleDownloadPdf} className="gap-2">
            <Download className="h-4 w-4" />
            Download API Docs
          </Button>
        </div>

        {/* Security Notice */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-4 p-4">
            <Shield className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="font-medium">API Key Security</p>
              <p className="text-sm text-muted-foreground">
                Keep your API key secure and never expose it in client-side code. 
                Use environment variables and make API calls from your server only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active API Key */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Your API Key
            </CardTitle>
            <CardDescription>
              Contact your administrator if you need a new API key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeKeys.length > 0 ? (
              activeKeys.map((apiKey, index) => (
                <div 
                  key={apiKey.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 animate-fade-in"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">
                          {apiKey.key_prefix}••••••••••••
                        </span>
                        <Badge variant="outline" className="text-status-confirmed border-status-confirmed/30">
                          Active
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}
                        {apiKey.last_used_at && (
                          <> · Last used {formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleCopy(apiKey.key_prefix, apiKey.id)}
                    className="gap-2"
                  >
                    {copied === apiKey.id ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Prefix
                      </>
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No API key assigned</p>
                <p className="text-sm">Contact your administrator to generate an API key for your account.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Reference */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Quick Reference
            </CardTitle>
            <CardDescription>
              Essential information for API integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Base URL */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Base URL</span>
              </div>
              <div className="relative">
                <pre className="bg-muted/50 border rounded-lg p-3 overflow-x-auto text-sm font-mono">
                  {BASE_URL}
                </pre>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => handleCopy(BASE_URL, 'url')}
                >
                  {copied === 'url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Authentication Header</span>
              </div>
              <pre className="bg-muted/50 border rounded-lg p-3 overflow-x-auto text-sm font-mono">
                Authorization: Bearer pk_xxxxxxxx_your_secret_key
              </pre>
            </div>

            {/* Quick Endpoints */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Key Endpoints</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 font-mono">POST</Badge>
                  <code className="text-muted-foreground">/payments</code>
                  <span className="text-muted-foreground">- Create payment</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-mono">GET</Badge>
                  <code className="text-muted-foreground">/payments/{'{id}'}</code>
                  <span className="text-muted-foreground">- Get payment status</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-mono">GET</Badge>
                  <code className="text-muted-foreground">/balance</code>
                  <span className="text-muted-foreground">- Check balance</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download Section */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Full API Documentation</p>
                <p className="text-sm text-muted-foreground">
                  Download the complete API reference guide
                </p>
              </div>
            </div>
            <Button onClick={handleDownloadPdf} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              Download Documentation
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
