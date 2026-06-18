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

export const useDemographicsData = ({ lga, lgas, ward }: DemographicsParams) => {
  return useQuery<DemographicsData>({
    queryKey: ["demographics", lga, lgas, ward],
    queryFn: async () => {
      let query = supabase.from("members").select("gender, date_of_birth, is_verified, is_deceased");

      if (ward) {
        query = query.eq("ward", ward);
      }
      if (lga) {
        query = query.eq("lga", lga);
      } else if (lgas && lgas.length > 0) {
        query = query.in("lga", lgas);
      }

      const { data, error } = await query;
      if (error) throw error;

      let male = 0;
      let female = 0;
      let teenagers = 0;
      let youths = 0;
      let middleAged = 0;
      let seniors = 0;
      let deathsCount = 0;
      let expectedTurnout = 0;

      const currentYear = new Date().getFullYear();

      data?.forEach((m: any) => {
        if (m.is_deceased) {
          deathsCount++;
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
    },
  });
};
