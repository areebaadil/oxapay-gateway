import { createClient } from "npm:@supabase/supabase-js@2";

export interface MerchantContext {
  merchantId: string;
  merchantName: string;
  feePercentage: number;
  isEnabled: boolean;
}

export async function validateApiKey(apiKey: string): Promise<MerchantContext | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // API key format: pk_<8-char-merchant-id>_<64-char-secret>
  // Example: pk_abc12345_64hexchars...
  // Extract prefix by finding the pattern pk_XXXXXXXX (11 chars total)
  
  // Validate format
  if (!apiKey.startsWith("pk_") || apiKey.length < 76) {
    console.log("Invalid API key format: too short or wrong prefix");
    return null;
  }

  // The prefix is "pk_" + 8 chars = 11 characters
  const keyPrefix = apiKey.substring(0, 11);
  
  // Verify the key has the underscore separator after prefix
  if (apiKey.charAt(11) !== "_") {
    console.log("Invalid API key format: missing separator after prefix");
    return null;
  }

  // Hash the full key to compare
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  console.log(`Validating API key with prefix: ${keyPrefix}`);

  // Find API key by hash
  const { data: apiKeyRecord, error } = await supabase
    .from("api_keys")
    .select("*, merchants(*)")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Database error looking up API key:", error);
    return null;
  }

  if (!apiKeyRecord) {
    console.log("API key not found or inactive");
    return null;
  }

  const merchant = apiKeyRecord.merchants as {
    id: string;
    name: string;
    deposit_fee_percentage: number;
    is_enabled: boolean;
  };

  if (!merchant) {
    console.log("No merchant associated with API key");
    return null;
  }

  if (!merchant.is_enabled) {
    console.log("Merchant is disabled");
    return null;
  }

  // Update last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyRecord.id);

  console.log(`API key validated for merchant: ${merchant.name}`);

  return {
    merchantId: merchant.id,
    merchantName: merchant.name,
    feePercentage: merchant.deposit_fee_percentage,
    isEnabled: merchant.is_enabled,
  };
}

export function getApiKeyFromRequest(req: Request): string | null {
  // Check Authorization header first (Bearer token)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function unauthorizedResponse(message = "Unauthorized") {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function successResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
