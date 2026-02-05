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

    const users = [
      { 
        email: "admin@cryptogate.com", 
        password: "Admin123!", 
        role: "admin" as const,
        name: "System Admin"
      },
      { 
        email: "merchant@techstore.com", 
        password: "Merchant123!", 
        role: "merchant" as const,
        merchantId: "a1111111-1111-1111-1111-111111111111",
        name: "TechStore Admin"
      }
    ];

    const results = [];

    for (const userData of users) {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (authError) {
        if (authError.message.includes("already been registered")) {
          results.push({ email: userData.email, status: "already exists" });
          continue;
        }
        throw authError;
      }

      const userId = authData.user.id;

      // Assign role
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: userData.role
      });

      // Create profile based on role
      if (userData.role === "admin") {
        await supabase.from("admin_profiles").insert({
          user_id: userId,
          name: userData.name
        });
      } else if (userData.role === "merchant" && userData.merchantId) {
        await supabase.from("merchant_users").insert({
          user_id: userId,
          merchant_id: userData.merchantId
        });
      }

      results.push({ email: userData.email, status: "created", role: userData.role });
    }

    return new Response(JSON.stringify({ success: true, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
