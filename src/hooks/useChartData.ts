import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { startOfMonth, subMonths, format } from "date-fns";

interface MonthlyData {
  month: string;
  members: number;
  activities: number;
}

interface LGAData {
  lga: string;
  members: number;
}

export const useChartData = (organizationId?: string | null) => {
  // Fetch monthly growth data for the last 8 months
  const monthlyGrowth = useQuery({
    queryKey: ["chart", "monthly-growth", organizationId],
    queryFn: async () => {
      const months: MonthlyData[] = [];
      const now = new Date();

      // Get data for the last 8 months
      for (let i = 7; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        const monthLabel = format(monthStart, "MMM");

        // Count members created before or during this month
        let membersQuery = supabase
          .from("members")
          .select("id", { count: "exact" })
          .lte("created_at", monthEnd.toISOString());

        let activitiesQuery = supabase
          .from("activities")
          .select("id", { count: "exact" })
          .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
          .lt("scheduled_date", format(monthEnd, "yyyy-MM-dd"));

        if (organizationId) {
          membersQuery = membersQuery.eq("organization_id", organizationId);
          activitiesQuery = activitiesQuery.eq("organization_id", organizationId);
        }

        const [membersResult, activitiesResult] = await Promise.all([
          membersQuery,
          activitiesQuery,
        ]);

        months.push({
          month: monthLabel,
          members: membersResult.data?.length || 0,
          activities: activitiesResult.data?.length || 0,
        });
      }

      return months;
    },
  });

  // Fetch member distribution by LGA
  const lgaDistribution = useQuery({
    queryKey: ["chart", "lga-distribution", organizationId],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select("lga");

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by LGA
      const lgaCounts: Record<string, number> = {};

      data?.forEach((member) => {
        const lga = member.lga || "Unknown";
        lgaCounts[lga] = (lgaCounts[lga] || 0) + 1;
      });

      // Convert to array and sort by count
      const lgaData: LGAData[] = Object.entries(lgaCounts)
        .map(([lga, members]) => ({ lga, members }))
        .sort((a, b) => b.members - a.members);

      return lgaData;
    },
  });

  // Fetch organization type distribution
  const organizationDistribution = useQuery({
    queryKey: ["chart", "organization-distribution", organizationId],
    queryFn: async () => {
      let query = supabase.from("organizations").select("type");

      if (organizationId) {
        query = query.eq("id", organizationId); // If org admin, they only see their own org type? Or should this be for Super Admin? 
        // Actually reports might be global for Super Admin.
        // If organizationId is passed, useUserOrganization check might be needed if they can see others.
        // Assuming "Reports" for Org Admin shows their own stats, but "Organization Types" chart implies breakdown of SUB-orgs or just their own type (which is 1 data point).
        // If Org Admin, maybe this chart isn't relevant or shows something else.
        // For now, let's assume Super Admin sees all, Org Admin sees filtered (which might be just 1).
      }

      const { data, error } = await query;

      if (error) throw error;

      const typeCounts: Record<string, number> = {};
      data?.forEach((org) => {
        const type = org.type || "Unknown";
        // Normalize type names for display
        const displayType = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
        typeCounts[displayType] = (typeCounts[displayType] || 0) + 1;
      });

      const chartData = Object.entries(typeCounts).map(([name, value], index) => {
        // Generate consistent colors
        const colors = [
          "hsl(220, 60%, 12%)",
          "hsl(0, 75%, 50%)",
          "hsl(145, 65%, 42%)",
          "hsl(38, 95%, 55%)",
          "hsl(220, 40%, 50%)",
        ];
        return {
          name,
          value,
          color: colors[index % colors.length],
        };
      });

      return chartData;
    },
  });

  return {
    monthlyGrowth,
    lgaDistribution,
    organizationDistribution,
  };
};
