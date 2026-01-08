-- ================================================
-- CryptoGate Payment Gateway Database Schema
-- ================================================

-- Create enum types for status tracking
CREATE TYPE public.transaction_status AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'SETTLED');
CREATE TYPE public.settlement_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE public.ledger_entry_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE public.ledger_category AS ENUM ('DEPOSIT', 'FEE', 'SETTLEMENT', 'PROCESSOR_FEE');
CREATE TYPE public.coin_type AS ENUM ('BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'TRX');
CREATE TYPE public.user_role AS ENUM ('admin', 'merchant');

-- ================================================
-- 1. Admin Profiles Table
-- ================================================
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 2. User Roles Table (security-critical)
-- ================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ================================================
-- 3. Merchants Table
-- ================================================
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  webhook_url TEXT,
  fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 1.50,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 4. Merchant Users (links auth users to merchants)
-- ================================================
CREATE TABLE public.merchant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_users ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's merchant_id
CREATE OR REPLACE FUNCTION public.get_user_merchant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT merchant_id FROM public.merchant_users WHERE user_id = _user_id LIMIT 1
$$;

-- ================================================
-- 5. API Keys Table
-- ================================================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 6. Deposit Intents Table
-- ================================================
CREATE TABLE public.deposit_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_reference TEXT NOT NULL,
  coin public.coin_type NOT NULL,
  expected_amount DECIMAL(20,8) NOT NULL,
  callback_url TEXT,
  deposit_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_intents ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 7. Transactions Table (STATUS LIVES HERE)
-- ================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  deposit_intent_id UUID REFERENCES public.deposit_intents(id) ON DELETE SET NULL,
  coin public.coin_type NOT NULL,
  crypto_amount DECIMAL(20,8) NOT NULL,
  usd_value DECIMAL(20,2) NOT NULL,
  exchange_rate DECIMAL(20,8) NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'PENDING',
  tx_hash TEXT,
  user_reference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 8. Ledger Entries Table (APPEND-ONLY, CRITICAL)
-- ================================================
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  coin public.coin_type NOT NULL,
  entry_type public.ledger_entry_type NOT NULL,
  category public.ledger_category NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  usd_value_at_time DECIMAL(20,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 9. Settlements Table
-- ================================================
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  coin public.coin_type NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  usd_value_at_request DECIMAL(20,2) NOT NULL,
  status public.settlement_status NOT NULL DEFAULT 'PENDING',
  wallet_address TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 10. Exchange Rates Table
-- ================================================
CREATE TABLE public.exchange_rates (
  coin public.coin_type PRIMARY KEY,
  usd_rate DECIMAL(20,8) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Insert default exchange rates
INSERT INTO public.exchange_rates (coin, usd_rate) VALUES
  ('BTC', 43280.45),
  ('ETH', 2300.00),
  ('USDT', 1.00),
  ('USDC', 1.00),
  ('LTC', 75.00),
  ('TRX', 0.112);

-- ================================================
-- 11. Webhook Logs Table
-- ================================================
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  attempts INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 12. Audit Logs Table
-- ================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES
-- ================================================

-- Admin profiles: only admins can read
CREATE POLICY "Admins can read admin profiles"
  ON public.admin_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own admin profile"
  ON public.admin_profiles FOR SELECT
  USING (user_id = auth.uid());

-- User roles: only admins can manage, users can read own
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Merchants: admins full access, merchants read own
CREATE POLICY "Admins can manage merchants"
  ON public.merchants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can read own record"
  ON public.merchants FOR SELECT
  USING (id = public.get_user_merchant_id(auth.uid()));

-- Merchant users: admins manage, users read own
CREATE POLICY "Admins can manage merchant users"
  ON public.merchant_users FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own merchant link"
  ON public.merchant_users FOR SELECT
  USING (user_id = auth.uid());

-- API Keys: admins manage, merchants read own
CREATE POLICY "Admins can manage API keys"
  ON public.api_keys FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can read own API keys"
  ON public.api_keys FOR SELECT
  USING (merchant_id = public.get_user_merchant_id(auth.uid()));

-- Deposit intents: admins see all, merchants see own
CREATE POLICY "Admins can manage deposit intents"
  ON public.deposit_intents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can read own deposit intents"
  ON public.deposit_intents FOR SELECT
  USING (merchant_id = public.get_user_merchant_id(auth.uid()));

CREATE POLICY "Merchants can create deposit intents"
  ON public.deposit_intents FOR INSERT
  WITH CHECK (merchant_id = public.get_user_merchant_id(auth.uid()));

-- Transactions: admins see all, merchants see own
CREATE POLICY "Admins can manage transactions"
  ON public.transactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can read own transactions"
  ON public.transactions FOR SELECT
  USING (merchant_id = public.get_user_merchant_id(auth.uid()));

-- Ledger entries: read-only, admins see all, merchants see own
CREATE POLICY "Admins can read all ledger entries"
  ON public.ledger_entries FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can read own ledger entries"
  ON public.ledger_entries FOR SELECT
  USING (merchant_id = public.get_user_merchant_id(auth.uid()));

-- System can insert ledger entries (via service role)
CREATE POLICY "System can insert ledger entries"
  ON public.ledger_entries FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Settlements: admins manage, merchants read/create own
CREATE POLICY "Admins can manage settlements"
  ON public.settlements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can read own settlements"
  ON public.settlements FOR SELECT
  USING (merchant_id = public.get_user_merchant_id(auth.uid()));

CREATE POLICY "Merchants can request settlements"
  ON public.settlements FOR INSERT
  WITH CHECK (merchant_id = public.get_user_merchant_id(auth.uid()));

-- Exchange rates: public read
CREATE POLICY "Anyone can read exchange rates"
  ON public.exchange_rates FOR SELECT
  USING (true);

CREATE POLICY "Admins can update exchange rates"
  ON public.exchange_rates FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Webhook logs: admins see all, merchants see own
CREATE POLICY "Admins can read all webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can read own webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (merchant_id = public.get_user_merchant_id(auth.uid()));

-- Audit logs: admins only
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ================================================
-- TRIGGERS
-- ================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();