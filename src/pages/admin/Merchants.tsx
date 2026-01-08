import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockMerchants, mockTransactions } from '@/lib/mock-data';
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
  Trash2
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

export default function Merchants() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredMerchants = mockMerchants.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMerchantStats = (merchantId: string) => {
    const txs = mockTransactions.filter(tx => tx.merchantId === merchantId);
    const confirmed = txs.filter(tx => tx.status === 'CONFIRMED' || tx.status === 'SETTLED');
    return {
      totalTx: txs.length,
      volume: confirmed.reduce((sum, tx) => sum + tx.usdValue, 0),
    };
  };

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
              <form className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input id="name" placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="admin@acme.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook">Webhook URL</Label>
                  <Input id="webhook" placeholder="https://acme.com/webhooks" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee">Fee Percentage</Label>
                  <Input id="fee" type="number" step="0.1" placeholder="1.5" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Create Merchant
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
                  !merchant.isEnabled && "opacity-60"
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
                        {merchant.id}
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
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Transactions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        {merchant.isEnabled ? (
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
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Status Badge */}
                  <Badge 
                    variant={merchant.isEnabled ? "default" : "secondary"}
                    className={cn(
                      merchant.isEnabled 
                        ? "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/30" 
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {merchant.isEnabled ? 'Active' : 'Suspended'}
                  </Badge>
                  
                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{merchant.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="truncate text-xs">{merchant.webhookUrl}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Percent className="h-4 w-4" />
                      <span>{merchant.feePercentage}% platform fee</span>
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
