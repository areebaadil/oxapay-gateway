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

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transactionId, status, txHash } = await req.json();

    if (!transactionId || !status) {
      return new Response(JSON.stringify({ error: "Missing transactionId or status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the transaction with merchant info
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*, merchants(*)")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction status
    const updateData: Record<string, unknown> = { status };
    if (status === "CONFIRMED") {
      updateData.confirmed_at = new Date().toISOString();
    }
    if (txHash) {
      updateData.tx_hash = txHash;
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", transactionId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If CONFIRMED, create ledger entries
    if (status === "CONFIRMED" && transaction.status !== "CONFIRMED") {
      const merchant = transaction.merchants as { deposit_fee_percentage?: number } | null;
      const feePercentage = merchant?.deposit_fee_percentage || 1.5;
      const cryptoAmount = Number(transaction.crypto_amount);
      const usdValue = Number(transaction.usd_value);
      const feeAmount = cryptoAmount * (feePercentage / 100);
      const feeUsdValue = usdValue * (feePercentage / 100);

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
      }

      // Create audit log
      await supabase.from("audit_logs").insert({
        action: "MANUAL_APPROVAL",
        entity_type: "transaction",
        entity_id: transaction.id,
        user_id: user.id,
        details: {
          crypto_amount: cryptoAmount,
          usd_value: usdValue,
          fee_percentage: feePercentage,
          tx_hash: txHash,
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in approve-transaction:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
