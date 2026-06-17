import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      organization,
      adminEmail,
      adminPassword,
      adminName,
      support_group_id
    } = await req.json();

    console.log("Creating organization admin:", { adminEmail, adminName, orgName: organization.name, support_group_id });

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log("User created with ID:", userId);

    let orgId = support_group_id;

    // 2. Create the organization if one wasn't provided
    if (!orgId) {
      console.log("No support_group_id provided. Creating new organization...");
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: organization.name,
          type: organization.type,
          description: organization.description,
          state: organization.state,
          lga: organization.lga,
          ward: organization.ward,
          leader_name: adminName,
          leader_email: adminEmail,
          leader_phone: organization.leader_phone,
          created_by: userId,
        })
        .select()
        .single();

      if (orgError) {
        console.error("Organization error:", orgError);
        // Cleanup: delete the user we just created to allow retry
        await supabaseAdmin.auth.admin.deleteUser(userId);

        return new Response(
          JSON.stringify({ error: `Failed to create organization: ${orgError.message}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      orgId = orgData.id;
      console.log("Organization created:", orgId);
    } else {
      console.log("Using existing organization ID:", orgId);
    }

    // 3. Add user role as org_admin - Update profiles table
    // We try to update. If rows affected is 0, we insert.
    // Note: select('id', { count: 'exact' }) returns count of rows matched/updated
    const { error: roleError, data: updateData } = await supabaseAdmin
      .from("profiles")
      .update({ role: "org_admin" })
      .eq("id", userId)
      .select('id');

    const count = updateData?.length ?? 0;

    console.log(`Profile update count: ${count}`);

    if (roleError || count === 0) {
      if (roleError) console.error("Role update error:", roleError);

      console.log("Profile not found or update failed. Attempting insert profile...");
      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          role: "org_admin",
          full_name: adminName,
          phone_number: organization.leader_phone || null,
        });

      if (insertError) {
        console.error("Profile insert error:", insertError);
        // Ensure we don't return error here, as main operations succeeded.
        // We just log it.
      } else {
        console.log("Profile inserted successfully.");
      }
    }

    // 4. Add user as organization admin
    const { error: adminError } = await supabaseAdmin
      .from("organization_admins")
      .insert({
        user_id: userId,
        organization_id: orgId,
      });

    if (adminError) {
      console.error("Admin assignment error:", adminError);
    }

    console.log("Organization admin setup complete");

    return new Response(
      JSON.stringify({
        success: true,
        organizationId: orgId,
        userId: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
