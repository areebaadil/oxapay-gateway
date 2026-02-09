-- ============================================================
-- FULL DATABASE SCHEMA BACKUP
-- Project: Crypto Payment Gateway
-- Generated: 2026-02-09
-- ============================================================

-- ============================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================

CREATE TYPE public.coin_type AS ENUM ('BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'TRX', 'JAZZCASH');

CREATE TYPE public.ledger_category AS ENUM ('DEPOSIT', 'FEE', 'SETTLEMENT', 'PROCESSOR_FEE');

CREATE TYPE public.ledger_entry_type AS ENUM ('CREDIT', 'DEBIT');

CREATE TYPE public.settlement_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

CREATE TYPE public.transaction_status AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'SETTLED');

CREATE TYPE public.user_role AS ENUM ('admin', 'merchant', 'agent');


-- ============================================================
-- 2. TABLES
-- ============================================================

-- admin_profiles
CREATE TABLE public.admin_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT admin_profiles_user_id_key UNIQUE (user_id)
);

-- agents
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  max_deposit_fee_percentage NUMERIC NOT NULL DEFAULT 5.00,
  max_withdrawal_fee_percentage NUMERIC NOT NULL DEFAULT 5.00,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deposit_fee_percentage NUMERIC NOT NULL DEFAULT 1.50,
  withdrawal_fee_percentage NUMERIC NOT NULL DEFAULT 1.50,
  CONSTRAINT agents_pkey PRIMARY KEY (id),
  CONSTRAINT agents_user_id_key UNIQUE (user_id)
);

-- merchants
CREATE TABLE public.merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  webhook_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deposit_fee_percentage NUMERIC NOT NULL DEFAULT 1.50,
  withdrawal_fee_percentage NUMERIC NOT NULL DEFAULT 1.50,
  CONSTRAINT merchants_pkey PRIMARY KEY (id),
  CONSTRAINT merchants_email_key UNIQUE (email)
);

-- agent_merchants
CREATE TABLE public.agent_merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT agent_merchants_pkey PRIMARY KEY (id),
  CONSTRAINT agent_merchants_merchant_id_key UNIQUE (merchant_id)
);

-- merchant_users
CREATE TABLE public.merchant_users (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT merchant_users_pkey PRIMARY KEY (id),
  CONSTRAINT merchant_users_user_id_key UNIQUE (user_id)
);

-- api_keys
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id)
);

-- deposit_intents
CREATE TABLE public.deposit_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  user_reference TEXT NOT NULL,
  coin coin_type NOT NULL,
  expected_amount NUMERIC NOT NULL,
  callback_url TEXT,
  deposit_address TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success_url TEXT,
  failure_url TEXT,
  CONSTRAINT deposit_intents_pkey PRIMARY KEY (id)
);

-- transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  deposit_intent_id UUID REFERENCES public.deposit_intents(id),
  coin coin_type NOT NULL,
  crypto_amount NUMERIC NOT NULL,
  usd_value NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  status transaction_status NOT NULL DEFAULT 'PENDING'::transaction_status,
  tx_hash TEXT,
  user_reference TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

-- ledger_entries
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  coin coin_type NOT NULL,
  entry_type ledger_entry_type NOT NULL,
  category ledger_category NOT NULL,
  amount NUMERIC NOT NULL,
  usd_value_at_time NUMERIC NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ledger_entries_pkey PRIMARY KEY (id)
);

-- settlements
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  coin coin_type NOT NULL,
  amount NUMERIC NOT NULL,
  usd_value_at_request NUMERIC NOT NULL,
  status settlement_status NOT NULL DEFAULT 'PENDING'::settlement_status,
  wallet_address TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  CONSTRAINT settlements_pkey PRIMARY KEY (id)
);

-- exchange_rates
CREATE TABLE public.exchange_rates (
  coin coin_type NOT NULL,
  usd_rate NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_pkey PRIMARY KEY (coin)
);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- audit_logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- webhook_logs
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  attempts INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT webhook_logs_pkey PRIMARY KEY (id)
);


-- ============================================================
-- 3. DATABASE FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_agent_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.agents WHERE user_id = _user_id LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_user_merchant_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT merchant_id FROM public.merchant_users WHERE user_id = _user_id LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.merchant_belongs_to_agent(_merchant_id uuid, _agent_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.agent_merchants
    WHERE merchant_id = _merchant_id AND agent_id = _agent_id
  )
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;


-- ============================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- admin_profiles
CREATE POLICY "Admins can read admin profiles" ON public.admin_profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can read own admin profile" ON public.admin_profiles FOR SELECT USING (user_id = auth.uid());

