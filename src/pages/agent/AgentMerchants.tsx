import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentMerchants } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, Mail, Calendar, Store } from 'lucide-react';
import { format } from 'date-fns';

export default function AgentMerchants() {
  const { agentId } = useAuth();
  const { data: agentMerchants, isLoading } = useAgentMerchants(agentId);

  const merchantCount = agentMerchants?.length || 0;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Merchants</h1>
            <p className="text-muted-foreground">
              Manage and view merchants under your account
            </p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold">{merchantCount} Merchants</span>
          </div>
        </div>

        {/* Merchants Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Merchant List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {merchantCount === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No merchants yet</h3>
                <p className="text-muted-foreground">
                  Contact the admin to have merchants assigned to your account.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Deposit Fee</TableHead>
                    <TableHead>Withdrawal Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentMerchants?.map((am: any) => (
                    <TableRow key={am.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {am.merchant?.name?.charAt(0)?.toUpperCase() || 'M'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{am.merchant?.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {am.merchant?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{am.merchant?.deposit_fee_percentage}%</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{am.merchant?.withdrawal_fee_percentage}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={am.merchant?.is_enabled ? 'default' : 'secondary'}>
                          {am.merchant?.is_enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Calendar className="h-4 w-4" />
                          {am.merchant?.created_at 
                            ? format(new Date(am.merchant.created_at), 'MMM d, yyyy')
                            : '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
