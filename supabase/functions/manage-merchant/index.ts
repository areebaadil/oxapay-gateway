import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify the requesting user
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

    // Check if requesting user is admin or agent
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: requestingUser.id,
      _role: "admin"
    });

    const { data: isAgent } = await supabase.rpc("has_role", {
      _user_id: requestingUser.id,
      _role: "agent"
    });

    if (!isAdmin && !isAgent) {
      return new Response(JSON.stringify({ error: "Only admins and agents can manage merchants" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action, merchant_id, new_password } = await req.json();

    if (!merchant_id) {
      return new Response(JSON.stringify({ error: "Merchant ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // If agent, verify the merchant belongs to them
    if (isAgent && !isAdmin) {
      const { data: agentId } = await supabase.rpc("get_user_agent_id", {
        _user_id: requestingUser.id
      });

      const { data: belongsToAgent } = await supabase.rpc("merchant_belongs_to_agent", {
        _merchant_id: merchant_id,
        _agent_id: agentId
      });

      if (!belongsToAgent) {
        return new Response(JSON.stringify({ error: "Merchant does not belong to your account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Get the user ID associated with this merchant
    const { data: merchantUser, error: merchantUserError } = await supabase
      .from("merchant_users")
      .select("user_id")
      .eq("merchant_id", merchant_id)
      .single();

    if (merchantUserError || !merchantUser) {
      return new Response(JSON.stringify({ error: "Merchant user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const merchantUserId = merchantUser.user_id;

    if (action === "update_password") {
      if (!new_password) {
        return new Response(JSON.stringify({ error: "New password is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (new_password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(merchantUserId, {
        password: new_password
      });

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Password updated successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } else if (action === "delete") {
      // Delete in order: merchant_users, user_roles, api_keys, auth user, merchant
      
      // First, delete API keys for this merchant
      await supabase.from("api_keys").delete().eq("merchant_id", merchant_id);

      // Delete from agent_merchants if exists
      await supabase.from("agent_merchants").delete().eq("merchant_id", merchant_id);

      // Delete from merchant_users
      await supabase.from("merchant_users").delete().eq("merchant_id", merchant_id);

      // Delete user role
      await supabase.from("user_roles").delete().eq("user_id", merchantUserId);

      // Delete auth user
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(merchantUserId);
      
      if (deleteUserError) {
        console.error("Error deleting auth user:", deleteUserError);
        // Continue anyway to clean up the merchant record
      }

      // Finally delete the merchant record
      const { error: deleteMerchantError } = await supabase
        .from("merchants")
        .delete()
        .eq("id", merchant_id);

      if (deleteMerchantError) {
        return new Response(JSON.stringify({ error: deleteMerchantError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Merchant deleted successfully"
      }), {
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
