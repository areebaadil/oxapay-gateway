import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  max_deposit_fee_percentage: number;
  max_withdrawal_fee_percentage: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentMerchant {
  id: string;
  agent_id: string;
  merchant_id: string;
  created_at: string;
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Agent[];
    },
  });
}

export function useAgent(agentId: string | null) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      if (!agentId) return null;
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (error) throw error;
      return data as Agent;
    },
    enabled: !!agentId,
  });
}

export function useAgentMerchants(agentId: string | null) {
  return useQuery({
    queryKey: ['agent-merchants', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      const { data, error } = await supabase
        .from('agent_merchants')
        .select(`
          *,
          merchant:merchants(*)
        `)
        .eq('agent_id', agentId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Agent> & { id: string }) => {
      const { id, ...data } = updates;
      const { error } = await supabase
        .from('agents')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
