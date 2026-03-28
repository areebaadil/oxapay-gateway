import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function callManageTotp(action: string, code?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error('No active session. Please sign in again.');
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/manage-totp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(code ? { action, code } : { action }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return { data: null, error: data };
  }

  return { data, error: null };
}
