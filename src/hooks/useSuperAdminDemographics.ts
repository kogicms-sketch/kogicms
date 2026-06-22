import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { startOfWeek, subWeeks, format } from "date-fns";

export interface SuperAdminDemographicsData {
  weeklyGrowth: {
    week: string;
    actual: number | null;
    projected: number | null;
  }[];
  zoneWeights: {
    zone: string;
    youth: number;
    senior: number;
  }[];
  lgaHeatmap: {
    lga: string;
    zone: string;
    registered: number;
    verified: number;
    target: number;
    coverage: number;
  }[];
  summary: {
    totalRegistered: number;
    totalVerified: number;
    totalDeceased: number;
    totalTarget: number;
  };
}

const LGA_TO_ZONE: Record<string, string> = {
  // Katsina Central
  "Katsina": "Katsina Central",
  "Batagarawa": "Katsina Central",
  "Rimi": "Katsina Central",
  "Charanchi": "Katsina Central",
  "Kurfi": "Katsina Central",
  "Dutsin Ma": "Katsina Central",
  "Kaita": "Katsina Central",
  "Jibia": "Katsina Central",
  "Dan Musa": "Katsina Central",
  "Safana": "Katsina Central",
  "Batsari": "Katsina Central",
  
  // Katsina North
  "Daura": "Katsina North",
  "Mai'Adua": "Katsina North",
  "Zango": "Katsina North",
  "Sandamu": "Katsina North",
  "Baure": "Katsina North",
  "Mashi": "Katsina North",
  "Mani": "Katsina North",
  "Dutsi": "Katsina North",
  "Kusada": "Katsina North",
  "Kankia": "Katsina North",
  "Ingawa": "Katsina North",
  "Bindawa": "Katsina North",
  
  // Katsina South
  "Funtua": "Katsina South",
  "Faskari": "Katsina South",
  "Sabuwa": "Katsina South",
  "Dandume": "Katsina South",
  "Bakori": "Katsina South",
  "Danja": "Katsina South",
  "Kafur": "Katsina South",
  "Malumfashi": "Katsina South",
  "Musawa": "Katsina South",
  "Matazu": "Katsina South",
  "Kankara": "Katsina South",
};

