import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, hmac",
};

// OxaPay payment statuses
type OxaPayStatus = "Waiting" | "Confirming" | "Paid" | "Failed" | "Expired";

interface OxaPayWebhookPayload {
  status: OxaPayStatus;
  trackId: string;
  address?: string;
  senderAddress?: string;
  txID?: string;
  amount: string;
  currency: string;
  price?: string;
  payAmount?: string;
  payCurrency?: string;
  network?: string;
  feePaidByPayer: number;
  underPaidCover: number;
  email?: string;
  orderId: string;
  description?: string;
  date: string;
  payDate?: string;
  type: "payment" | "payout";
}

// Validate HMAC signature from OxaPay using Web Crypto API
async function validateHmacSignature(payload: string, receivedHmac: string, secretKey: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const data = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  const calculatedHmac = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return calculatedHmac === receivedHmac;
}

// Map OxaPay status to our transaction status
function mapStatus(oxaStatus: OxaPayStatus): "PENDING" | "CONFIRMED" | "FAILED" | "EXPIRED" {
  switch (oxaStatus) {
    case "Waiting":
    case "Confirming":
      return "PENDING";
    case "Paid":
      return "CONFIRMED";
    case "Failed":
      return "FAILED";
    case "Expired":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

// Send webhook to a URL and return the response status
async function sendWebhook(
  url: string,
  eventType: string,
  payload: Record<string, unknown>,
  transactionId: string,
): Promise<number | null> {
  let responseStatus: number | null = null;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": eventType,
        "X-Webhook-ID": transactionId,
      },
      body: JSON.stringify(payload),
    });
    responseStatus = response.status;
    console.log(`Webhook sent to ${url}, status: ${responseStatus}`);
  } catch (err) {
    console.error(`Error sending webhook to ${url}:`, err);
  }
  return responseStatus;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const oxapayApiKey = Deno.env.get("OXAPAY_MERCHANT_API_KEY");

    if (!oxapayApiKey) {
      console.error("OXAPAY_MERCHANT_API_KEY not configured");
      return new Response("Configuration error", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for HMAC validation
    const rawBody = await req.text();
    const hmacHeader = req.headers.get("hmac") || req.headers.get("HMAC");

    console.log("Received OxaPay webhook:", rawBody);
    console.log("HMAC header:", hmacHeader);

    // Validate HMAC signature
    if (hmacHeader) {
      const isValid = await validateHmacSignature(rawBody, hmacHeader, oxapayApiKey);
      if (!isValid) {
        console.error("Invalid HMAC signature");
        return new Response("Invalid signature", { status: 400 });
      }
      console.log("HMAC signature validated");
    } else {
      console.warn("No HMAC header received - proceeding without validation for testing");
    }

    // Parse webhook payload
    const payload: OxaPayWebhookPayload = JSON.parse(rawBody);

    // Only process payment webhooks
    if (payload.type !== "payment") {
      console.log("Ignoring non-payment webhook:", payload.type);
      return new Response("ok", { status: 200 });
    }

    const { 
      status: oxaStatus, 
      trackId, 
      orderId, 
      txID, 
      payAmount, 
      payCurrency,
      price,
      senderAddress,
    } = payload;

    console.log(`Processing payment webhook: trackId=${trackId}, status=${oxaStatus}, orderId=${orderId}`);

    // Map to our status
    const newStatus = mapStatus(oxaStatus);

    // Find the transaction by deposit_intent_id (orderId)
    const { data: transaction, error: txFindError } = await supabase
      .from("transactions")
      .select("*, deposit_intents(*, merchants(*))")
      .eq("deposit_intent_id", orderId)
      .maybeSingle();

    if (txFindError) {
      console.error("Error finding transaction:", txFindError);
      return new Response("Database error", { status: 500 });
    }

    if (!transaction) {
      console.error("Transaction not found for orderId:", orderId);
      return new Response("ok", { status: 200 });
    }

    // Update transaction
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (txID) {
      updateData.tx_hash = txID;
    }

    if (newStatus === "CONFIRMED") {
      updateData.confirmed_at = new Date().toISOString();
      if (payAmount) {
        updateData.crypto_amount = parseFloat(payAmount);
      }
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", transaction.id);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      return new Response("Database error", { status: 500 });
    }

    console.log(`Transaction ${transaction.id} updated to status: ${newStatus}`);

    // Extract deposit intent and merchant info
    const depositIntent = transaction.deposit_intents as {
      callback_url?: string | null;
      success_url?: string | null;
      failure_url?: string | null;
      merchants?: {
        deposit_fee_percentage?: number;
        webhook_url?: string | null;
      } | null;
    } | null;

    const merchant = depositIntent?.merchants;
    const callbackUrl = depositIntent?.callback_url;
    const merchantWebhookUrl = merchant?.webhook_url;

    // Determine all webhook URLs to notify (deduplicated)
    const webhookUrls = new Set<string>();
    if (merchantWebhookUrl) webhookUrls.add(merchantWebhookUrl);
    if (callbackUrl) webhookUrls.add(callbackUrl);

    // If payment is CONFIRMED, create ledger entries
    if (newStatus === "CONFIRMED" && transaction.status !== "CONFIRMED") {
      const feePercentage = merchant?.deposit_fee_percentage || 1.5;
      const cryptoAmount = parseFloat(payAmount || String(transaction.crypto_amount));
      const usdValue = parseFloat(price || String(transaction.usd_value));
      const feeAmount = cryptoAmount * (feePercentage / 100);
      const feeUsdValue = usdValue * (feePercentage / 100);

      // Create ledger entries (double-entry style)
      const ledgerEntries = [
        {
          transaction_id: transaction.id,
          merchant_id: transaction.merchant_id,
          coin: transaction.coin,
          entry_type: "CREDIT",
          category: "DEPOSIT",
          amount: cryptoAmount,
          usd_value_at_time: usdValue,
          description: `Deposit from ${transaction.user_reference}`,
        },
        {
          transaction_id: transaction.id,
          merchant_id: transaction.merchant_id,
          coin: transaction.coin,
          entry_type: "DEBIT",
          category: "FEE",
          amount: feeAmount,
          usd_value_at_time: feeUsdValue,
          description: `Platform fee (${feePercentage}%)`,
        },
      ];

      const { error: ledgerError } = await supabase
        .from("ledger_entries")
        .insert(ledgerEntries);

      if (ledgerError) {
        console.error("Error creating ledger entries:", ledgerError);
      } else {
        console.log("Ledger entries created for transaction:", transaction.id);
      }

      // Create audit log
      await supabase.from("audit_logs").insert({
        action: "PAYMENT_CONFIRMED",
        entity_type: "transaction",
        entity_id: transaction.id,
        details: {
          track_id: trackId,
          crypto_amount: cryptoAmount,
          usd_value: usdValue,
          tx_hash: txID,
          sender_address: senderAddress,
        },
      });

      // Send webhook to all configured URLs
      const webhookPayload = {
        event: "payment.confirmed",
        payment_id: orderId,
        transaction_id: transaction.id,
        status: "CONFIRMED",
        coin: transaction.coin,
        crypto_amount: cryptoAmount,
        usd_value: usdValue,
        tx_hash: txID,
        user_reference: transaction.user_reference,
        confirmed_at: new Date().toISOString(),
      };

      for (const url of webhookUrls) {
        const responseStatus = await sendWebhook(url, "payment.confirmed", webhookPayload, transaction.id);
        
        // Log webhook attempt
        await supabase.from("webhook_logs").insert({
          merchant_id: transaction.merchant_id,
          event_type: "payment.confirmed",
          payload: webhookPayload,
          response_status: responseStatus,
          attempts: 1,
        });
      }
    }

    // Handle other status changes (failed, expired)
    if (newStatus === "FAILED" || newStatus === "EXPIRED") {
      const eventType = newStatus === "FAILED" ? "payment.failed" : "payment.expired";
      const webhookPayload = {
        event: eventType,
        payment_id: orderId,
        transaction_id: transaction.id,
        status: newStatus,
        coin: transaction.coin,
        user_reference: transaction.user_reference,
        timestamp: new Date().toISOString(),
      };

      for (const url of webhookUrls) {
        const responseStatus = await sendWebhook(url, eventType, webhookPayload, transaction.id);

        await supabase.from("webhook_logs").insert({
          merchant_id: transaction.merchant_id,
          event_type: eventType,
          payload: webhookPayload,
          response_status: responseStatus,
          attempts: 1,
        });
      }
    }

    return new Response("ok", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  } catch (error) {
    console.error("Error in oxapay-webhook:", error);
    return new Response("ok", { status: 200 });
  }
});
