import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { startOfWeek, subWeeks, format } from "date-fns";
import { ALL_POLLING_UNITS } from "@/data/aggregated_lga_data";
import { localRepository } from "@/services/LocalRepository";

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
  // Kogi Central
  "Adavi": "Kogi Central",
  "Ajaokuta": "Kogi Central",
  "Okehi": "Kogi Central",
  "Okene": "Kogi Central",
  "Ogori/Magongo": "Kogi Central",

  // Kogi East
  "Ankpa": "Kogi East",
  "Bassa": "Kogi East",
  "Dekina": "Kogi East",
  "Ibaji": "Kogi East",
  "Idah": "Kogi East",
  "Igalamela-Odolu": "Kogi East",
  "Ofu": "Kogi East",
  "Olamaboro": "Kogi East",
  "Omala": "Kogi East",

  // Kogi West
  "Ijumu": "Kogi West",
  "Kabba/Bunu": "Kogi West",
  "Kogi (Koton Karfe)": "Kogi West",
  "Lokoja": "Kogi West",
  "Mopa-Muro": "Kogi West",
  "Yagba East": "Kogi West",
  "Yagba West": "Kogi West",
};

function getInitialDemographics(): SuperAdminDemographicsData {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("super_admin_demographics_v2");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.lgaHeatmap && parsed?.summary) return parsed;
      }
    } catch (_) {}
  }

  // Pre-seed from static INEC data
  let totalTarget = 0;
  ALL_POLLING_UNITS.forEach(pu => {
    totalTarget += (pu.registeredVoters || 0);
  });

  const lgaHeatmap = Object.keys(LGA_TO_ZONE).map(lga => {
    const zone = LGA_TO_ZONE[lga];
    let target = 0;
    ALL_POLLING_UNITS.forEach(pu => {
      if (pu.lga === lga) target += (pu.registeredVoters || 0);
    });
    return {
      lga,
      zone,
      registered: 0,
      verified: 0,
      target: target || 1000,
      coverage: 0
    };
  });

  return {
    weeklyGrowth: [],
    zoneWeights: [
      { zone: "Kogi Central", youth: 0, senior: 0 },
      { zone: "Kogi East", youth: 0, senior: 0 },
      { zone: "Kogi West", youth: 0, senior: 0 }
    ],
    lgaHeatmap,
    summary: {
      totalRegistered: 0,
      totalVerified: 0,
      totalDeceased: 0,
      totalTarget
    }
  };
}

export const useSuperAdminDemographics = () => {
  return useQuery<SuperAdminDemographicsData>({
    queryKey: ["super-admin", "demographics"],
    initialData: getInitialDemographics,
    queryFn: async () => {
      // 1. Fetch real campaign members from IndexedDB first (0ms, offline ready)
      let members: any[] = [];
      try {
        const localMembers = await localRepository.getMembers();
        if (Array.isArray(localMembers) && localMembers.length > 0) {
          members = localMembers;
        }
      } catch (_) {}

      // 2. Fetch from Supabase with safe 1800ms timeout
      try {
        const supabasePromise = supabase
          .from("members")
          .select("created_at, date_of_birth, lga, is_verified, status");

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 1800)
        );

        const result = await Promise.race([supabasePromise, timeoutPromise]);
        if (result && "data" in result && !result.error && Array.isArray(result.data) && result.data.length > 0) {
          members = result.data;
        }
      } catch (e) {
        console.warn("Could not load members from Supabase, using local data:", e);
      }

      // 2. Compute LGA voter targets directly from local INEC dataset (3,512 PUs, 21 LGAs)
      const lgaTargets: Record<string, number> = {};
      let totalTarget = 0;

      ALL_POLLING_UNITS.forEach(pu => {
        const lga = pu.lga;
        const voters = pu.registeredVoters || 0;
        lgaTargets[lga] = (lgaTargets[lga] || 0) + voters;
        totalTarget += voters;
      });

      const activeMembers = members;
      const totalRegistered = activeMembers.length;
      const totalVerified = activeMembers.filter(m => m.is_verified || m.status === "active").length;
      const totalDeceased = 0;

      // 3. Weekly Growth Trends
      const today = new Date();
      const weeksToShow = 12;
      const weeklyCounts: Record<string, number> = {};

      for (let i = weeksToShow - 1; i >= 0; i--) {
        const weekDate = startOfWeek(subWeeks(today, i));
        const weekKey = format(weekDate, "MMM dd");
        weeklyCounts[weekKey] = 0;
      }

      activeMembers.forEach(m => {
        const createdDate = new Date(m.created_at || Date.now());
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

      const last4WeeksCount = keys.slice(-4).reduce((sum, key) => sum + weeklyCounts[key], 0);
      const weeklyVelocity = last4WeeksCount / 4;

      let projectedCumulative = cumulative;
      for (let i = 1; i <= 6; i++) {
        projectedCumulative += Math.round(weeklyVelocity || 25);
        const projectedWeekDate = startOfWeek(subWeeks(today, -i));
        const weekKey = format(projectedWeekDate, "MMM dd");
        
        weeklyGrowthData.push({
          week: weekKey + " (Est)",
          actual: null,
          projected: projectedCumulative
        });
      }
      
      if (weeklyGrowthData.length > 0 && keys.length > 0) {
        const lastActualIndex = keys.length - 1;
        weeklyGrowthData[lastActualIndex].projected = weeklyGrowthData[lastActualIndex].actual;
      }

      // 4. Zone weights (Youth vs Senior)
      const zoneStats: Record<string, { youth: number; senior: number }> = {
        "Kogi Central": { youth: 0, senior: 0 },
        "Kogi East": { youth: 0, senior: 0 },
        "Kogi West": { youth: 0, senior: 0 },
      };

      const currentYear = new Date().getFullYear();

      activeMembers.forEach(m => {
        const zone = LGA_TO_ZONE[m.lga] || "Kogi Central";
        if (m.date_of_birth) {
          const age = currentYear - new Date(m.date_of_birth).getFullYear();
          if (age >= 18 && age <= 35) {
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

      // 5. LGA Heatmap Performance Grid
      const lgaDataMap: Record<string, { registered: number; verified: number }> = {};
      
      activeMembers.forEach(m => {
        const lga = m.lga || "Unknown";
        if (!lgaDataMap[lga]) {
          lgaDataMap[lga] = { registered: 0, verified: 0 };
        }
        lgaDataMap[lga].registered++;
        if (m.is_verified || m.status === "active") {
          lgaDataMap[lga].verified++;
        }
      });

      const lgaHeatmap = Object.keys(LGA_TO_ZONE).map(lga => {
        const zone = LGA_TO_ZONE[lga];
        const data = lgaDataMap[lga] || { registered: 0, verified: 0 };
        const target = lgaTargets[lga] || 1000;
        const coverage = target > 0 ? Math.min((data.verified / target) * 100, 100) : 0;

        return {
          lga,
          zone,
          registered: data.registered,
          verified: data.verified,
          target,
          coverage: parseFloat(coverage.toFixed(1))
        };
      }).sort((a, b) => b.coverage - a.coverage);

      const payload: SuperAdminDemographicsData = {
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

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("super_admin_demographics_v2", JSON.stringify(payload));
        } catch (_) {}
      }

      return payload;
    },
    staleTime: 1000 * 60 * 5,
  });
};