export const useSuperAdminDemographics = () => {
  return useQuery<SuperAdminDemographicsData>({
    queryKey: ["super-admin", "demographics"],
    queryFn: async () => {
      const [membersResponse, puResponse, deceasedResponse] = await Promise.all([
        supabase.from("members").select("created_at, date_of_birth, lga, is_verified, is_deceased"),
        supabase.from("polling_units").select("lga_name, target_voters"),
        supabase.from("voter_registry").select("*", { count: "exact", head: true }).eq("voter_status", "deceased"),
      ]);

      if (membersResponse.error) throw membersResponse.error;
      if (puResponse.error) throw puResponse.error;
      if (deceasedResponse.error) throw deceasedResponse.error;

      const members = membersResponse.data || [];
      const pollingUnits = puResponse.data || [];

      // Calculate LGA targets
      const lgaTargets: Record<string, number> = {};
      let totalTarget = 0;
      pollingUnits.forEach(pu => {
        const lga = pu.lga_name;
        lgaTargets[lga] = (lgaTargets[lga] || 0) + (pu.target_voters || 0);
        totalTarget += (pu.target_voters || 0);
      });

      const totalDeceased = deceasedResponse.count || 0;
      const activeMembers = members.filter(m => !m.is_deceased);
      const totalRegistered = activeMembers.length;
      const totalVerified = activeMembers.filter(m => m.is_verified).length;

      // 1. Weekly Growth Trends
      const today = new Date();
      const weeksToShow = 12;
      const weeklyCounts: Record<string, number> = {};

      // Initialize weekly counts
      for (let i = weeksToShow - 1; i >= 0; i--) {
        const weekDate = startOfWeek(subWeeks(today, i));
        const weekKey = format(weekDate, "MMM dd");
        weeklyCounts[weekKey] = 0;
      }

      // Group active members by week
      activeMembers.forEach(m => {
        const createdDate = new Date(m.created_at);
        for (let i = weeksToShow - 1; i >= 0; i--) {
          const weekDate = startOfWeek(subWeeks(today, i));
          const nextWeekDate = startOfWeek(subWeeks(today, i - 1));
          
          if (createdDate >= weekDate && (i === 0 || createdDate < nextWeekDate)) {
            const weekKey = format(weekDate, "MMM dd");
            weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
            break;
          }
        }
      });

      // Create cumulative growth array
      const weeklyGrowthData: { week: string; actual: number | null; projected: number | null }[] = [];
      let cumulative = 0;
      
      const keys = Object.keys(weeklyCounts);
      keys.forEach((key) => {
        cumulative += weeklyCounts[key];
        weeklyGrowthData.push({
          week: key,
          actual: cumulative,
          projected: null
        });
      });

      // Calculate recent velocity (average growth per week in the last 4 weeks)
      const last4WeeksCount = keys.slice(-4).reduce((sum, key) => sum + weeklyCounts[key], 0);
      const weeklyVelocity = last4WeeksCount / 4;

      // Project forward for 6 weeks
      let projectedCumulative = cumulative;
      for (let i = 1; i <= 6; i++) {
        projectedCumulative += Math.round(weeklyVelocity || 100); // fallback to 100 if velocity is 0
        const projectedWeekDate = startOfWeek(subWeeks(today, -i));
        const weekKey = format(projectedWeekDate, "MMM dd");
        
        weeklyGrowthData.push({
          week: weekKey + " (Est)",
          actual: null,
          projected: projectedCumulative
        });
      }
      
      // Connect the projection line to the last actual point
      if (weeklyGrowthData.length > 0 && keys.length > 0) {
        const lastActualIndex = keys.length - 1;
        weeklyGrowthData[lastActualIndex].projected = weeklyGrowthData[lastActualIndex].actual;
      }

      // 2. Zone weights (Youth vs Senior)
      const zoneStats: Record<string, { youth: number; senior: number }> = {
        "Katsina Central": { youth: 0, senior: 0 },
        "Katsina North": { youth: 0, senior: 0 },
        "Katsina South": { youth: 0, senior: 0 },
      };

      const currentYear = new Date().getFullYear();

      activeMembers.forEach(m => {
        const zone = LGA_TO_ZONE[m.lga] || "Katsina Central";
        if (m.date_of_birth) {
          const age = currentYear - new Date(m.date_of_birth).getFullYear();
          if (age >= 20 && age <= 35) {
            zoneStats[zone].youth++;
          } else if (age >= 60) {
            zoneStats[zone].senior++;
          }
        }
      });

      const zoneWeights = Object.keys(zoneStats).map(zone => ({
        zone,
        youth: zoneStats[zone].youth,
        senior: zoneStats[zone].senior,
      }));

      // 3. LGA Heatmap Performance Grid
      const lgaDataMap: Record<string, { registered: number; verified: number }> = {};
      
      activeMembers.forEach(m => {
        const lga = m.lga || "Unknown";
        if (!lgaDataMap[lga]) {
          lgaDataMap[lga] = { registered: 0, verified: 0 };
        }
        lgaDataMap[lga].registered++;
        if (m.is_verified) {
          lgaDataMap[lga].verified++;
        }
      });

      const lgaHeatmap = Object.keys(LGA_TO_ZONE).map(lga => {
        const zone = LGA_TO_ZONE[lga];
        const data = lgaDataMap[lga] || { registered: 0, verified: 0 };
        const target = lgaTargets[lga] || 1000; // default target if none found
        const coverage = target > 0 ? Math.min((data.verified / target) * 100, 100) : 0;

        return {
          lga,
          zone,
          registered: data.registered,
          verified: data.verified,
          target,
          coverage: parseFloat(coverage.toFixed(1))
        };
      }).sort((a, b) => b.coverage - a.coverage); // Sort by performance

      return {
        weeklyGrowth: weeklyGrowthData,
        zoneWeights,
        lgaHeatmap,
        summary: {
          totalRegistered,
          totalVerified,
          totalDeceased,
          totalTarget
        }
      };
    },
    staleTime: 1000 * 60 * 5, // 5 mins
  });
};
