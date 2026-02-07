import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Get deposit intent ID from URL or body
    const url = new URL(req.url);
    const intentId = url.searchParams.get("id");

    if (!intentId) {
      return new Response(
        JSON.stringify({ error: "Missing deposit intent ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch deposit intent with merchant details (use correct column names)
    const { data: intent, error: intentError } = await supabase
      .from("deposit_intents")
      .select("*, merchants(name, deposit_fee_percentage)")
      .eq("id", intentId)
      .maybeSingle();

    if (intentError || !intent) {
      return new Response(
        JSON.stringify({ error: "Deposit intent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    const isExpired = new Date(intent.expires_at) < new Date();

    // Get associated transaction if exists
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("deposit_intent_id", intentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get current exchange rate
    const { data: rate } = await supabase
      .from("exchange_rates")
      .select("usd_rate")
      .eq("coin", intent.coin)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          deposit_intent: {
            id: intent.id,
            coin: intent.coin,
            expected_amount: intent.expected_amount,
            deposit_address: intent.deposit_address,
            expires_at: intent.expires_at,
            is_expired: isExpired,
            merchant_name: intent.merchants?.name,
            success_url: intent.success_url,
            failure_url: intent.failure_url,
          },
          transaction: transaction ? {
            id: transaction.id,
            status: transaction.status,
            crypto_amount: transaction.crypto_amount,
            usd_value: transaction.usd_value,
            exchange_rate: transaction.exchange_rate,
            tx_hash: transaction.tx_hash,
            confirmed_at: transaction.confirmed_at,
          } : null,
          exchange_rate: rate?.usd_rate || null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-deposit-status:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
