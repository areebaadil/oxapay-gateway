import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAgents, useUpdateAgent } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Shield, 
  Mail, 
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

export default function Agents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; agent: NonNullable<ReturnType<typeof useAgents>['data']>[number] | null }>({ open: false, agent: null });
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    max_deposit_fee_percentage: '5',
    max_withdrawal_fee_percentage: '5',
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    max_deposit_fee_percentage: '5',
    max_withdrawal_fee_percentage: '5',
  });

  const { data: agents, isLoading } = useAgents();
  const updateAgent = useUpdateAgent();

  const filteredAgents = (agents || []).filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-agent-with-user`,
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
            max_deposit_fee_percentage: parseFloat(formData.max_deposit_fee_percentage),
            max_withdrawal_fee_percentage: parseFloat(formData.max_withdrawal_fee_percentage),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create agent');
      }

      toast({
        title: 'Agent created',
        description: `Login: ${formData.email} / ${formData.password}`,
      });
      
      setIsCreateOpen(false);
      setFormData({ name: '', email: '', password: '', max_deposit_fee_percentage: '5', max_withdrawal_fee_percentage: '5' });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    updateAgent.mutate({ id, is_enabled: !currentStatus });
  };

  const handleOpenEdit = (agent: NonNullable<typeof agents>[number]) => {
    setEditFormData({
      name: agent.name,
      email: agent.email,
      max_deposit_fee_percentage: String(agent.max_deposit_fee_percentage),
      max_withdrawal_fee_percentage: String(agent.max_withdrawal_fee_percentage),
    });
    setEditDialog({ open: true, agent });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog?.agent) return;
    
    updateAgent.mutate({
      id: editDialog.agent.id,
      name: editFormData.name,
      email: editFormData.email,
      max_deposit_fee_percentage: parseFloat(editFormData.max_deposit_fee_percentage),
      max_withdrawal_fee_percentage: parseFloat(editFormData.max_withdrawal_fee_percentage),
    }, {
      onSuccess: () => {
        setEditDialog({ open: false, agent: null });
        toast({ title: 'Agent updated', description: 'Details saved successfully.' });
      }
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout role="admin" title="Agents">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Agents">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agent Management</h1>
            <p className="text-muted-foreground">
              Create and manage agent (sub-admin) accounts
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="glow-primary">
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Agent</DialogTitle>
                <DialogDescription>
                  Add a new agent to the platform. Agents can onboard and manage their own merchants.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
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
                    placeholder="agent@example.com"
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
                    Agent will use this to login. Min 6 characters.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-deposit-fee">Max Deposit Fee %</Label>
                    <Input 
                      id="max-deposit-fee" 
                      type="number" 
                      step="0.1" 
                      placeholder="5.0"
                      value={formData.max_deposit_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, max_deposit_fee_percentage: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum fee agent can set for their merchants
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-withdrawal-fee">Max Withdrawal Fee %</Label>
                    <Input 
                      id="max-withdrawal-fee" 
                      type="number" 
                      step="0.1" 
                      placeholder="5.0"
                      value={formData.max_withdrawal_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, max_withdrawal_fee_percentage: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Agent'}
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
              placeholder="Search agents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent, index) => (
            <Card 
              key={agent.id} 
              className={cn(
                "border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg animate-fade-in",
                !agent.is_enabled && "opacity-60"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {agent.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">
                      {agent.id.slice(0, 8)}...
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
                    <DropdownMenuItem onClick={() => handleOpenEdit(agent)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleToggleStatus(agent.id, agent.is_enabled)}>
                      {agent.is_enabled ? (
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
                    variant={agent.is_enabled ? "default" : "secondary"}
                    className={cn(
                      agent.is_enabled 
                        ? "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/30" 
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {agent.is_enabled ? 'Active' : 'Suspended'}
                  </Badge>
                </div>
                
                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{agent.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    <span>Max Fees: {agent.max_deposit_fee_percentage}% / {agent.max_withdrawal_fee_percentage}%</span>
                  </div>
                </div>

                {/* Stats placeholder */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Merchants</p>
                    <p className="text-lg font-semibold">-</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Volume</p>
                    <p className="text-lg font-semibold">-</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredAgents.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No agents found</p>
              <p className="text-sm">Create your first agent to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, agent: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update agent details and fee limits.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Agent Name</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max-deposit-fee">Max Deposit Fee %</Label>
                <Input 
                  id="edit-max-deposit-fee" 
                  type="number" 
                  step="0.1" 
                  value={editFormData.max_deposit_fee_percentage}
                  onChange={(e) => setEditFormData({ ...editFormData, max_deposit_fee_percentage: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-withdrawal-fee">Max Withdrawal Fee %</Label>
                <Input 
                  id="edit-max-withdrawal-fee" 
                  type="number" 
                  step="0.1" 
                  value={editFormData.max_withdrawal_fee_percentage}
                  onChange={(e) => setEditFormData({ ...editFormData, max_withdrawal_fee_percentage: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialog({ open: false, agent: null })}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateAgent.isPending}>
                {updateAgent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
