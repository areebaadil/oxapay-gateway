import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useApiKeys, useGenerateApiKey, useRevokeApiKey } from '@/hooks/useApiKeys';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  Loader2,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MerchantApiKeys() {
  const { merchantId } = useAuth();
  const { data: apiKeys, isLoading } = useApiKeys(merchantId || undefined);
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();
  
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!merchantId) return;
    
    generateApiKey.mutate(merchantId, {
      onSuccess: (data) => {
        if (data.apiKey) {
          setNewApiKey(data.apiKey);
        }
      }
    });
  };

  const handleCopy = async (text: string, id?: string) => {
    await navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleRevoke = (id: string) => {
    revokeApiKey.mutate(id);
  };

  const activeKeys = apiKeys?.filter(k => k.is_active) || [];
  const revokedKeys = apiKeys?.filter(k => !k.is_active) || [];

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
            <h1 className="text-2xl font-bold">API Keys</h1>
            <p className="text-muted-foreground">
              Manage your API keys for integration
            </p>
          </div>
          
          <Button onClick={handleGenerate} disabled={generateApiKey.isPending} className="gap-2">
            {generateApiKey.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate New Key
          </Button>
        </div>

        {/* New API Key Dialog */}
        <Dialog open={!!newApiKey} onOpenChange={() => setNewApiKey(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                New API Key Generated
              </DialogTitle>
              <DialogDescription>
                Copy your API key now. You won't be able to see it again!
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="font-mono text-sm break-all select-all">
                  {newApiKey}
                </p>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-status-pending/10 border border-status-pending/30">
                <AlertTriangle className="h-5 w-5 text-status-pending shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-status-pending">Important</p>
                  <p className="text-muted-foreground">
                    Store this key securely. It will only be shown once and cannot be retrieved later.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewApiKey(null)}>
                Close
              </Button>
              <Button onClick={() => handleCopy(newApiKey!, 'new')} className="gap-2">
                {copiedId === 'new' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Key
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Security Notice */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-4 p-4">
            <Shield className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="font-medium">API Key Security</p>
              <p className="text-sm text-muted-foreground">
                Keep your API keys secure and never expose them in client-side code. 
                Use environment variables and make API calls from your server.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Keys */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Active Keys
            </CardTitle>
            <CardDescription>
              Keys currently active for API access
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
                          {apiKey.key_prefix}••••••••
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
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will immediately disable the API key. Any integrations using this key will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleRevoke(apiKey.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No active API keys</p>
                <p className="text-sm">Generate a key to start integrating</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revoked Keys */}
        {revokedKeys.length > 0 && (
          <Card className="border-border/50 opacity-60">
            <CardHeader>
              <CardTitle className="text-lg">Revoked Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {revokedKeys.map((apiKey, index) => (
                <div 
                  key={apiKey.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-muted/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Key className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">
                          {apiKey.key_prefix}••••••••
                        </span>
                        <Badge variant="outline" className="text-muted-foreground">
                          Revoked
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
