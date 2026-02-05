import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePaymentRequest {
  deposit_intent_id: string;
  amount: number;
  currency: string;
  pay_currency: string;
  network?: string;
  user_reference: string;
  order_id?: string;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const oxapayApiKey = Deno.env.get("OXAPAY_MERCHANT_API_KEY");

    if (!oxapayApiKey) {
      throw new Error("OXAPAY_MERCHANT_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreatePaymentRequest = await req.json();
    const {
      deposit_intent_id,
      amount,
      currency,
      pay_currency,
      network,
      user_reference,
      order_id,
      description,
    } = body;

    // Validate required fields
    if (!deposit_intent_id || !amount || !pay_currency) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: deposit_intent_id, amount, pay_currency" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only USDT is supported
    if (pay_currency.toUpperCase() !== 'USDT') {
      return new Response(
        JSON.stringify({ error: "Only USDT is supported for payments" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get deposit intent to verify merchant
    const { data: intent, error: intentError } = await supabase
      .from("deposit_intents")
      .select("*, merchants(*)")
      .eq("id", deposit_intent_id)
      .maybeSingle();

    if (intentError || !intent) {
      return new Response(
        JSON.stringify({ error: "Deposit intent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build callback URL for OxaPay webhooks
    const callbackUrl = `${supabaseUrl}/functions/v1/oxapay-webhook`;

    // Map pay_currency to OxaPay network format - Only USDT TRC20 is supported
    const networkMap: Record<string, string> = {
      USDT: "TRC20",
    };

    // Create white-label payment via OxaPay API
    const oxapayPayload = {
      amount,
      currency: currency || "USD",
      pay_currency: pay_currency.toUpperCase(),
      network: network || networkMap[pay_currency.toUpperCase()] || undefined,
      lifetime: 60, // 60 minutes
      fee_paid_by_payer: 0, // Merchant pays fees (per requirement)
      under_paid_coverage: 2, // 2% underpayment tolerance
      callback_url: callbackUrl,
      order_id: order_id || deposit_intent_id,
      description: description || `Deposit for ${user_reference}`,
    };

    console.log("Creating OxaPay payment:", oxapayPayload);

    const oxapayResponse = await fetch("https://api.oxapay.com/v1/payment/white-label", {
      method: "POST",
      headers: {
        "merchant_api_key": oxapayApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(oxapayPayload),
    });

    const oxapayResult = await oxapayResponse.json();

    console.log("OxaPay response:", oxapayResult);

    if (oxapayResult.status !== 200 || !oxapayResult.data) {
      console.error("OxaPay error:", oxapayResult);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create payment with OxaPay",
          details: oxapayResult.error || oxapayResult.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentData = oxapayResult.data;

    // Update deposit intent with payment address
    await supabase
      .from("deposit_intents")
      .update({
        deposit_address: paymentData.address,
        expires_at: new Date(paymentData.expired_at * 1000).toISOString(),
      })
      .eq("id", deposit_intent_id);

    // Create initial transaction record with PENDING status
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        merchant_id: intent.merchant_id,
        deposit_intent_id,
        coin: pay_currency.toUpperCase(),
        crypto_amount: paymentData.pay_amount,
        usd_value: amount,
        exchange_rate: paymentData.rate,
        status: "PENDING",
        user_reference,
      })
      .select()
      .single();

    if (txError) {
      console.error("Error creating transaction:", txError);
    }

    // Return payment details to client
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          track_id: paymentData.track_id,
          transaction_id: transaction?.id,
          address: paymentData.address,
          pay_amount: paymentData.pay_amount,
          pay_currency: paymentData.pay_currency,
          network: paymentData.network,
          qr_code: paymentData.qr_code,
          rate: paymentData.rate,
          expires_at: new Date(paymentData.expired_at * 1000).toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
