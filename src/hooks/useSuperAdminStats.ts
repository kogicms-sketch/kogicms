import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { startOfMonth, subMonths, format, startOfWeek, subWeeks, subDays } from "date-fns";

export const useSuperAdminStats = () => {
    return useQuery({
        queryKey: ["super-admin", "stats"],
        queryFn: async () => {
            // Check for mock session
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token === "mock-token") {
                const today = new Date();
                const memberGrowthData = [];
                for (let i = 5; i >= 0; i--) {
                    memberGrowthData.push({
                        name: format(subMonths(today, i), "MMM"),
                        value: Math.floor(1000 + (Math.random() * 500 * (6 - i)))
                    });
                }

                const activityTrendData = [];
                for (let i = 6; i >= 0; i--) {
                    activityTrendData.push({
                        name: format(subDays(today, i), "EEE"),
                        value: Math.floor(Math.random() * 50) + 10
                    });
                }

                return {
                    counts: {
                        organizations: 42,
                        members: 15420,
                        activities: 328,
                        messages: 1250,
                        activeOrgs: 38
                    },
                    charts: {
                        memberGrowth: memberGrowthData,
                        activityTrends: activityTrendData
                    }
                };
            }

            // 1. Fetch Headline Stats (Efficient Counts)
            const [orgsCount, membersCount, activitiesCount, messagesCount] = await Promise.all([
                supabase.from("organizations").select("*", { count: "exact", head: true }),
                supabase.from("members").select("*", { count: "exact", head: true }),
                supabase.from("activities").select("*", { count: "exact", head: true }),
                supabase.from("messages").select("*", { count: "exact", head: true }),
            ]);

            // 2. Process Member Growth (Last 6 months)
            const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
            const membersTrend = await supabase
                .from("members")
                .select("created_at")
                .gte("created_at", sixMonthsAgo);

            if (membersTrend.error) console.error("Error fetching member trend:", membersTrend.error);

            const memberGrowthData = [];
            const today = new Date();
            for (let i = 5; i >= 0; i--) {
                const date = subMonths(today, i);
                const monthLabel = format(date, "MMM");

                // Cumulative count relative to the fetched window (approximate for trend)
                // For strict accuracy we'd need a different approach, but this shows recent growth
                const count = membersTrend.data?.filter(m =>
                    new Date(m.created_at) <= new Date(date.getFullYear(), date.getMonth() + 1, 0)
                ).length || 0;

                memberGrowthData.push({ name: monthLabel, value: count });
            }

            // 3. Process Activity Trends (Last 7 days)
            const sevenDaysAgo = subDays(new Date(), 7).toISOString();
            const activitiesTrend = await supabase
                .from("activities")
                .select("created_at, status")
                .gte("created_at", sevenDaysAgo);

            if (activitiesTrend.error) console.error("Error fetching activity trend:", activitiesTrend.error);

            const activityTrendData = [];
            for (let i = 6; i >= 0; i--) {
                const date = subDays(today, i);
                const dayLabel = format(date, "EEE");
                const count = activitiesTrend.data?.filter(a =>
                    format(new Date(a.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
                ).length || 0;

                activityTrendData.push({ name: dayLabel, value: count });
            }

            return {
                counts: {
                    organizations: orgsCount.count || 0,
                    members: membersCount.count || 0,
                    activities: activitiesCount.count || 0,
                    messages: messagesCount.count || 0,
                    activeOrgs: orgsCount.count || 0 // Assuming all orgs are active since status column is missing
                },
                charts: {
                    memberGrowth: memberGrowthData,
                    activityTrends: activityTrendData
                }
            };
        },
        // Refresh every 5 minutes
        staleTime: 1000 * 60 * 5,
    });
};
