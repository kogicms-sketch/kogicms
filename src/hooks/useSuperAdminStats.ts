import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { format, subMonths, subDays } from "date-fns";
import { ALL_POLLING_UNITS, ALL_WARDS } from "@/data/aggregated_lga_data";
import { localRepository } from "@/services/LocalRepository";

function getInitialStats() {
    const totalPollingUnits = ALL_POLLING_UNITS.length; // 3,512
    const totalWards = ALL_WARDS.length; // 239
    const totalLgas = 21;

    if (typeof window !== "undefined") {
        try {
            const cached = localStorage.getItem("super_admin_stats_v3");
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.counts && parsed.counts.members > 0) return parsed;
            }
        } catch (_) {}
    }

    return {
        counts: {
            organizations: totalWards,
            members: 3, // Current live seed
            activities: totalPollingUnits,
            messages: totalLgas,
            activeOrgs: totalWards,
            pollingUnits: totalPollingUnits,
            wards: totalWards,
            lgas: totalLgas,
        },
        charts: {
            memberGrowth: [],
            activityTrends: []
        }
    };
}

export const useSuperAdminStats = () => {
    return useQuery({
        queryKey: ["super-admin", "stats"],
        initialData: getInitialStats,
        queryFn: async () => {
            const totalPollingUnits = ALL_POLLING_UNITS.length; // 3,512
            const totalWards = ALL_WARDS.length; // 239
            const totalLgas = 21;

            const memberMap = new Map<string, any>();

            // 1. Fetch from local Dexie / IndexedDB first (0ms latency, zero hang)
            try {
                const localMembers = await localRepository.getMembers();
                if (Array.isArray(localMembers)) {
                    localMembers.forEach(m => { if (m.id) memberMap.set(m.id, m); });
                }
            } catch (_) {}

            // 2. Fetch from Supabase with safe 2500ms timeout
            try {
                const supabasePromise = supabase
                    .from("members")
                    .select("id, created_at, status, is_verified", { count: "exact" });

                const timeoutPromise = new Promise<null>((resolve) =>
                    setTimeout(() => resolve(null), 2500)
                );

                const result: any = await Promise.race([supabasePromise, timeoutPromise]);
                if (result && "data" in result && !result.error && Array.isArray(result.data)) {
                    result.data.forEach((m: any) => {
                        if (m.id) {
                            memberMap.set(m.id, { ...(memberMap.get(m.id) || {}), ...m });
                        }
                    });
                }
            } catch (e) {
                console.warn("Supabase stats fetch timed out or offline, using local data:", e);
            }

            const membersList = Array.from(memberMap.values());
            const membersCount = Math.max(membersList.length, 3);

            // 3. Process Member Growth (Last 6 months)
            const today = new Date();
            const memberGrowthData = [];
            for (let i = 5; i >= 0; i--) {
                const date = subMonths(today, i);
                const monthLabel = format(date, "MMM");
                const count = membersList.filter(m =>
                    new Date(m.created_at || Date.now()) <= new Date(date.getFullYear(), date.getMonth() + 1, 0)
                ).length;

                memberGrowthData.push({ name: monthLabel, value: Math.max(count, count === 0 && i === 0 ? membersCount : count) });
            }

            // 4. Process Activity Trends (Last 7 days)
            const activityTrendData = [];
            for (let i = 6; i >= 0; i--) {
                const date = subDays(today, i);
                const dayLabel = format(date, "EEE");
                const count = membersList.filter(m =>
                    format(new Date(m.created_at || Date.now()), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
                ).length;

                activityTrendData.push({ name: dayLabel, value: count });
            }

            const payload = {
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

            if (typeof window !== "undefined") {
                try {
                    localStorage.setItem("super_admin_stats_v3", JSON.stringify(payload));
                } catch (_) {}
            }

            return payload;
        },
        staleTime: 1000 * 5, // 5 seconds fresh, so updates show up immediately
    });
};
