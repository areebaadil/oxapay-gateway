import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 5;
const RETRY_DELAYS = [0, 60, 300, 900, 3600]; // Immediate, 1min, 5min, 15min, 1hr

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find failed webhooks that need retry
    const { data: failedWebhooks, error: fetchError } = await supabase
      .from("webhook_logs")
      .select("*, merchants(webhook_url)")
      .or("response_status.is.null,response_status.gte.400")
      .lt("attempts", MAX_RETRIES)
      .order("last_attempt_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching webhooks:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${failedWebhooks?.length || 0} webhooks to retry`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };

    for (const webhook of failedWebhooks || []) {
      const merchant = webhook.merchants as { webhook_url?: string } | null;
      
      if (!merchant?.webhook_url) {
        console.log(`Skipping webhook ${webhook.id}: no webhook URL`);
        results.skipped++;
        continue;
      }

      // Check if enough time has passed for retry
      const lastAttempt = new Date(webhook.last_attempt_at).getTime();
      const requiredDelay = RETRY_DELAYS[Math.min(webhook.attempts, RETRY_DELAYS.length - 1)] * 1000;
      const now = Date.now();

      if (now - lastAttempt < requiredDelay) {
        console.log(`Skipping webhook ${webhook.id}: not enough time since last attempt`);
        results.skipped++;
        continue;
      }

      results.processed++;

      try {
        console.log(`Retrying webhook ${webhook.id} (attempt ${webhook.attempts + 1})`);

        const response = await fetch(merchant.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Retry": String(webhook.attempts + 1),
          },
          body: JSON.stringify(webhook.payload),
        });

        // Update webhook log
        await supabase
          .from("webhook_logs")
          .update({
            attempts: webhook.attempts + 1,
            response_status: response.status,
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", webhook.id);

        if (response.ok) {
          console.log(`Webhook ${webhook.id} succeeded on retry`);
          results.succeeded++;
        } else {
          console.log(`Webhook ${webhook.id} failed with status ${response.status}`);
          results.failed++;
        }
      } catch (error) {
        console.error(`Webhook ${webhook.id} error:`, error);
        
        // Update attempts count even on network error
        await supabase
          .from("webhook_logs")
          .update({
            attempts: webhook.attempts + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", webhook.id);
        
        results.failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in webhook-retry:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
