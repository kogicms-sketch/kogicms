import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { startOfMonth, subMonths, format, startOfWeek, subWeeks, eachWeekOfInterval, endOfWeek } from "date-fns";

export interface TrendData {
    period: string;
    members: number;
    target?: number;
}

export const useJurisdictionTrends = (lgas: string[]) => {
    return useQuery({
        queryKey: ["jurisdiction-trends", lgas],
        queryFn: async () => {
            if (!lgas || lgas.length === 0) return [];

            const weeks: TrendData[] = [];
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
                        .select("id", { count: "exact" })
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
        },
        enabled: !!lgas && lgas.length > 0,
    });
};
