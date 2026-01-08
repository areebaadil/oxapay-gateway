import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WebhookLog {
  id: string;
  merchant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  attempts: number;
  last_attempt_at: string;
  created_at: string;
}

export function useWebhookLogs(merchantId?: string) {
  const { merchantId: userMerchantId, role } = useAuth();
  
  const effectiveMerchantId = role === 'admin' ? merchantId : userMerchantId;

  return useQuery({
    queryKey: ['webhook-logs', effectiveMerchantId],
    queryFn: async () => {
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (effectiveMerchantId) {
        query = query.eq('merchant_id', effectiveMerchantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WebhookLog[];
    },
  });
}

export function useWebhookStats(merchantId?: string) {
  const { merchantId: userMerchantId, role } = useAuth();
  
  const effectiveMerchantId = role === 'admin' ? merchantId : userMerchantId;

  return useQuery({
    queryKey: ['webhook-stats', effectiveMerchantId],
    queryFn: async () => {
      let query = supabase
        .from('webhook_logs')
        .select('response_status, attempts');
      
      if (effectiveMerchantId) {
        query = query.eq('merchant_id', effectiveMerchantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const total = data?.length || 0;
      const successful = data?.filter(w => w.response_status && w.response_status >= 200 && w.response_status < 300).length || 0;
      const failed = data?.filter(w => !w.response_status || w.response_status >= 400).length || 0;
      const pending = data?.filter(w => w.attempts < 5 && (!w.response_status || w.response_status >= 400)).length || 0;
      
      return { total, successful, failed, pending };
    },
  });
}
