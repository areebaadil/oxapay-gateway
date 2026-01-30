import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  webhook_url: string | null;
  deposit_fee_percentage: number;
  withdrawal_fee_percentage: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MerchantWithAgent extends Merchant {
  agent?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function useMerchants() {
  return useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Merchant[];
    },
  });
}

export function useMerchantsWithAgents() {
  return useQuery({
    queryKey: ['merchants-with-agents'],
    queryFn: async () => {
      // Fetch merchants
      const { data: merchants, error: merchantsError } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (merchantsError) throw merchantsError;

      // Fetch agent_merchants with agent data
      const { data: agentMerchants, error: agentMerchantsError } = await supabase
        .from('agent_merchants')
        .select(`
          merchant_id,
          agent:agents(id, name, email)
        `);
      
      if (agentMerchantsError) throw agentMerchantsError;

      // Create a map of merchant_id to agent
      const merchantAgentMap = new Map<string, { id: string; name: string; email: string }>();
      for (const am of agentMerchants || []) {
        if (am.agent) {
          merchantAgentMap.set(am.merchant_id, am.agent as { id: string; name: string; email: string });
        }
      }

      // Combine merchants with their agents
      const merchantsWithAgents: MerchantWithAgent[] = (merchants || []).map(merchant => ({
        ...merchant,
        agent: merchantAgentMap.get(merchant.id) || null,
      }));

      return merchantsWithAgents;
    },
  });
}

export function useMerchant(id: string) {
  return useQuery({
    queryKey: ['merchants', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Merchant | null;
    },
    enabled: !!id,
  });
}

export function useCreateMerchant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (merchant: {
      name: string;
      email: string;
      webhook_url?: string;
      fee_percentage: number;
    }) => {
      const { data, error } = await supabase
        .from('merchants')
        .insert(merchant)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast({
        title: 'Merchant created',
        description: 'The merchant has been created successfully.',
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

export function useUpdateMerchant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Merchant> & { id: string }) => {
      const { data, error } = await supabase
        .from('merchants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast({
        title: 'Merchant updated',
        description: 'The merchant has been updated successfully.',
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

export function useDeleteMerchant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('merchants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast({
        title: 'Merchant deleted',
        description: 'The merchant has been deleted successfully.',
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
