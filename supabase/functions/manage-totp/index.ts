import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { TOTP, Secret } from "npm:otpauth@9.2.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    // ACTION: setup - Generate TOTP secret and return QR URI
    if (action === "setup") {
      // Check if already has TOTP enabled
      const { data: existing } = await supabase
        .from("user_totp")
        .select("is_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.is_enabled) {
        return new Response(JSON.stringify({ error: "TOTP already enabled" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate new secret
      const secret = new Secret({ size: 20 });
      const totp = new TOTP({
        issuer: "Roxpay",
        label: user.email || "User",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });

      // Store secret (upsert - replace if exists but not enabled)
      await supabase
        .from("user_totp")
        .upsert({
          user_id: user.id,
          totp_secret: secret.base32,
          is_enabled: false,
        }, { onConflict: "user_id" });

      const otpauthUri = totp.toString();

      return new Response(JSON.stringify({
        secret: secret.base32,
        uri: otpauthUri,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: verify-setup - Verify code and enable TOTP
    if (action === "verify-setup") {
      const { code } = await req.json().catch(() => ({}));
      // Re-parse since we already consumed body above, use the original parse
      // Actually we already parsed action, let's get code from the same parse
    }

    // Re-parse body for all actions
    // Fix: we need to get all params from one parse. Let me restructure.

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
