-- Add platform fee columns to agents (what the platform charges the agent)
ALTER TABLE public.agents 
ADD COLUMN deposit_fee_percentage numeric NOT NULL DEFAULT 1.50,
ADD COLUMN withdrawal_fee_percentage numeric NOT NULL DEFAULT 1.50;