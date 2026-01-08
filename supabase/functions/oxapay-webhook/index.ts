import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  
  // Import key for HMAC-SHA512
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  // Calculate HMAC
  const signature = await crypto.subtle.sign("HMAC", key, data);
  
  // Convert to hex string
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
      // Still return 200 to prevent OxaPay retries
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
      
      // Update crypto amount if different (actual paid amount)
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

    // If payment is CONFIRMED, create ledger entries
    if (newStatus === "CONFIRMED" && transaction.status !== "CONFIRMED") {
      const depositIntent = transaction.deposit_intents as { merchants?: { fee_percentage?: number; webhook_url?: string } } | null;
      const merchant = depositIntent?.merchants;
      const feePercentage = merchant?.fee_percentage || 1.5;
      const cryptoAmount = parseFloat(payAmount || String(transaction.crypto_amount));
      const usdValue = parseFloat(price || String(transaction.usd_value));
      const feeAmount = cryptoAmount * (feePercentage / 100);
      const feeUsdValue = usdValue * (feePercentage / 100);

      // Create ledger entries (double-entry style)
      const ledgerEntries = [
        // Merchant gross credit (full deposit)
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
        // Merchant fee debit
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

      // Send webhook to merchant if configured
      if (merchant?.webhook_url) {
        try {
          const webhookPayload = {
            event: "deposit.confirmed",
            data: {
              transaction_id: transaction.id,
              deposit_intent_id: orderId,
              coin: transaction.coin,
              crypto_amount: cryptoAmount,
              usd_value: usdValue,
              tx_hash: txID,
              user_reference: transaction.user_reference,
              status: "CONFIRMED",
              confirmed_at: new Date().toISOString(),
            },
          };

          const webhookBody = JSON.stringify(webhookPayload);

          const webhookResponse = await fetch(merchant.webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: webhookBody,
          });

          // Log webhook attempt
          await supabase.from("webhook_logs").insert({
            merchant_id: transaction.merchant_id,
            event_type: "deposit.confirmed",
            payload: webhookPayload,
            response_status: webhookResponse.status,
          });

          console.log(`Merchant webhook sent to ${merchant.webhook_url}, status: ${webhookResponse.status}`);
        } catch (webhookError) {
          console.error("Error sending merchant webhook:", webhookError);
          
          // Log failed webhook
          await supabase.from("webhook_logs").insert({
            merchant_id: transaction.merchant_id,
            event_type: "deposit.confirmed",
            payload: { error: "Failed to send webhook" },
            response_status: null,
          });
        }
      }
    }

    // Return OK to OxaPay
    return new Response("ok", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  } catch (error) {
    console.error("Error in oxapay-webhook:", error);
    // Still return 200 to prevent excessive retries
    return new Response("ok", { status: 200 });
  }
});
