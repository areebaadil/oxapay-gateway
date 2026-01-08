import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateApiKey,
  getApiKeyFromRequest,
  corsHeaders,
  unauthorizedResponse,
  errorResponse,
  successResponse,
  type MerchantContext,
} from "../_shared/api-key-auth.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = getApiKeyFromRequest(req);
    if (!apiKey) {
      return unauthorizedResponse("API key required. Use Authorization: Bearer <key> or X-API-Key header");
    }

    const merchant = await validateApiKey(apiKey);
    if (!merchant) {
      return unauthorizedResponse("Invalid or inactive API key");
    }

    // Parse URL to determine endpoint
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path: /merchant-api/{resource}/{id?}
    const resource = pathParts[1] || "";
    const resourceId = pathParts[2];

    // Route to appropriate handler
    switch (resource) {
      case "payments":
        return handlePayments(req, merchant, resourceId);
      case "transactions":
        return handleTransactions(req, merchant, resourceId, url);
      case "balance":
        return handleBalance(req, merchant);
      case "info":
        return handleMerchantInfo(req, merchant);
      default:
        return errorResponse(`Unknown resource: ${resource}. Available: payments, transactions, balance, info`, 404);
    }
  } catch (error) {
    console.error("Merchant API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
});

// ============ PAYMENTS HANDLER ============
async function handlePayments(req: Request, merchant: MerchantContext, paymentId?: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const oxapayApiKey = Deno.env.get("OXAPAY_MERCHANT_API_KEY");

  if (req.method === "POST" && !paymentId) {
    // Create new payment
    if (!oxapayApiKey) {
      return errorResponse("Payment processor not configured", 500);
    }

    const body = await req.json();
    const { amount, currency = "USD", pay_currency, network, order_id, description, callback_url } = body;

    if (!amount || !pay_currency) {
      return errorResponse("Required fields: amount, pay_currency");
    }

    // Create deposit intent
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const { data: intent, error: intentError } = await supabase
      .from("deposit_intents")
      .insert({
        merchant_id: merchant.merchantId,
        user_reference: order_id || `order_${Date.now()}`,
        coin: pay_currency.toUpperCase(),
        expected_amount: amount,
        callback_url: callback_url || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (intentError) {
      console.error("Intent creation error:", intentError);
      return errorResponse("Failed to create payment intent");
    }

    // Network mapping
    const networkMap: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "ERC20",
      USDT: "TRC20",
      USDC: "ERC20",
      LTC: "Litecoin",
      TRX: "TRC20",
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/oxapay-webhook`;

    // Create OxaPay payment
    const oxapayPayload = {
      amount,
      currency,
      pay_currency: pay_currency.toUpperCase(),
      network: network || networkMap[pay_currency.toUpperCase()],
      lifetime: 60,
      fee_paid_by_payer: 0,
      under_paid_coverage: 2,
      callback_url: webhookUrl,
      order_id: intent.id,
      description: description || `Payment for ${merchant.merchantName}`,
    };

    const oxapayResponse = await fetch("https://api.oxapay.com/v1/payment/white-label", {
      method: "POST",
      headers: {
        merchant_api_key: oxapayApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(oxapayPayload),
    });

    const oxapayResult = await oxapayResponse.json();

    if (oxapayResult.status !== 200 || !oxapayResult.data) {
      console.error("OxaPay error:", oxapayResult);
      return errorResponse("Failed to create payment with processor", 500);
    }

    const paymentData = oxapayResult.data;

    // Update deposit intent with address
    await supabase
      .from("deposit_intents")
      .update({
        deposit_address: paymentData.address,
        expires_at: new Date(paymentData.expired_at * 1000).toISOString(),
      })
      .eq("id", intent.id);

    // Create transaction record
    const { data: transaction } = await supabase
      .from("transactions")
      .insert({
        merchant_id: merchant.merchantId,
        deposit_intent_id: intent.id,
        coin: pay_currency.toUpperCase(),
        crypto_amount: paymentData.pay_amount,
        usd_value: amount,
        exchange_rate: paymentData.rate,
        status: "PENDING",
        user_reference: order_id || intent.id,
      })
      .select()
      .single();

    return successResponse({
      payment_id: intent.id,
      transaction_id: transaction?.id,
      track_id: paymentData.track_id,
      address: paymentData.address,
      amount: paymentData.pay_amount,
      currency: paymentData.pay_currency,
      network: paymentData.network,
      qr_code: paymentData.qr_code,
      rate: paymentData.rate,
      expires_at: new Date(paymentData.expired_at * 1000).toISOString(),
    }, 201);
  }

  if (req.method === "GET" && paymentId) {
    // Get payment status
    const { data: intent, error } = await supabase
      .from("deposit_intents")
      .select("*, transactions(*)")
      .eq("id", paymentId)
      .eq("merchant_id", merchant.merchantId)
      .maybeSingle();

    if (error || !intent) {
      return errorResponse("Payment not found", 404);
    }

    const transaction = Array.isArray(intent.transactions) 
      ? intent.transactions[0] 
      : intent.transactions;

    return successResponse({
      payment_id: intent.id,
      status: transaction?.status || "PENDING",
      coin: intent.coin,
      expected_amount: intent.expected_amount,
      deposit_address: intent.deposit_address,
      expires_at: intent.expires_at,
      created_at: intent.created_at,
      transaction: transaction ? {
        id: transaction.id,
        crypto_amount: transaction.crypto_amount,
        usd_value: transaction.usd_value,
        exchange_rate: transaction.exchange_rate,
        tx_hash: transaction.tx_hash,
        confirmed_at: transaction.confirmed_at,
      } : null,
    });
  }

  if (req.method === "GET" && !paymentId) {
    // List payments
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const status = url.searchParams.get("status");

    let query = supabase
      .from("deposit_intents")
      .select("*, transactions(*)", { count: "exact" })
      .eq("merchant_id", merchant.merchantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: intents, error, count } = await query;

    if (error) {
      return errorResponse("Failed to fetch payments");
    }

    const payments = intents?.map((intent) => {
      const transaction = Array.isArray(intent.transactions)
        ? intent.transactions[0]
        : intent.transactions;
      return {
        payment_id: intent.id,
        status: transaction?.status || "PENDING",
        coin: intent.coin,
        expected_amount: intent.expected_amount,
        deposit_address: intent.deposit_address,
        expires_at: intent.expires_at,
        created_at: intent.created_at,
      };
    });

    return successResponse({
      payments,
      pagination: { total: count, limit, offset },
    });
  }

  return errorResponse("Method not allowed", 405);
}

// ============ TRANSACTIONS HANDLER ============
async function handleTransactions(req: Request, merchant: MerchantContext, txId?: string, url?: URL) {
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (txId) {
    // Get single transaction
    const { data: tx, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", txId)
      .eq("merchant_id", merchant.merchantId)
      .maybeSingle();

    if (error || !tx) {
      return errorResponse("Transaction not found", 404);
    }

    return successResponse({
      id: tx.id,
      coin: tx.coin,
      crypto_amount: tx.crypto_amount,
      usd_value: tx.usd_value,
      exchange_rate: tx.exchange_rate,
      status: tx.status,
      tx_hash: tx.tx_hash,
      user_reference: tx.user_reference,
      created_at: tx.created_at,
      confirmed_at: tx.confirmed_at,
    });
  }

  // List transactions
  const limit = parseInt(url?.searchParams.get("limit") || "20");
  const offset = parseInt(url?.searchParams.get("offset") || "0");
  const status = url?.searchParams.get("status");
  const coin = url?.searchParams.get("coin");

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchant.merchantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (coin) query = query.eq("coin", coin.toUpperCase());

  const { data: transactions, error, count } = await query;

  if (error) {
    return errorResponse("Failed to fetch transactions");
  }

  return successResponse({
    transactions: transactions?.map((tx) => ({
      id: tx.id,
      coin: tx.coin,
      crypto_amount: tx.crypto_amount,
      usd_value: tx.usd_value,
      exchange_rate: tx.exchange_rate,
      status: tx.status,
      tx_hash: tx.tx_hash,
      user_reference: tx.user_reference,
      created_at: tx.created_at,
      confirmed_at: tx.confirmed_at,
    })),
    pagination: { total: count, limit, offset },
  });
}

// ============ BALANCE HANDLER ============
async function handleBalance(req: Request, merchant: MerchantContext) {
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get ledger entries grouped by coin
  const { data: entries, error } = await supabase
    .from("ledger_entries")
    .select("coin, entry_type, amount, usd_value_at_time")
    .eq("merchant_id", merchant.merchantId);

  if (error) {
    return errorResponse("Failed to fetch balance");
  }

  // Calculate balances per coin
  const balances: Record<string, { amount: number; usd_value: number }> = {};
  
  for (const entry of entries || []) {
    if (!balances[entry.coin]) {
      balances[entry.coin] = { amount: 0, usd_value: 0 };
    }
    const multiplier = entry.entry_type === "CREDIT" ? 1 : -1;
    balances[entry.coin].amount += parseFloat(entry.amount) * multiplier;
    balances[entry.coin].usd_value += parseFloat(entry.usd_value_at_time) * multiplier;
  }

  // Get current exchange rates
  const { data: rates } = await supabase.from("exchange_rates").select("*");
  const rateMap: Record<string, number> = {};
  for (const r of rates || []) {
    rateMap[r.coin] = parseFloat(r.usd_rate);
  }

  // Calculate current USD values
  const balanceArray = Object.entries(balances).map(([coin, bal]) => ({
    coin,
    amount: bal.amount,
    usd_value_at_deposit: bal.usd_value,
    current_usd_value: bal.amount * (rateMap[coin] || 0),
  }));

  const totalUsdValue = balanceArray.reduce((sum, b) => sum + b.current_usd_value, 0);

  return successResponse({
    balances: balanceArray,
    total_usd_value: totalUsdValue,
  });
}

// ============ MERCHANT INFO HANDLER ============
async function handleMerchantInfo(req: Request, merchant: MerchantContext) {
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  return successResponse({
    merchant_id: merchant.merchantId,
    name: merchant.merchantName,
    fee_percentage: merchant.feePercentage,
    is_enabled: merchant.isEnabled,
  });
}
