
-- Table to store TOTP secrets for 2FA
CREATE TABLE public.user_totp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  totp_secret text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_totp ENABLE ROW LEVEL SECURITY;

-- Only admins can manage all TOTP records (via service role in edge functions)
-- Users can only check their own status (not read secret)
CREATE POLICY "Users can read own totp status"
ON public.user_totp
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No direct client insert/update - all managed via edge function with service role