-- agent_merchants
CREATE POLICY "Admins can manage agent_merchants" ON public.agent_merchants FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Agents can create merchant links" ON public.agent_merchants FOR INSERT WITH CHECK (agent_id = get_user_agent_id(auth.uid()));
CREATE POLICY "Agents can read own merchant links" ON public.agent_merchants FOR SELECT USING (agent_id = get_user_agent_id(auth.uid()));

-- agents
CREATE POLICY "Admins can manage agents" ON public.agents FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Agents can read own record" ON public.agents FOR SELECT USING (user_id = auth.uid());

-- api_keys
CREATE POLICY "Admins can manage API keys" ON public.api_keys FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Merchants can read own API keys" ON public.api_keys FOR SELECT USING (merchant_id = get_user_merchant_id(auth.uid()));

-- audit_logs
CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id IS NULL) OR (user_id = auth.uid())));

-- deposit_intents
CREATE POLICY "Admins can manage deposit intents" ON public.deposit_intents FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Merchants can create deposit intents" ON public.deposit_intents FOR INSERT WITH CHECK (merchant_id = get_user_merchant_id(auth.uid()));
CREATE POLICY "Merchants can read own deposit intents" ON public.deposit_intents FOR SELECT USING (merchant_id = get_user_merchant_id(auth.uid()));
CREATE POLICY "Public can read deposit intents by id" ON public.deposit_intents FOR SELECT USING (true);

-- exchange_rates
CREATE POLICY "Admins can update exchange rates" ON public.exchange_rates FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can read exchange rates" ON public.exchange_rates FOR SELECT USING (true);

-- ledger_entries
CREATE POLICY "Admins can read all ledger entries" ON public.ledger_entries FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Agents can read own merchant ledger" ON public.ledger_entries FOR SELECT USING (has_role(auth.uid(), 'agent'::user_role) AND merchant_belongs_to_agent(merchant_id, get_user_agent_id(auth.uid())));
CREATE POLICY "Merchants can read own ledger entries" ON public.ledger_entries FOR SELECT USING (merchant_id = get_user_merchant_id(auth.uid()));
CREATE POLICY "System can insert ledger entries" ON public.ledger_entries FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- merchant_users
CREATE POLICY "Admins can manage merchant users" ON public.merchant_users FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can read own merchant link" ON public.merchant_users FOR SELECT USING (user_id = auth.uid());

-- merchants
CREATE POLICY "Admins can manage merchants" ON public.merchants FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Agents can insert merchants" ON public.merchants FOR INSERT WITH CHECK (has_role(auth.uid(), 'agent'::user_role));
CREATE POLICY "Agents can read own merchants" ON public.merchants FOR SELECT USING (has_role(auth.uid(), 'agent'::user_role) AND merchant_belongs_to_agent(id, get_user_agent_id(auth.uid())));
CREATE POLICY "Agents can update own merchants" ON public.merchants FOR UPDATE USING (has_role(auth.uid(), 'agent'::user_role) AND merchant_belongs_to_agent(id, get_user_agent_id(auth.uid())));
CREATE POLICY "Merchants can read own record" ON public.merchants FOR SELECT USING (id = get_user_merchant_id(auth.uid()));

-- settlements
CREATE POLICY "Admins can manage settlements" ON public.settlements FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Agents can read own merchant settlements" ON public.settlements FOR SELECT USING (has_role(auth.uid(), 'agent'::user_role) AND merchant_belongs_to_agent(merchant_id, get_user_agent_id(auth.uid())));
CREATE POLICY "Merchants can read own settlements" ON public.settlements FOR SELECT USING (merchant_id = get_user_merchant_id(auth.uid()));
CREATE POLICY "Merchants can request settlements" ON public.settlements FOR INSERT WITH CHECK (merchant_id = get_user_merchant_id(auth.uid()));

-- transactions
CREATE POLICY "Admins can manage transactions" ON public.transactions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Agents can read own merchant transactions" ON public.transactions FOR SELECT USING (has_role(auth.uid(), 'agent'::user_role) AND merchant_belongs_to_agent(merchant_id, get_user_agent_id(auth.uid())));
CREATE POLICY "Merchants can read own transactions" ON public.transactions FOR SELECT USING (merchant_id = get_user_merchant_id(auth.uid()));
CREATE POLICY "Public can read transactions by deposit_intent_id" ON public.transactions FOR SELECT USING (deposit_intent_id IS NOT NULL);

-- user_roles
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- webhook_logs
CREATE POLICY "Admins can read all webhook logs" ON public.webhook_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Merchants can read own webhook logs" ON public.webhook_logs FOR SELECT USING (merchant_id = get_user_merchant_id(auth.uid()));


-- ============================================================
-- END OF BACKUP
-- ============================================================
