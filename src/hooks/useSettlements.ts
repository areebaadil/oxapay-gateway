import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type SettlementStatus = Database['public']['Enums']['settlement_status'];
type CoinType = Database['public']['Enums']['coin_type'];

export interface Settlement {
  id: string;
  merchant_id: string;
  coin: CoinType;
  amount: number;
  usd_value_at_request: number;
  status: SettlementStatus;
  wallet_address: string;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export function useSettlements(status?: string) {
  const { role, merchantId } = useAuth();

  return useQuery({
    queryKey: ['settlements', status, role, merchantId],
    queryFn: async () => {
      let query = supabase
        .from('settlements')
        .select('*')
        .order('requested_at', { ascending: false });

      if (status && status !== 'ALL') {
        query = query.eq('status', status as SettlementStatus);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Settlement[];
    },
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { merchantId } = useAuth();

  return useMutation({
    mutationFn: async (settlement: {
      coin: CoinType;
      amount: number;
      usd_value_at_request: number;
      wallet_address: string;
    }) => {
      if (!merchantId) throw new Error('No merchant ID found');
      
      const { data, error } = await supabase
        .from('settlements')
        .insert({
          ...settlement,
          merchant_id: merchantId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast({
        title: 'Settlement requested',
        description: 'Your settlement request has been submitted for approval.',
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

export function useProcessSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      const { data, error } = await supabase
        .from('settlements')
        .update({
          status,
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast({
        title: `Settlement ${variables.status.toLowerCase()}`,
        description: `The settlement has been ${variables.status.toLowerCase()}.`,
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

export function useCompleteSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ settlementId, txHash }: { settlementId: string; txHash: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-settlement`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            settlementId,
            action: 'complete',
            txHash,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete settlement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-entries'] });
      toast({
        title: 'Settlement completed',
        description: 'The settlement has been marked as completed.',
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
