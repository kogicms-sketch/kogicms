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
  // 1. Exact count query for total active members (supports millions of supporters)
  let countQuery = supabase
    .from("members")
    .select("*", { count: "exact", head: true })


  if (ward) {
    countQuery = countQuery.eq("ward", ward);
  }
  if (lga) {
    countQuery = countQuery.eq("lga", lga);
  } else if (lgas && lgas.length > 0) {
    countQuery = countQuery.in("lga", lgas);
  }

  // 2. Exact count query for expected turnout (verified members)
  let verifiedQuery = supabase
    .from("members")
    .select("*", { count: "exact", head: true })
    .eq("is_verified", true)


  if (ward) {
    verifiedQuery = verifiedQuery.eq("ward", ward);
  }
  if (lga) {
    verifiedQuery = verifiedQuery.eq("lga", lga);
  } else if (lgas && lgas.length > 0) {
    verifiedQuery = verifiedQuery.in("lga", lgas);
  }

  // 3. Fetch deceased count from voter_registry
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

  // Execute exact count queries in parallel
  const [countRes, verifiedRes, deceasedRes] = await Promise.all([
    countQuery,
    verifiedQuery,
    deceasedQuery,
  ]);

  if (countRes.error) console.warn("Error fetching total member count:", countRes.error.message);
  if (verifiedRes.error) console.warn("Error fetching verified member count:", verifiedRes.error.message);
  if (deceasedRes.error) console.warn("Error fetching deceased count:", deceasedRes.error.message);

  const deathsCount = deceasedRes.count || 0;

  // 4. Paginated batch query for demographic ratio calculations (gender & age)
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore && page < 50) { // Fetch up to 50,000 sample rows for high precision
    let batchQuery = supabase
      .from("members")
      .select("gender, date_of_birth, is_verified")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (ward) {
      batchQuery = batchQuery.eq("ward", ward);
    }
    if (lga) {
      batchQuery = batchQuery.eq("lga", lga);
    } else if (lgas && lgas.length > 0) {
      batchQuery = batchQuery.in("lga", lgas);
    }

    const { data: batchData, error: batchErr } = await batchQuery;
    if (batchErr) break;

    if (batchData && batchData.length > 0) {
      allRows = allRows.concat(batchData);
      if (batchData.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  const sampleActive = allRows;
  const totalRegistered = countRes.count !== null && countRes.count !== undefined ? countRes.count : sampleActive.length;
  const expectedTurnout = verifiedRes.count !== null && verifiedRes.count !== undefined ? verifiedRes.count : sampleActive.filter((m) => m.is_verified).length;

  let male = 0;
  let female = 0;
  let teenagers = 0;
  let youths = 0;
  let middleAged = 0;
  let seniors = 0;

  const currentYear = new Date().getFullYear();

  sampleActive.forEach((m: any) => {
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
  });

  // Scale gender and age group breakdown to exact total registered if total exceeds sample size
  const sampleGenderTotal = male + female;
  let finalMale = male;
  let finalFemale = female;

  if (sampleGenderTotal > 0 && totalRegistered > sampleGenderTotal) {
    const scaleFactor = totalRegistered / sampleGenderTotal;
    finalMale = Math.round(male * scaleFactor);
    finalFemale = Math.round(female * scaleFactor);
    teenagers = Math.round(teenagers * scaleFactor);
    youths = Math.round(youths * scaleFactor);
    middleAged = Math.round(middleAged * scaleFactor);
    seniors = Math.round(seniors * scaleFactor);
  }

  return {
    genderSplit: { male: finalMale, female: finalFemale },
    ageGroups: { teenagers, youths, middleAged, seniors },
    deathsCount,
    expectedTurnout,
    totalRegistered,
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
