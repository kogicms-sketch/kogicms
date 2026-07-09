import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { startOfMonth, subMonths, format, startOfWeek, subWeeks, eachWeekOfInterval, endOfWeek } from "date-fns";

export interface TrendData {
    period: string;
    members: number;
    target?: number;
}

const fetchFreshTrends = async (lgas: string[]): Promise<TrendData[]> => {
    const now = new Date();
    
    // Get data for the last 12 weeks
    const startDate = subWeeks(now, 11);
    const intervals = eachWeekOfInterval({
        start: startDate,
        end: now,
    });

    const results = await Promise.all(
        intervals.map(async (weekStart) => {
            const weekEnd = endOfWeek(weekStart);
            const weekLabel = format(weekStart, "dd MMM");

            let query = supabase
                .from("members")
                .select("*", { count: "exact", head: true })
                .lte("created_at", weekEnd.toISOString());

            if (!lgas.includes("ALL")) {
                query = query.in("lga", lgas);
            }

            const { count, error } = await query;
            if (error) throw error;

            return {
                period: weekLabel,
                members: count || 0,
            };
        })
    );

    return results;
};

export const useJurisdictionTrends = (lgas: string[]) => {
    return useQuery({
        queryKey: ["jurisdiction-trends", lgas],
        queryFn: async () => {
            if (!lgas || lgas.length === 0) return [];

            const cacheKey = `jurisdiction_trends_${lgas.join("_")}`;

            // 1. Check local cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    console.log("📦 Loaded jurisdiction trends from local cache.");
                    // Background refresh
                    (async () => {
                        try {
                            const freshData = await fetchFreshTrends(lgas);
                            localStorage.setItem(cacheKey, JSON.stringify(freshData));
                        } catch (e) {
                            console.error("Error refreshing trends in background:", e);
                        }
                    })();
                    return JSON.parse(cached) as TrendData[];
                }
            }

            const freshData = await fetchFreshTrends(lgas);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!lgas && lgas.length > 0,
        staleTime: 1000 * 60 * 15, // 15 minutes
    });
};
