import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  merchant_id: string;
  coin: 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'LTC' | 'TRX';
  entry_type: 'CREDIT' | 'DEBIT';
  category: 'DEPOSIT' | 'FEE' | 'SETTLEMENT' | 'PROCESSOR_FEE';
  amount: number;
  usd_value_at_time: number;
  description: string;
  created_at: string;
}

export function useLedgerEntries(merchantId?: string) {
  const { role, merchantId: userMerchantId } = useAuth();

  return useQuery({
    queryKey: ['ledger-entries', merchantId, role, userMerchantId],
    queryFn: async () => {
      let query = supabase
        .from('ledger_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (merchantId) {
        query = query.eq('merchant_id', merchantId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as LedgerEntry[];
    },
  });
}

export function useLedgerBalance(merchantId?: string) {
  const { data: entries } = useLedgerEntries(merchantId);

  if (!entries) return null;

  // Calculate balances by coin
  const balancesByCoin = entries.reduce((acc, entry) => {
    const coin = entry.coin;
    if (!acc[coin]) {
      acc[coin] = { credits: 0, debits: 0 };
    }
    if (entry.entry_type === 'CREDIT') {
      acc[coin].credits += Number(entry.amount);
    } else {
      acc[coin].debits += Number(entry.amount);
    }
    return acc;
  }, {} as Record<string, { credits: number; debits: number }>);

  return Object.entries(balancesByCoin).map(([coin, { credits, debits }]) => ({
    coin,
    balance: credits - debits,
  }));
}
