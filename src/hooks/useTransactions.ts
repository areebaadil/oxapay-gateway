import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
      const confirmed = transactions.filter(tx => 
        tx.status === 'CONFIRMED' || tx.status === 'SETTLED'
      );

      return {
        totalTransactions: transactions.length,
        confirmedTransactions: confirmed.length,
        pendingTransactions: transactions.filter(tx => tx.status === 'PENDING').length,
        failedTransactions: transactions.filter(tx => tx.status === 'FAILED').length,
        totalVolume: confirmed.reduce((sum, tx) => sum + Number(tx.usd_value), 0),
        volumeByCoin: Object.entries(
          confirmed.reduce((acc, tx) => {
            acc[tx.coin] = (acc[tx.coin] || 0) + Number(tx.usd_value);
            return acc;
          }, {} as Record<string, number>)
        ).map(([coin, usdVolume]) => ({ coin, usdVolume })),
      };
    },
  });
}
