import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExchangeRate {
  coin: 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'LTC' | 'TRX';
  usd_rate: number;
  updated_at: string;
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*');
      
      if (error) throw error;
      
      // Convert to a map for easy access
      const ratesMap = (data as ExchangeRate[]).reduce((acc, rate) => {
        acc[rate.coin] = Number(rate.usd_rate);
        return acc;
      }, {} as Record<string, number>);
      
      return {
        rates: data as ExchangeRate[],
        ratesMap,
      };
    },
    staleTime: 60000, // Cache for 1 minute
  });
}
