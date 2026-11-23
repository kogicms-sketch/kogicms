import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { format, subMonths, subDays } from "date-fns";
import { ALL_POLLING_UNITS, ALL_WARDS } from "@/data/aggregated_lga_data";
import { localRepository } from "@/services/LocalRepository";

export const useSuperAdminStats = () => {
    return useQuery({
        queryKey: ["super-admin", "stats"],
        queryFn: async () => {
            // 1. Fetch Headline Stats
            let membersCount = 0;
            let membersList: any[] = [];

            try {
                const { count, data } = await supabase
                    .from("members")
                    .select("id, created_at, status, is_verified", { count: "exact" });
                membersCount = count || 0;
                if (data) membersList = data;
            } catch {
                try {
                    membersList = await localRepository.getMembers();
                    membersCount = membersList.length;
                } catch {}
            }

            const totalPollingUnits = ALL_POLLING_UNITS.length; // 3,512
            const totalWards = ALL_WARDS.length; // 239
            const totalLgas = 21;

            // 2. Process Member Growth (Last 6 months)
            const today = new Date();
            const memberGrowthData = [];
            for (let i = 5; i >= 0; i--) {
                const date = subMonths(today, i);
                const monthLabel = format(date, "MMM");
                const count = membersList.filter(m =>
                    new Date(m.created_at || Date.now()) <= new Date(date.getFullYear(), date.getMonth() + 1, 0)
                ).length;

                memberGrowthData.push({ name: monthLabel, value: count });
            }

            // 3. Process Activity Trends (Last 7 days)
            const activityTrendData = [];
            for (let i = 6; i >= 0; i--) {
                const date = subDays(today, i);
                const dayLabel = format(date, "EEE");
                const count = membersList.filter(m =>
                    format(new Date(m.created_at || Date.now()), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
                ).length;

                activityTrendData.push({ name: dayLabel, value: count });
            }

            return {
                counts: {
                    organizations: totalWards,
                    members: membersCount,
                    activities: totalPollingUnits,
                    messages: totalLgas,
                    activeOrgs: totalWards,
                    pollingUnits: totalPollingUnits,
                    wards: totalWards,
                    lgas: totalLgas,
                },
                charts: {
                    memberGrowth: memberGrowthData,
                    activityTrends: activityTrendData
                }
            };
        },
        staleTime: 1000 * 60 * 5,
    });
};
