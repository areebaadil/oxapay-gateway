import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { TOTP, Secret } from "npm:otpauth@9.2.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action, code } = body;

    // ACTION: status - Check if user has TOTP enabled
    if (action === "status") {
      const { data: existing } = await supabase
        .from("user_totp")
        .select("is_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      return jsonResponse({
        has_totp: !!existing,
        is_enabled: existing?.is_enabled || false,
      });
    }

    // ACTION: setup - Generate TOTP secret and return QR URI
    if (action === "setup") {
      const { data: existing } = await supabase
        .from("user_totp")
        .select("is_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.is_enabled) {
        return jsonResponse({ error: "TOTP already enabled" }, 400);
      }

      const secret = new Secret({ size: 20 });
      const totp = new TOTP({
        issuer: "Roxpay",
        label: user.email || "User",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });

      await supabase
        .from("user_totp")
        .upsert({
          user_id: user.id,
          totp_secret: secret.base32,
          is_enabled: false,
        }, { onConflict: "user_id" });

      return jsonResponse({
        secret: secret.base32,
        uri: totp.toString(),
      });
    }

    // ACTION: verify-setup - Verify code and enable TOTP
    if (action === "verify-setup") {
      if (!code) {
        return jsonResponse({ error: "Code is required" }, 400);
      }

      const { data: totpRecord } = await supabase
        .from("user_totp")
        .select("totp_secret, is_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!totpRecord) {
        return jsonResponse({ error: "TOTP not set up. Call setup first." }, 400);
      }

      if (totpRecord.is_enabled) {
        return jsonResponse({ error: "TOTP already enabled" }, 400);
      }

      const totp = new TOTP({
        issuer: "Roxpay",
        label: user.email || "User",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(totpRecord.totp_secret),
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return jsonResponse({ error: "Invalid code. Please try again." }, 400);
      }

      await supabase
        .from("user_totp")
        .update({ is_enabled: true })
        .eq("user_id", user.id);

      return jsonResponse({ success: true, message: "TOTP enabled successfully" });
    }

    // ACTION: verify - Verify TOTP code during login
    if (action === "verify") {
      if (!code) {
        return jsonResponse({ error: "Code is required" }, 400);
      }

      const { data: totpRecord } = await supabase
        .from("user_totp")
        .select("totp_secret, is_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!totpRecord || !totpRecord.is_enabled) {
        return jsonResponse({ error: "TOTP not enabled for this user" }, 400);
      }

      const totp = new TOTP({
        issuer: "Roxpay",
        label: user.email || "User",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(totpRecord.totp_secret),
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return jsonResponse({ error: "Invalid authentication code" }, 400);
      }

      return jsonResponse({ success: true, verified: true });
    }

    return jsonResponse({ error: "Invalid action" }, 400);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
