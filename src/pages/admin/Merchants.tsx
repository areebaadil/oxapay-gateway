import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMerchants, useCreateMerchant, useUpdateMerchant } from '@/hooks/useMerchants';
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
  ExternalLink,
  Edit,
  Pause,
  Play,
  Loader2
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Merchants() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    webhook_url: '',
    fee_percentage: '1.5',
  });

  const { data: merchants, isLoading } = useMerchants();
  const { data: transactions } = useTransactions();
  const createMerchant = useCreateMerchant();
  const updateMerchant = useUpdateMerchant();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMerchant.mutate({
      name: formData.name,
      email: formData.email,
      webhook_url: formData.webhook_url || undefined,
      fee_percentage: parseFloat(formData.fee_percentage),
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setFormData({ name: '', email: '', webhook_url: '', fee_percentage: '1.5' });
      }
    });
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    updateMerchant.mutate({ id, is_enabled: !currentStatus });
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
                  <Label htmlFor="webhook">Webhook URL</Label>
                  <Input 
                    id="webhook" 
                    placeholder="https://acme.com/webhooks"
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee">Fee Percentage</Label>
                  <Input 
                    id="fee" 
                    type="number" 
                    step="0.1" 
                    placeholder="1.5"
                    value={formData.fee_percentage}
                    onChange={(e) => setFormData({ ...formData, fee_percentage: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createMerchant.isPending}>
                    {createMerchant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Merchant'}
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
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/transactions')}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Transactions
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
                      <span>{merchant.fee_percentage}% platform fee</span>
                    </div>
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
