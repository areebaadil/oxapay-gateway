-- Create agents table
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  max_deposit_fee_percentage NUMERIC NOT NULL DEFAULT 5.00,
  max_withdrawal_fee_percentage NUMERIC NOT NULL DEFAULT 5.00,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_merchants junction table to track which merchants belong to which agent
CREATE TABLE public.agent_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(merchant_id)
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_merchants ENABLE ROW LEVEL SECURITY;

-- Function to get agent_id for current user
CREATE OR REPLACE FUNCTION public.get_user_agent_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.agents WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if merchant belongs to agent
CREATE OR REPLACE FUNCTION public.merchant_belongs_to_agent(_merchant_id uuid, _agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agent_merchants
    WHERE merchant_id = _merchant_id AND agent_id = _agent_id
  )
$$;

-- RLS policies for agents table
CREATE POLICY "Admins can manage agents"
ON public.agents FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Agents can read own record"
ON public.agents FOR SELECT
USING (user_id = auth.uid());

-- RLS policies for agent_merchants table
CREATE POLICY "Admins can manage agent_merchants"
ON public.agent_merchants FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Agents can read own merchant links"
ON public.agent_merchants FOR SELECT
USING (agent_id = get_user_agent_id(auth.uid()));

CREATE POLICY "Agents can create merchant links"
ON public.agent_merchants FOR INSERT
WITH CHECK (agent_id = get_user_agent_id(auth.uid()));

-- Update merchants RLS to allow agents to manage their merchants
CREATE POLICY "Agents can read own merchants"
ON public.merchants FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::user_role) AND 
  merchant_belongs_to_agent(id, get_user_agent_id(auth.uid()))
);

CREATE POLICY "Agents can update own merchants"
ON public.merchants FOR UPDATE
USING (
  has_role(auth.uid(), 'agent'::user_role) AND 
  merchant_belongs_to_agent(id, get_user_agent_id(auth.uid()))
);

CREATE POLICY "Agents can insert merchants"
ON public.merchants FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agent'::user_role));

-- Allow agents to view transactions for their merchants
CREATE POLICY "Agents can read own merchant transactions"
ON public.transactions FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::user_role) AND 
  merchant_belongs_to_agent(merchant_id, get_user_agent_id(auth.uid()))
);

-- Allow agents to view settlements for their merchants
CREATE POLICY "Agents can read own merchant settlements"
ON public.settlements FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::user_role) AND 
  merchant_belongs_to_agent(merchant_id, get_user_agent_id(auth.uid()))
);

-- Allow agents to view ledger entries for their merchants
CREATE POLICY "Agents can read own merchant ledger"
ON public.ledger_entries FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::user_role) AND 
  merchant_belongs_to_agent(merchant_id, get_user_agent_id(auth.uid()))
);

-- Trigger for updated_at
CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();