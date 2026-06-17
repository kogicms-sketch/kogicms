import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type MemberRecruit = {
  id: string;
  full_name: string;
  phone: string | null;
  lga: string | null;
  ward: string | null;
  political_position: string | null;
  total_recruits: number | null;
  joined_at: string | null;
  level: number;
};

export type MyStructureStats = {
  total_recruits: number;
  direct_recruits: number;
  indirect_recruits: number;
  by_level: { level: number; count: number }[];
  by_lga: { lga: string; count: number }[];
  top_performers: { full_name: string; recruits: number }[];
};

export const useMyStructure = (memberId?: string) => {
  return useQuery({
    queryKey: ["my-structure", memberId],
    queryFn: async () => {
      if (!memberId) return null;

      const { data, error } = await db
        .rpc("get_member_downline", { member_uuid: memberId });

      if (error) throw error;
      return data as MemberRecruit[];
    },
    enabled: !!memberId,
  });
};

export const useMyStructureStats = (memberId?: string) => {
  return useQuery({
    queryKey: ["my-structure-stats", memberId],
    queryFn: async () => {
      if (!memberId) return null;

      const { data: downline, error } = await db
        .rpc("get_member_downline", { member_uuid: memberId });

      if (error) throw error;

      const recruits = downline as MemberRecruit[];
      
      // Calculate stats
      const directRecruits = recruits.filter(r => r.level === 1);
      const indirectRecruits = recruits.filter(r => r.level > 1);
      
      // By level
      const byLevel = recruits.reduce((acc, r) => {
        acc[r.level] = (acc[r.level] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // By LGA
      const byLga = recruits.reduce((acc, r) => {
        if (r.lga) {
          acc[r.lga] = (acc[r.lga] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Top performers (direct recruits with their own recruits)
      const topPerformers = directRecruits
        .filter(r => (r.total_recruits || 0) > 0)
        .sort((a, b) => (b.total_recruits || 0) - (a.total_recruits || 0))
        .slice(0, 5)
        .map(r => ({ full_name: r.full_name, recruits: r.total_recruits || 0 }));

      return {
        total_recruits: recruits.length,
        direct_recruits: directRecruits.length,
        indirect_recruits: indirectRecruits.length,
        by_level: Object.entries(byLevel).map(([level, count]) => ({ 
          level: parseInt(level), 
          count 
        })),
        by_lga: Object.entries(byLga).map(([lga, count]) => ({ lga, count })),
        top_performers: topPerformers,
      } as MyStructureStats;
    },
    enabled: !!memberId,
  });
};

export const useRecruitMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recruiterId,
      member,
    }: {
      recruiterId: string;
      member: TablesInsert<"members">;
    }) => {
      // Generate membership ID
      const membershipId = `DR-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from("members")
        .insert({
          ...member,
          recruiter_id: recruiterId,
          membership_id: membershipId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["my-structure", variables.recruiterId] });
      queryClient.invalidateQueries({ queryKey: ["my-structure-stats", variables.recruiterId] });
      toast.success("Member recruited successfully!");
    },
    onError: (error) => {
      console.error("Error recruiting member:", error);
      toast.error("Failed to recruit member");
    },
  });
};

// Political position options for member profiles
export const POLITICAL_POSITIONS = [
  // State Level
  { value: "state_governor", label: "State Governor", level: "state" },
  { value: "state_deputy_governor", label: "State Deputy Governor", level: "state" },
  { value: "state_party_chairman", label: "State Party Chairman", level: "state" },
  { value: "state_party_secretary", label: "State Party Secretary", level: "state" },
  { value: "state_woman_leader", label: "State Woman Leader", level: "state" },
  { value: "state_youth_leader", label: "State Youth Leader", level: "state" },
  
  // Senatorial
  { value: "senatorial_district_leader", label: "Senatorial District Leader", level: "senatorial" },
  { value: "federal_constituency_leader", label: "Federal Constituency Leader", level: "federal" },
  
  // LGA Level
  { value: "lga_chairman", label: "LGA Chairman", level: "lga" },
  { value: "lga_secretary", label: "LGA Secretary", level: "lga" },
  { value: "lga_woman_leader", label: "LGA Woman Leader", level: "lga" },
  { value: "lga_youth_leader", label: "LGA Youth Leader", level: "lga" },
  { value: "lga_organizing_secretary", label: "LGA Organizing Secretary", level: "lga" },
  
  // Ward Level
  { value: "ward_chairman", label: "Ward Chairman", level: "ward" },
  { value: "ward_secretary", label: "Ward Secretary", level: "ward" },
  { value: "ward_woman_leader", label: "Ward Woman Leader", level: "ward" },
  { value: "ward_youth_leader", label: "Ward Youth Leader", level: "ward" },
  { value: "ward_canvasser", label: "Ward Canvasser", level: "ward" },
  
  // Polling Unit
  { value: "polling_unit_agent", label: "Polling Unit Agent", level: "polling_unit" },
  { value: "polling_unit_canvasser", label: "Polling Unit Canvasser", level: "polling_unit" },
  
  // Support Group
  { value: "support_group_leader", label: "Support Group Leader", level: "support_group" },
  { value: "member", label: "Member", level: "member" },
];

export const getPositionLabel = (positionValue: string): string => {
  const position = POLITICAL_POSITIONS.find(p => p.value === positionValue);
  return position?.label || positionValue;
};

export const getPositionLevel = (positionValue: string): string => {
  const position = POLITICAL_POSITIONS.find(p => p.value === positionValue);
  return position?.level || "member";
};
