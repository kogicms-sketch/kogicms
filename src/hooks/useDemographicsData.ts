import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

interface DemographicsParams {
  lga?: string;
  lgas?: string[];
  ward?: string;
}

export interface DemographicsData {
  genderSplit: {
    male: number;
    female: number;
  };
  ageGroups: {
    teenagers: number; // <20
    youths: number;    // 20-35
    middleAged: number;// 36-59
    seniors: number;   // 60+
  };
  deathsCount: number;
  expectedTurnout: number;
  totalRegistered: number;
}

const fetchFreshDemographicsData = async ({ lga, lgas, ward }: DemographicsParams): Promise<DemographicsData> => {
  let query = supabase.from("members").select("gender, date_of_birth, is_verified, is_deceased");

  if (ward) {
    query = query.eq("ward", ward);
  }
  if (lga) {
    query = query.eq("lga", lga);
  } else if (lgas && lgas.length > 0) {
    query = query.in("lga", lgas);
  }

  // Fetch deceased count from voter_registry
  let deceasedQuery = supabase
    .from("voter_registry")
    .select("*", { count: "exact", head: true })
    .eq("voter_status", "deceased");

  if (ward) {
    deceasedQuery = deceasedQuery.eq("ward", ward);
  }
  if (lga) {
    deceasedQuery = deceasedQuery.eq("lga", lga);
  } else if (lgas && lgas.length > 0) {
    deceasedQuery = deceasedQuery.in("lga", lgas);
  }

  const [membersRes, deceasedRes] = await Promise.all([
    query,
    deceasedQuery
  ]);

  if (membersRes.error) throw membersRes.error;
  if (deceasedRes.error) throw deceasedRes.error;

  const data = membersRes.data;
  const deathsCount = deceasedRes.count || 0;

  let male = 0;
  let female = 0;
  let teenagers = 0;
  let youths = 0;
  let middleAged = 0;
  let seniors = 0;
  let expectedTurnout = 0;

  const currentYear = new Date().getFullYear();

  data?.forEach((m: any) => {
    if (m.is_deceased) {
      return; // Exclude from active stats
    }

    // Gender Split
    if (m.gender?.toLowerCase() === "male") {
      male++;
    } else if (m.gender?.toLowerCase() === "female") {
      female++;
    }

    // Age Breakdown
    if (m.date_of_birth) {
      const dobYear = new Date(m.date_of_birth).getFullYear();
      const age = currentYear - dobYear;
      if (age < 20) {
        teenagers++;
      } else if (age >= 20 && age <= 35) {
        youths++;
      } else if (age >= 60) {
        seniors++;
      } else {
        middleAged++;
      }
    }

    // Expected Turnout (Verified and not deceased)
    if (m.is_verified) {
      expectedTurnout++;
    }
  });

  const totalActive = male + female;

  return {
    genderSplit: { male, female },
    ageGroups: { teenagers, youths, middleAged, seniors },
    deathsCount,
    expectedTurnout,
    totalRegistered: totalActive,
  };
};

export const useDemographicsData = ({ lga, lgas, ward }: DemographicsParams) => {
  return useQuery<DemographicsData>({
    queryKey: ["demographics", lga, lgas, ward],
    queryFn: async () => {
      const cacheKey = `demographics_${lga || ""}_${lgas?.join("_") || ""}_${ward || ""}`;

      // 1. Check local cache first
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          console.log("📦 Loaded demographics data from local cache.");
          // Background refresh
          (async () => {
            try {
              const freshData = await fetchFreshDemographicsData({ lga, lgas, ward });
              localStorage.setItem(cacheKey, JSON.stringify(freshData));
            } catch (e) {
              console.error("Error refreshing demographics data in background:", e);
            }
          })();
          return JSON.parse(cached) as DemographicsData;
        }
      }

      const freshData = await fetchFreshDemographicsData({ lga, lgas, ward });
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(freshData));
      }
      return freshData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};
