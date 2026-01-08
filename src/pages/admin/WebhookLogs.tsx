import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useWebhookLogs, useWebhookStats } from '@/hooks/useWebhookLogs';
import { useMerchants } from '@/hooks/useMerchants';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Webhook, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Eye,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface WebhookLog {
  id: string;
  merchant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  attempts: number;
  last_attempt_at: string;
  created_at: string;
}

function StatusBadge({ status, attempts }: { status: number | null; attempts: number }) {
  if (status && status >= 200 && status < 300) {
    return (
      <Badge className="bg-status-confirmed/10 text-status-confirmed border-status-confirmed/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Success ({status})
      </Badge>
    );
  }
  
  if (attempts >= 5) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed ({status || 'N/A'})
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
      <Clock className="h-3 w-3" />
      Pending ({attempts}/5)
    </Badge>
  );
}

export default function WebhookLogs() {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const { data: merchants } = useMerchants();
  const merchantId = selectedMerchant !== 'all' ? selectedMerchant : undefined;
  const { data: logs, isLoading, refetch } = useWebhookLogs(merchantId);
  const { data: stats } = useWebhookStats(merchantId);

  const filteredLogs = (logs || []).filter(log => {
    const matchesSearch = log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'success') return matchesSearch && log.response_status && log.response_status >= 200 && log.response_status < 300;
    if (statusFilter === 'failed') return matchesSearch && log.attempts >= 5;
    if (statusFilter === 'pending') return matchesSearch && log.attempts < 5 && (!log.response_status || log.response_status >= 400);
    
    return matchesSearch;
  });

  const handleRetryWebhooks = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-retry`,
        { method: 'POST' }
      );
      await response.json();
      refetch();
    } catch (error) {
      console.error('Retry error:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <DashboardLayout role={role as 'admin' | 'merchant'} title="Webhook Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Webhook className="h-6 w-6 text-primary" />
              Webhook Logs
            </h1>
            <p className="text-muted-foreground">
              Monitor and debug webhook deliveries
            </p>
          </div>
          
          <Button onClick={handleRetryWebhooks} disabled={isRetrying} className="gap-2">
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry Failed Webhooks
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
                <Webhook className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-status-confirmed">{stats?.successful || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-status-confirmed" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-destructive">{stats?.failed || 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Retry</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by event type or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending Retry</SelectItem>
            </SelectContent>
          </Select>

          {role === 'admin' && (
            <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by merchant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Merchants</SelectItem>
                {merchants?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No webhook logs found</p>
                <p className="text-muted-foreground text-sm">
                  Webhook events will appear here when payments are processed
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Last Attempt</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium font-mono text-sm">{log.event_type}</span>
                          <span className="text-xs text-muted-foreground">{log.id.slice(0, 8)}...</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.response_status} attempts={log.attempts} />
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-mono",
                          log.attempts >= 5 && "text-destructive"
                        )}>
                          {log.attempts}/5
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(log.last_attempt_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payload Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                Webhook Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Event Type</p>
                    <p className="font-mono">{selectedLog.event_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge status={selectedLog.response_status} attempts={selectedLog.attempts} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attempts</p>
                    <p className="font-mono">{selectedLog.attempts}/5</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Payload</p>
                  <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{JSON.stringify(selectedLog.payload, null, 2)}</code>
                  </pre>
                </div>

                {selectedLog.attempts >= 5 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Maximum retry attempts reached. Manual intervention required.</span>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
