import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    // Get merchant ID from request or from user's merchant link
    const body = await req.json().catch(() => ({}));
    let merchantId = body.merchant_id;

    if (!isAdmin) {
      // Non-admins can only generate keys for their own merchant
      const { data: merchantUser } = await supabase
        .from("merchant_users")
        .select("merchant_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!merchantUser) {
        return new Response(
          JSON.stringify({ error: "No merchant association found" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      merchantId = merchantUser.merchant_id;
    }

    if (!merchantId) {
      return new Response(
        JSON.stringify({ error: "merchant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify merchant exists
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id, name")
      .eq("id", merchantId)
      .maybeSingle();

    if (merchantError || !merchant) {
      return new Response(
        JSON.stringify({ error: "Merchant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate API key with format: pk_<8-char-merchant-id>_<64-char-secret>
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const secretPart = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    
    // Key prefix format: pk_<first 8 chars of merchant ID>
    const keyPrefix = `pk_${merchantId.substring(0, 8)}`;
    const fullKey = `${keyPrefix}_${secretPart}`;

    // Hash the key for storage (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(fullKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Deactivate existing keys for this merchant
    await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("merchant_id", merchantId);

    // Store new key
    const { data: apiKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        merchant_id: merchantId,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating API key:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create API key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "API_KEY_GENERATED",
      entity_type: "api_key",
      entity_id: apiKey.id,
      details: { merchant_id: merchantId, key_prefix: keyPrefix },
    });

    console.log(`API key generated for merchant ${merchantId}, prefix: ${keyPrefix}`);

    // Return the full key (only time it's visible)
    // Use 'apiKey' to match frontend expectations
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          apiKey: fullKey,
          api_key: fullKey, // For backward compatibility
          key_prefix: keyPrefix,
          merchant_name: merchant.name,
          created_at: apiKey.created_at,
          warning: "Save this key securely. It will not be shown again.",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-api-key:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
