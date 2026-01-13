import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an agent
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is agent
    const { data: agentRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "agent")
      .maybeSingle();

    if (!agentRole) {
      return new Response(
        JSON.stringify({ error: "Only agents can use this endpoint" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agent record
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", caller.id)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: "Agent record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agent.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Agent account is suspended" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, email, password, webhook_url, deposit_fee_percentage, withdrawal_fee_percentage } = await req.json();

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Name, email, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate fees against agent limits
    const depositFee = deposit_fee_percentage || 1.5;
    const withdrawalFee = withdrawal_fee_percentage || 1.5;

    if (depositFee > agent.max_deposit_fee_percentage) {
      return new Response(
        JSON.stringify({ error: `Deposit fee cannot exceed ${agent.max_deposit_fee_percentage}%` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (withdrawalFee > agent.max_withdrawal_fee_percentage) {
      return new Response(
        JSON.stringify({ error: `Withdrawal fee cannot exceed ${agent.max_withdrawal_fee_percentage}%` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user account
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError) {
      return new Response(
        JSON.stringify({ error: createUserError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create merchant record
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .insert({
        name,
        email,
        webhook_url: webhook_url || null,
        deposit_fee_percentage: depositFee,
        withdrawal_fee_percentage: withdrawalFee,
      })
      .select()
      .single();

    if (merchantError) {
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: merchantError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link merchant to user
    const { error: linkError } = await supabase
      .from("merchant_users")
      .insert({
        user_id: newUser.user.id,
        merchant_id: merchant.id,
      });

    if (linkError) {
      await supabase.from("merchants").delete().eq("id", merchant.id);
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link merchant to agent
    const { error: agentMerchantError } = await supabase
      .from("agent_merchants")
      .insert({
        agent_id: agent.id,
        merchant_id: merchant.id,
      });

    if (agentMerchantError) {
      await supabase.from("merchant_users").delete().eq("merchant_id", merchant.id);
      await supabase.from("merchants").delete().eq("id", merchant.id);
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: agentMerchantError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign merchant role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "merchant",
      });

    if (roleError) {
      await supabase.from("agent_merchants").delete().eq("merchant_id", merchant.id);
      await supabase.from("merchant_users").delete().eq("merchant_id", merchant.id);
      await supabase.from("merchants").delete().eq("id", merchant.id);
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: roleError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        merchant_id: merchant.id,
        user_id: newUser.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
