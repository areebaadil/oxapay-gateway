import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent, useAgentMerchants } from '@/hooks/useAgents';
import { useUpdateMerchant } from '@/hooks/useMerchants';
import { useTransactions } from '@/hooks/useTransactions';
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
  Edit,
  Pause,
  Play,
  Loader2,
  Users
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function AgentMerchants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { agentId } = useAuth();
  const { data: agent } = useAgent(agentId);
  const { data: agentMerchants, isLoading } = useAgentMerchants(agentId);
  const { data: allTransactions } = useTransactions();
  const updateMerchant = useUpdateMerchant();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; merchant: any }>({ open: false, merchant: null });
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    webhook_url: '',
    deposit_fee_percentage: '1.5',
    withdrawal_fee_percentage: '1.5',
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    webhook_url: '',
    deposit_fee_percentage: '1.5',
    withdrawal_fee_percentage: '1.5',
  });

  const merchants = (agentMerchants || []).map(am => am.merchant).filter(Boolean);
  
  const filteredMerchants = merchants.filter((m: any) => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMerchantStats = (merchantId: string) => {
    const txs = (allTransactions || []).filter(tx => tx.merchant_id === merchantId);
    const confirmed = txs.filter(tx => tx.status === 'CONFIRMED' || tx.status === 'SETTLED');
    return {
      totalTx: txs.length,
      volume: confirmed.reduce((sum, tx) => sum + Number(tx.usd_value), 0),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate fees against agent limits
    const depositFee = parseFloat(formData.deposit_fee_percentage);
    const withdrawalFee = parseFloat(formData.withdrawal_fee_percentage);
    
    if (agent && depositFee > agent.max_deposit_fee_percentage) {
      toast({ 
        title: 'Error', 
        description: `Deposit fee cannot exceed ${agent.max_deposit_fee_percentage}%`, 
        variant: 'destructive' 
      });
      return;
    }
    
    if (agent && withdrawalFee > agent.max_withdrawal_fee_percentage) {
      toast({ 
        title: 'Error', 
        description: `Withdrawal fee cannot exceed ${agent.max_withdrawal_fee_percentage}%`, 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-merchant-for-agent`,
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
            deposit_fee_percentage: depositFee,
            withdrawal_fee_percentage: withdrawalFee,
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
      queryClient.invalidateQueries({ queryKey: ['agent-merchants'] });
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

  const handleOpenEdit = (merchant: any) => {
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
    
    // Validate fees against agent limits
    const depositFee = parseFloat(editFormData.deposit_fee_percentage);
    const withdrawalFee = parseFloat(editFormData.withdrawal_fee_percentage);
    
    if (agent && depositFee > agent.max_deposit_fee_percentage) {
      toast({ 
        title: 'Error', 
        description: `Deposit fee cannot exceed ${agent.max_deposit_fee_percentage}%`, 
        variant: 'destructive' 
      });
      return;
    }
    
    if (agent && withdrawalFee > agent.max_withdrawal_fee_percentage) {
      toast({ 
        title: 'Error', 
        description: `Withdrawal fee cannot exceed ${agent.max_withdrawal_fee_percentage}%`, 
        variant: 'destructive' 
      });
      return;
    }
    
    updateMerchant.mutate({
      id: editDialog.merchant.id,
      name: editFormData.name,
      email: editFormData.email,
      webhook_url: editFormData.webhook_url || null,
      deposit_fee_percentage: depositFee,
      withdrawal_fee_percentage: withdrawalFee,
    }, {
      onSuccess: () => {
        setEditDialog({ open: false, merchant: null });
        toast({ title: 'Merchant updated', description: 'Details saved successfully.' });
        queryClient.invalidateQueries({ queryKey: ['agent-merchants'] });
      }
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout role="agent" title="My Merchants">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent" title="My Merchants">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Merchants</h1>
            <p className="text-muted-foreground">
              Create and manage merchants under your account
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
                  Add a new merchant under your agent account. Max fees: {agent?.max_deposit_fee_percentage}% / {agent?.max_withdrawal_fee_percentage}%
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook">Webhook URL (optional)</Label>
                  <Input 
                    id="webhook" 
                    placeholder="https://acme.com/webhooks"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-fee">Deposit Fee %</Label>
                    <Input 
                      id="deposit-fee" 
                      type="number" 
                      step="0.1" 
                      max={agent?.max_deposit_fee_percentage}
                      placeholder="1.5"
                      value={formData.deposit_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, deposit_fee_percentage: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Max: {agent?.max_deposit_fee_percentage}%</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdrawal-fee">Withdrawal Fee %</Label>
                    <Input 
                      id="withdrawal-fee" 
                      type="number" 
                      step="0.1" 
                      max={agent?.max_withdrawal_fee_percentage}
                      placeholder="1.5"
                      value={formData.withdrawal_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, withdrawal_fee_percentage: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Max: {agent?.max_withdrawal_fee_percentage}%</p>
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

        {/* Search */}
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
          {filteredMerchants.map((merchant: any, index: number) => {
            const stats = getMerchantStats(merchant.id);
            
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
                      <span>Fees: {merchant.deposit_fee_percentage}% / {merchant.withdrawal_fee_percentage}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <p className="text-lg font-semibold">{stats.totalTx}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="text-lg font-semibold">${stats.volume.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {filteredMerchants.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No merchants yet</p>
              <p className="text-sm">Create your first merchant to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, merchant: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Merchant</DialogTitle>
            <DialogDescription>
              Update merchant details. Max fees: {agent?.max_deposit_fee_percentage}% / {agent?.max_withdrawal_fee_percentage}%
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
              <Label htmlFor="edit-webhook">Webhook URL</Label>
              <Input 
                id="edit-webhook" 
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
                  max={agent?.max_deposit_fee_percentage}
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
                  max={agent?.max_withdrawal_fee_percentage}
                  value={editFormData.withdrawal_fee_percentage}
                  onChange={(e) => setEditFormData({ ...editFormData, withdrawal_fee_percentage: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialog({ open: false, merchant: null })}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMerchant.isPending}>
                {updateMerchant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
