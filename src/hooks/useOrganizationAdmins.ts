import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

export interface OrganizationAdmin {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role: string | null;
  account_status: string;
  organization_id: string | null;
  organization_name: string | null;
  created_at: string | null;
  has_profile: boolean; // Debug flag
}

export const useOrganizationAdmins = () => {
  return useQuery({
    queryKey: ["organization-admins"],
    queryFn: async () => {
      // Step 1: Get all user IDs that have the 'org_admin' role
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "org_admin");

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
        throw rolesError;
      }

      if (!userRoles || userRoles.length === 0) return [];

      const adminUserIds = userRoles.map((ur) => ur.user_id);

      // Step 2: Fetch profiles for these users (Best effort)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", adminUserIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // We continue even if profiles fail, to show the users exist
      }

      // Step 3: Fetch organization connections for these users
      const { data: orgAdmins, error: orgAdminsError } = await supabase
        .from("organization_admins")
        .select("user_id, organization_id")
        .in("user_id", adminUserIds);

      // Step 4: Fetch Organization Names
      const orgIds = orgAdmins?.map(oa => oa.organization_id) || [];
      let orgNameMap = new Map();

      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);

        orgs?.forEach(org => {
          orgNameMap.set(org.id, org.name);
        });
      }

      // Create lookup maps
      const orgAdminMap = new Map();
      orgAdmins?.forEach(oa => {
        orgAdminMap.set(oa.user_id, oa.organization_id);
      });

      const profileMap = new Map();
      profiles?.forEach(p => {
        profileMap.set(p.id, p);
      });

      // Join data - Iterate over userRoles to ensure we show EVERY admin
      return userRoles.map((ur) => {
        const userId = ur.user_id;
        const profile = profileMap.get(userId);
        const orgId = orgAdminMap.get(userId);
        const orgName = orgId ? orgNameMap.get(orgId) : null;

        return {
          id: userId,
          full_name: profile?.full_name || "Unknown Profile (Missing)",
          phone_number: profile?.phone_number || "N/A",
          role: 'org_admin',
          account_status: profile?.account_status || 'active', // Default to active if profile missing
          organization_id: orgId || null,
          organization_name: orgName || null,
          created_at: profile?.created_at || ur.created_at, // Fallback to role creation time
          has_profile: !!profile
        };
      }) as OrganizationAdmin[];
    },
  });
};
