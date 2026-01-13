import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMerchants, useUpdateMerchant } from '@/hooks/useMerchants';
import { useTransactions } from '@/hooks/useTransactions';
import { useApiKeys, useGenerateApiKey, useRevokeApiKey } from '@/hooks/useApiKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Building2, 
  Mail, 
  Globe, 
  Percent,
  ExternalLink,
  Edit,
  Pause,
  Play,
  Loader2,
  Key,
  Copy,
  Check,
  RefreshCw,
  Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function Merchants() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; merchant: typeof merchants extends (infer T)[] ? T : never } | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    webhook_url: '',
    deposit_fee_percentage: '1.5',
    withdrawal_fee_percentage: '1.5',
  });
  const [apiKeyDialog, setApiKeyDialog] = useState<{ open: boolean; merchantId: string; merchantName: string } | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    webhook_url: '',
    deposit_fee_percentage: '1.5',
    withdrawal_fee_percentage: '1.5',
  });

  const { data: merchants, isLoading } = useMerchants();
  const { data: transactions } = useTransactions();
  const { data: allApiKeys } = useApiKeys();
  const updateMerchant = useUpdateMerchant();
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const getApiKeyForMerchant = (merchantId: string) => {
    return (allApiKeys || []).find(k => k.merchant_id === merchantId && k.is_active);
  };

  const filteredMerchants = (merchants || []).filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMerchantStats = (merchantId: string) => {
    const txs = (transactions || []).filter(tx => tx.merchant_id === merchantId);
    const confirmed = txs.filter(tx => tx.status === 'CONFIRMED' || tx.status === 'SETTLED');
    return {
      totalTx: txs.length,
      volume: confirmed.reduce((sum, tx) => sum + Number(tx.usd_value), 0),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-merchant-with-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            webhook_url: formData.webhook_url || null,
            deposit_fee_percentage: parseFloat(formData.deposit_fee_percentage),
            withdrawal_fee_percentage: parseFloat(formData.withdrawal_fee_percentage),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create merchant');
      }

      toast({
        title: 'Merchant created',
        description: `Login: ${formData.email} / ${formData.password}`,
      });
      
      setIsCreateOpen(false);
      setFormData({ name: '', email: '', password: '', webhook_url: '', deposit_fee_percentage: '1.5', withdrawal_fee_percentage: '1.5' });
      // Refresh merchants list
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create merchant',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    updateMerchant.mutate({ id, is_enabled: !currentStatus });
  };

  const handleOpenEdit = (merchant: NonNullable<typeof merchants>[number]) => {
    setEditFormData({
      name: merchant.name,
      email: merchant.email,
      webhook_url: merchant.webhook_url || '',
      deposit_fee_percentage: String(merchant.deposit_fee_percentage),
      withdrawal_fee_percentage: String(merchant.withdrawal_fee_percentage),
    });
    setEditDialog({ open: true, merchant });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog?.merchant) return;
    
    updateMerchant.mutate({
      id: editDialog.merchant.id,
      name: editFormData.name,
      email: editFormData.email,
      webhook_url: editFormData.webhook_url || null,
      deposit_fee_percentage: parseFloat(editFormData.deposit_fee_percentage),
      withdrawal_fee_percentage: parseFloat(editFormData.withdrawal_fee_percentage),
    }, {
      onSuccess: () => {
        setEditDialog(null);
        toast({ title: 'Merchant updated', description: 'Details saved successfully.' });
      }
    });
  };

  const handleGenerateKey = async (merchantId: string) => {
    const result = await generateApiKey.mutateAsync(merchantId);
    setGeneratedKey(result.api_key);
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!', description: 'API key copied to clipboard.' });
    }
  };

  const handleCloseApiKeyDialog = () => {
    setApiKeyDialog(null);
    setGeneratedKey(null);
    setCopied(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="admin" title="Merchants">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Merchants">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Merchant Management</h1>
            <p className="text-muted-foreground">
              Create and manage merchant accounts
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="glow-primary">
                <Plus className="mr-2 h-4 w-4" />
                Create Merchant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Merchant</DialogTitle>
                <DialogDescription>
                  Add a new merchant to the platform. They will receive API credentials via email.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Acme Corp" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@acme.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Initial Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Merchant will use this to login. Min 6 characters.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook">Webhook URL (optional)</Label>
                  <Input 
                    id="webhook" 
                    placeholder="https://acme.com/webhooks"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Receives notifications for transactions, settlements, etc.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-fee">Deposit Fee %</Label>
                    <Input 
                      id="deposit-fee" 
                      type="number" 
                      step="0.1" 
                      placeholder="1.5"
                      value={formData.deposit_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, deposit_fee_percentage: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdrawal-fee">Withdrawal Fee %</Label>
                    <Input 
                      id="withdrawal-fee" 
                      type="number" 
                      step="0.1" 
                      placeholder="1.5"
                      value={formData.withdrawal_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, withdrawal_fee_percentage: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Merchant'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search merchants..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Merchants Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMerchants.map((merchant, index) => {
            const stats = getMerchantStats(merchant.id);
            const apiKey = getApiKeyForMerchant(merchant.id);
            
            return (
              <Card 
                key={merchant.id} 
                className={cn(
                  "border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg animate-fade-in",
                  !merchant.is_enabled && "opacity-60"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {merchant.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">
                        {merchant.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(merchant)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/transactions')}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Transactions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setApiKeyDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name })}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Manage API Key
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleStatus(merchant.id, merchant.is_enabled)}>
                        {merchant.is_enabled ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={merchant.is_enabled ? "default" : "secondary"}
                      className={cn(
                        merchant.is_enabled 
                          ? "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/30" 
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {merchant.is_enabled ? 'Active' : 'Suspended'}
                    </Badge>
                    {apiKey && (
                      <Badge variant="outline" className="gap-1">
                        <Key className="h-3 w-3" />
                        {apiKey.key_prefix}...
                      </Badge>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{merchant.email}</span>
                    </div>
                    {merchant.webhook_url && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span className="truncate text-xs">{merchant.webhook_url}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Percent className="h-4 w-4" />
                      <span>Deposit: {merchant.deposit_fee_percentage}% | Withdrawal: {merchant.withdrawal_fee_percentage}%</span>
                    </div>
                  </div>
                  
                  {/* API Key Section */}
                  <div className="pt-3 border-t border-border/50">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={() => setApiKeyDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name })}
                    >
                      <Key className="h-4 w-4" />
                      {apiKey ? 'Manage API Key' : 'Generate API Key'}
                    </Button>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <p className="text-lg font-semibold">{stats.totalTx}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="text-lg font-semibold font-mono">
                        ${stats.volume.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* API Key Management Dialog */}
        <Dialog open={apiKeyDialog?.open || false} onOpenChange={(open) => !open && handleCloseApiKeyDialog()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                API Key Management
              </DialogTitle>
              <DialogDescription>
                Manage API credentials for <span className="font-semibold">{apiKeyDialog?.merchantName}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {(() => {
                const currentKey = apiKeyDialog ? getApiKeyForMerchant(apiKeyDialog.merchantId) : null;
                
                return (
                  <>
                    {/* Current Key Info */}
                    {currentKey && !generatedKey && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Current API Key</span>
                          <Badge variant="outline" className="text-xs">Active</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border">
                            {currentKey.key_prefix}••••••••••••••••
                          </code>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {new Date(currentKey.created_at).toLocaleDateString()}
                          {currentKey.last_used_at && (
                            <> • Last used {new Date(currentKey.last_used_at).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Generated Key Display */}
                    {generatedKey && (
                      <div className="p-4 rounded-lg bg-status-confirmed/10 border border-status-confirmed/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="h-4 w-4 text-status-confirmed" />
                          <span className="text-sm font-medium text-status-confirmed">New API Key Generated</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-background px-3 py-2 rounded border break-all">
                            {generatedKey}
                          </code>
                          <Button size="icon" variant="outline" onClick={handleCopyKey}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-status-confirmed mt-2 font-medium">
                          ⚠️ Copy this key now! It will not be shown again.
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {!generatedKey && (
                      <div className="space-y-3">
                        <Button 
                          className="w-full gap-2"
                          onClick={() => apiKeyDialog && handleGenerateKey(apiKeyDialog.merchantId)}
                          disabled={generateApiKey.isPending}
                        >
                          {generateApiKey.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          {currentKey ? 'Regenerate API Key' : 'Generate API Key'}
                        </Button>
                        
                        {currentKey && (
                          <p className="text-xs text-muted-foreground text-center">
                            Generating a new key will invalidate the current one.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleCloseApiKeyDialog}>
                {generatedKey ? 'Done' : 'Close'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Merchant Dialog */}
        <Dialog open={editDialog?.open || false} onOpenChange={(open) => !open && setEditDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Merchant Details</DialogTitle>
              <DialogDescription>
                Update information for {editDialog?.merchant?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Business Name</Label>
                <Input 
                  id="edit-name" 
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-webhook">Webhook URL (optional)</Label>
                <Input 
                  id="edit-webhook" 
                  placeholder="https://example.com/webhooks"
                  value={editFormData.webhook_url}
                  onChange={(e) => setEditFormData({ ...editFormData, webhook_url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-deposit-fee">Deposit Fee %</Label>
                  <Input 
                    id="edit-deposit-fee" 
                    type="number" 
                    step="0.1" 
                    value={editFormData.deposit_fee_percentage}
                    onChange={(e) => setEditFormData({ ...editFormData, deposit_fee_percentage: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-withdrawal-fee">Withdrawal Fee %</Label>
                  <Input 
                    id="edit-withdrawal-fee" 
                    type="number" 
                    step="0.1" 
                    value={editFormData.withdrawal_fee_percentage}
                    onChange={(e) => setEditFormData({ ...editFormData, withdrawal_fee_percentage: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialog(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={updateMerchant.isPending}>
                  {updateMerchant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {filteredMerchants.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">No merchants found</p>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Try a different search term' : 'Create your first merchant to get started'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
