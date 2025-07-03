
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateCoachRequest {
  name: string;
  email: string;
  phone?: string;
  package_type?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );

    const { name, email, phone, package_type }: CreateCoachRequest = await req.json();

    // Create the user account with default password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: "TOcoachAccount!1",
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        name: name,
        role: 'coach'
      }
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      throw new Error(`Failed to create user account: ${authError.message}`);
    }

    console.log("Auth user created:", authData.user?.id);

    // Create the coach record in the coaches table
    const { data: coachData, error: coachError } = await supabaseAdmin
      .from("coaches")
      .insert({
        name: name,
        email: email,
        phone: phone || null,
        package_type: package_type || null,
        auth_id: authData.user?.id,
        role: 'coach'
      })
      .select()
      .single();

    if (coachError) {
      console.error("Coach creation error:", coachError);
      
      // If coach creation fails, clean up the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user?.id || "");
      } catch (cleanupError) {
        console.error("Failed to cleanup auth user:", cleanupError);
      }
      
      throw new Error(`Failed to create coach record: ${coachError.message}`);
    }

    console.log("Coach created successfully:", coachData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        coach: coachData,
        message: "Coach account created successfully. Default password: TOcoachAccount!1"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in create-coach-account function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to create coach account" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
