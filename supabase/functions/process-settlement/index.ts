import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessSettlementRequest {
  settlementId: string;
  action: "approve" | "reject" | "complete";
  txHash?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ProcessSettlementRequest = await req.json();
    const { settlementId, action, txHash } = body;

    if (!settlementId || !action) {
      return new Response(
        JSON.stringify({ error: "settlementId and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the settlement
    const { data: settlement, error: fetchError } = await supabase
      .from("settlements")
      .select("*, merchants(name, webhook_url)")
      .eq("id", settlementId)
      .single();

    if (fetchError || !settlement) {
      return new Response(
        JSON.stringify({ error: "Settlement not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let newStatus: string;
    let updateData: Record<string, unknown> = {
      processed_at: new Date().toISOString(),
      processed_by: userId,
    };

    switch (action) {
      case "approve":
        if (settlement.status !== "PENDING") {
          return new Response(
            JSON.stringify({ error: "Only pending settlements can be approved" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        newStatus = "APPROVED";
        break;

      case "reject":
        if (settlement.status !== "PENDING") {
          return new Response(
            JSON.stringify({ error: "Only pending settlements can be rejected" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        newStatus = "REJECTED";
        break;

      case "complete":
        if (settlement.status !== "APPROVED") {
          return new Response(
            JSON.stringify({ error: "Only approved settlements can be completed" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!txHash) {
          return new Response(
            JSON.stringify({ error: "txHash is required to complete a settlement" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        newStatus = "COMPLETED";
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    updateData.status = newStatus;

    // Update settlement
    const { data: updatedSettlement, error: updateError } = await supabase
      .from("settlements")
      .update(updateData)
      .eq("id", settlementId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // If completing, create ledger entry for the settlement debit
    if (action === "complete") {
      // Create a pseudo-transaction for ledger reference
      const { data: pseudoTx, error: txError } = await supabase
        .from("transactions")
        .insert({
          merchant_id: settlement.merchant_id,
          coin: settlement.coin,
          crypto_amount: settlement.amount,
          usd_value: settlement.usd_value_at_request,
          exchange_rate: settlement.usd_value_at_request / settlement.amount,
          status: "SETTLED",
          user_reference: `settlement_${settlementId}`,
          tx_hash: txHash,
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) {
        console.error("Error creating settlement transaction:", txError);
      } else {
        // Create ledger entry for settlement debit
        await supabase.from("ledger_entries").insert({
          transaction_id: pseudoTx.id,
          merchant_id: settlement.merchant_id,
          coin: settlement.coin,
          entry_type: "DEBIT",
          category: "SETTLEMENT",
          amount: settlement.amount,
          usd_value_at_time: settlement.usd_value_at_request,
          description: `Settlement to ${settlement.wallet_address.slice(0, 10)}...`,
        });
      }

      // Create audit log
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "SETTLEMENT_COMPLETED",
        entity_type: "settlement",
        entity_id: settlementId,
        details: {
          amount: settlement.amount,
          coin: settlement.coin,
          wallet_address: settlement.wallet_address,
          tx_hash: txHash,
        },
      });
    }

    // Send webhook notification to merchant
    const merchantData = settlement.merchants as { name: string; webhook_url: string | null } | null;
    if (merchantData?.webhook_url) {
      try {
        const webhookPayload = {
          event: `settlement.${action}d`,
          settlement_id: settlementId,
          status: newStatus,
          coin: settlement.coin,
          amount: settlement.amount,
          usd_value: settlement.usd_value_at_request,
          wallet_address: settlement.wallet_address,
          processed_at: updateData.processed_at,
          ...(txHash && { tx_hash: txHash }),
        };

        const webhookResponse = await fetch(merchantData.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        // Log webhook
        await supabase.from("webhook_logs").insert({
          merchant_id: settlement.merchant_id,
          event_type: `settlement.${action}d`,
          payload: webhookPayload,
          response_status: webhookResponse.status,
        });
      } catch (webhookError) {
        console.error("Webhook error:", webhookError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        settlement: updatedSettlement,
        message: `Settlement ${action}d successfully`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing settlement:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
