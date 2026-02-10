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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Only admins can manage agents
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: requestingUser.id,
      _role: "admin"
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can manage agents" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action, agent_id, new_password } = await req.json();

    if (!agent_id) {
      return new Response(JSON.stringify({ error: "Agent ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the agent's user_id
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("user_id")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const agentUserId = agent.user_id;

    if (action === "update_password") {
      if (!new_password || new_password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(agentUserId, {
        password: new_password
      });

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Password updated successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } else if (action === "delete") {
      // Delete agent_merchants links
      await supabase.from("agent_merchants").delete().eq("agent_id", agent_id);

      // Delete agent record
      await supabase.from("agents").delete().eq("id", agent_id);

      // Delete user role
      await supabase.from("user_roles").delete().eq("user_id", agentUserId);

      // Delete auth user
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(agentUserId);
      if (deleteUserError) {
        console.error("Error deleting auth user:", deleteUserError);
      }

      return new Response(JSON.stringify({ success: true, message: "Agent deleted successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use 'update_password' or 'delete'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
