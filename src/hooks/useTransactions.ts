import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type TransactionStatus = Database['public']['Enums']['transaction_status'];
type CoinType = Database['public']['Enums']['coin_type'];

export interface Transaction {
  id: string;
  merchant_id: string;
  deposit_intent_id: string | null;
  coin: CoinType;
  crypto_amount: number;
  usd_value: number;
  exchange_rate: number;
  status: TransactionStatus;
  tx_hash: string | null;
  user_reference: string;
  created_at: string;
  confirmed_at: string | null;
}

export function useTransactions(filters?: {
  status?: string;
  coin?: string;
  merchantId?: string;
}) {
  const { role, merchantId: userMerchantId } = useAuth();

  return useQuery({
    queryKey: ['transactions', filters, role, userMerchantId],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status as TransactionStatus);
      }
      if (filters?.coin && filters.coin !== 'ALL') {
        query = query.eq('coin', filters.coin as CoinType);
      }
      if (filters?.merchantId && filters.merchantId !== 'ALL') {
        query = query.eq('merchant_id', filters.merchantId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useTransactionStats(merchantId?: string) {
  return useQuery({
    queryKey: ['transaction-stats', merchantId],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('status, usd_value, coin, crypto_amount, created_at');

      if (merchantId) {
        query = query.eq('merchant_id', merchantId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const transactions = data || [];
      // Only CONFIRMED = actual deposits; SETTLED = withdrawal pseudo-transactions
      const depositOnly = transactions.filter(tx => 
        tx.status === 'CONFIRMED'
      );

      return {
        totalTransactions: transactions.length,
        confirmedTransactions: depositOnly.length,
        pendingTransactions: transactions.filter(tx => tx.status === 'PENDING').length,
        failedTransactions: transactions.filter(tx => tx.status === 'FAILED').length,
        totalVolume: depositOnly.reduce((sum, tx) => sum + Number(tx.usd_value), 0),
        totalDepositVolume: depositOnly.reduce((sum, tx) => sum + Number(tx.usd_value), 0),
        volumeByCoin: Object.entries(
          depositOnly.reduce((acc, tx) => {
            acc[tx.coin] = (acc[tx.coin] || 0) + Number(tx.usd_value);
            return acc;
          }, {} as Record<string, number>)
        ).map(([coin, usdVolume]) => ({ coin, usdVolume })),
      };
    },
  });
}

export function useDailyTransactionStats(merchantId?: string) {
  return useQuery({
    queryKey: ['daily-transaction-stats', merchantId, new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      let query = supabase
        .from('transactions')
        .select('status, usd_value, coin, crypto_amount, created_at')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (merchantId) {
        query = query.eq('merchant_id', merchantId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const transactions = data || [];
      // Only CONFIRMED = actual deposits; exclude SETTLED (withdrawal pseudo-transactions)
      const confirmed = transactions.filter(tx => 
        tx.status === 'CONFIRMED'
      );
      const pending = transactions.filter(tx => tx.status === 'PENDING');
      const failed = transactions.filter(tx => tx.status === 'FAILED' || tx.status === 'EXPIRED');

      return {
        date: today,
        totalTransactions: transactions.length,
        confirmedTransactions: confirmed.length,
        pendingTransactions: pending.length,
        failedTransactions: failed.length,
        totalVolume: confirmed.reduce((sum, tx) => sum + Number(tx.usd_value), 0),
        pendingVolume: pending.reduce((sum, tx) => sum + Number(tx.usd_value), 0),
        volumeByCoin: Object.entries(
          transactions.reduce((acc, tx) => {
            acc[tx.coin] = (acc[tx.coin] || 0) + Number(tx.usd_value);
            return acc;
          }, {} as Record<string, number>)
        ).map(([coin, usdVolume]) => ({ coin, usdVolume })),
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      transactionId, 
      status, 
      txHash 
    }: { 
      transactionId: string; 
      status: TransactionStatus;
      txHash?: string;
    }) => {
      // Use edge function for approval to also create ledger entries
      if (status === 'CONFIRMED') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-transaction`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ transactionId, status, txHash }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to approve transaction');
        }

        return response.json();
      }

      // For non-CONFIRMED status (e.g. FAILED), direct update is fine
      const updateData: { status: TransactionStatus; tx_hash?: string } = { status };
      if (txHash) updateData.tx_hash = txHash;

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
      queryClient.invalidateQueries({ queryKey: ['daily-transaction-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-entries'] });
      
      const statusText = variables.status === 'CONFIRMED' ? 'approved' : 
                         variables.status === 'FAILED' ? 'rejected' : 
                         variables.status.toLowerCase();
      
      toast({
        title: `Transaction ${statusText}`,
        description: `Transaction has been ${statusText} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
