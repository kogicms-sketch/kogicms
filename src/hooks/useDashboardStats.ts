import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

export const useDashboardStats = (organizationId?: string | null) => {
  return useQuery({
    queryKey: ["dashboard", "stats", organizationId],
    queryFn: async () => {
      // Build queries with optional org filter
      // Build queries with optional org filter
      // Organizations table does not have 'status' column in current schema
      let orgsQuery = supabase.from("organizations").select("id", { count: "exact" });
      let membersQuery = supabase.from("members").select("id, status, is_verified", { count: "exact" });
      let activitiesQuery = supabase.from("activities").select("id, status", { count: "exact" });

      if (organizationId) {
        orgsQuery = orgsQuery.eq("id", organizationId);
        membersQuery = membersQuery.or(`organization_id.eq.${organizationId},support_group_id.eq.${organizationId}`);
        activitiesQuery = activitiesQuery.eq("organization_id", organizationId);
      }

      // Fetch all counts in parallel
      const [orgsResult, membersResult, activitiesResult] = await Promise.all([
        orgsQuery,
        membersQuery,
        activitiesQuery,
      ]);

      if (orgsResult.error) throw orgsResult.error;
      if (membersResult.error) throw membersResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      const organizations = {
        total: orgsResult.data?.length || 0,
        active: orgsResult.data?.length || 0, // Assume all are active
      };

      const members = {
        total: membersResult.data?.length || 0,
        active: membersResult.data?.filter((m) => m.status === "active").length || 0,
        verified: membersResult.data?.filter((m) => m.is_verified === true).length || 0,
        pending: membersResult.data?.filter((m) => m.is_verified === false || m.is_verified === null).length || 0,
      };

      const activities = {
        total: activitiesResult.data?.length || 0,
        ongoing: activitiesResult.data?.filter((a) => a.status === "ongoing").length || 0,
        planned: activitiesResult.data?.filter((a) => a.status === "planned").length || 0,
        completed: activitiesResult.data?.filter((a) => a.status === "completed").length || 0,
      };

      // Calculate engagement rate (active members / total members)
      const engagementRate = members.total > 0
        ? ((members.active / members.total) * 100).toFixed(1)
        : "0";

      return {
        organizations,
        members,
        activities,
        engagementRate,
      };
    },
  });
};
