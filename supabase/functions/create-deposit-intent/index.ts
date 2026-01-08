import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDepositIntentRequest {
  merchant_id: string;
  user_reference: string;
  coin: string;
  expected_amount: number;
  callback_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateDepositIntentRequest = await req.json();
    const { merchant_id, user_reference, coin, expected_amount, callback_url } = body;

    // Validate required fields
    if (!merchant_id || !user_reference || !coin || !expected_amount) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: merchant_id, user_reference, coin, expected_amount" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify merchant exists and is enabled
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("*")
      .eq("id", merchant_id)
      .eq("is_enabled", true)
      .maybeSingle();

    if (merchantError || !merchant) {
      return new Response(
        JSON.stringify({ error: "Merchant not found or disabled" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Create deposit intent
    const { data: intent, error: intentError } = await supabase
      .from("deposit_intents")
      .insert({
        merchant_id,
        user_reference,
        coin: coin.toUpperCase(),
        expected_amount,
        callback_url: callback_url || merchant.webhook_url,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (intentError) {
      console.error("Error creating deposit intent:", intentError);
      return new Response(
        JSON.stringify({ error: "Failed to create deposit intent" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate hosted deposit page URL
    const hostedPageUrl = `${req.headers.get("origin") || supabaseUrl.replace("supabase.co", "lovable.app")}/deposit/${intent.id}`;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          deposit_intent_id: intent.id,
          hosted_deposit_page_url: hostedPageUrl,
          coin: intent.coin,
          expected_amount: intent.expected_amount,
          expires_at: intent.expires_at,
          merchant_name: merchant.name,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-deposit-intent:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
