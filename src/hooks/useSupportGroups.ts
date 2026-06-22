import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";

export type SupportGroup = Tables<"organizations">;
export type SupportGroupInsert = TablesInsert<"organizations">;
export type SupportGroupUpdate = TablesUpdate<"organizations">;
export type SupportGroupActivity = Tables<"support_group_activities">;

export type SupportGroupWithStats = SupportGroup & {
  activities_count?: number;
  verified_activities_count?: number;
  last_activity_date?: string | null;
};

export const useSupportGroups = (filters?: {
  category?: string;
  verificationStatus?: string;
  lga?: string;
}) => {
  return useQuery({
    queryKey: ["support-groups", filters],
    queryFn: async () => {
      let query = supabase
        .from("organizations")
        .select(`
          *,
          support_group_activities(count),
          activities:activities!organization_id(count),
          members_org:members!organization_id(count),
          members_sg:members!support_group_id(count)
        `);

      if (filters?.verificationStatus) {
        query = query.eq("verification_status", filters.verificationStatus);
      }

      if (filters?.lga) {
        query = query.eq("lga", filters.lga);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data
      const transformed = data?.map(group => {
        const orgCount = (group as any).members_org?.[0]?.count || 0;
        const sgCount = (group as any).members_sg?.[0]?.count || 0;
        const sgActivitiesCount = group.support_group_activities?.[0]?.count || 0;
        const generalActivitiesCount = (group as any).activities?.[0]?.count || 0;
        return {
          ...group,
          activities_count: sgActivitiesCount + generalActivitiesCount,
          member_count: orgCount + sgCount,
        };
      }) || [];

      return transformed as SupportGroupWithStats[];
    },
  });
};

export const useSupportGroup = (id: string) => {
  return useQuery({
    queryKey: ["support-groups", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          members_org:members!organization_id(count),
          members_sg:members!support_group_id(count),
          support_group_activities(count),
          activities:activities!organization_id(count)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      const orgCount = (data as any).members_org?.[0]?.count || 0;
      const sgCount = (data as any).members_sg?.[0]?.count || 0;
      const sgActivitiesCount = data.support_group_activities?.[0]?.count || 0;
      const generalActivitiesCount = (data as any).activities?.[0]?.count || 0;
      return {
        ...data,
        member_count: orgCount + sgCount,
        activities_count: sgActivitiesCount + generalActivitiesCount,
      } as SupportGroupWithStats;
    },
    enabled: !!id,
  });
};

export const useSupportGroupMembers = (supportGroupId: string) => {
  return useQuery({
    queryKey: ["support-group-members", supportGroupId],
    queryFn: async () => {
      console.log("Fetching members for support group:", supportGroupId);
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .or(`organization_id.eq.${supportGroupId},support_group_id.eq.${supportGroupId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching support group members:", error);
        return [];
      }
      console.log("Support group members found:", data?.length || 0, data);
      return data || [];
    },
    enabled: !!supportGroupId,
  });
};

export const useSupportGroupAdmins = (organizationId: string) => {
  return useQuery({
    queryKey: ["support-group-admins", organizationId],
    queryFn: async () => {
      console.log("Fetching admins for organization:", organizationId);
      // Fetch admins without nested join (no FK from organization_admins to profiles)
      const { data: adminsData, error: adminsError } = await supabase
        .from("organization_admins")
        .select("*")
        .eq("organization_id", organizationId);

      if (adminsError) {
        console.error("Error fetching admins:", adminsError);
        return [];
      }
      if (!adminsData || adminsData.length === 0) {
        console.log("No admins found for organization:", organizationId);
        return [];
      }

      // Fetch profiles separately
      const userIds = adminsData.map((a) => a.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching admin profiles:", profilesError);
      }

      const profileMap = new Map();
      profiles?.forEach((p) => profileMap.set(p.id, p));

      return adminsData.map((admin) => ({
        ...admin,
        profile: profileMap.get(admin.user_id) || null,
      }));
    },
    enabled: !!organizationId,
  });
};

export const useCreateSupportGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (group: Omit<SupportGroupInsert, "category">) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          ...group,
          category: "support_group",
          verification_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-groups"] });
      toast.success("Support group registered successfully! Pending verification.");
    },
    onError: (error) => {
      console.error("Error creating support group:", error);
      toast.error("Failed to register support group");
    },
  });
};

export const useVerifySupportGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes
    }: {
      id: string;
      status: "verified" | "rejected";
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("organizations")
        .update({
          verification_status: status,
          verification_notes: notes,
          verified_by: userData.user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-groups"] });
      toast.success(
        variables.status === "verified"
          ? "Support group verified successfully!"
          : "Support group rejected"
      );
    },
    onError: (error) => {
      console.error("Error verifying support group:", error);
      toast.error("Failed to update verification status");
    },
  });
};

export const useSupportGroupActivities = (supportGroupId?: string) => {
  return useQuery({
    queryKey: ["support-group-activities", supportGroupId],
    queryFn: async () => {
      let query = supabase
        .from("support_group_activities")
        .select("*")
        .order("activity_date", { ascending: false });

      if (supportGroupId) {
        query = query.eq("support_group_id", supportGroupId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching activities:", error);
        return [];
      }
      return data || [];
    },
    enabled: true,
  });
};

export const useLogSupportGroupActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: TablesInsert<"support_group_activities">) => {
      const { data, error } = await supabase
        .from("support_group_activities")
        .insert(activity)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-group-activities"] });
      queryClient.invalidateQueries({ queryKey: ["support-groups"] });
      toast.success("Activity logged successfully!");
    },
    onError: (error) => {
      console.error("Error logging activity:", error);
      toast.error("Failed to log activity");
    },
  });
};

export const useVerifyActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("support_group_activities")
        .update({
          verified_by: userData.user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", activityId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-group-activities"] });
      toast.success("Activity verified!");
    },
    onError: (error) => {
      console.error("Error verifying activity:", error);
      toast.error("Failed to verify activity");
    },
  });
};

export const useSupportGroupDonations = (supportGroupId?: string) => {
  return useQuery({
    queryKey: ["support-group-donations", supportGroupId],
    queryFn: async () => {
      let query = supabase
        .from("support_group_donations")
        .select("*")
        .order("date", { ascending: false });

      if (supportGroupId) {
        query = query.eq("support_group_id", supportGroupId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching donations:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!supportGroupId,
  });
};

export const useLogSupportGroupDonation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (donation: any) => {
      const { data, error } = await supabase
        .from("support_group_donations")
        .insert(donation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-group-donations"] });
      toast.success("Fund logged successfully!");
    },
    onError: (error) => {
      console.error("Error logging donation:", error);
      toast.error("Failed to log fund");
    },
  });
};

export const useMaterialRequests = (supportGroupId?: string) => {
  return useQuery({
    queryKey: ["material-requests", supportGroupId],
    queryFn: async () => {
      let query = supabase
        .from("material_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (supportGroupId) {
        query = query.eq("support_group_id", supportGroupId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching material requests:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!supportGroupId,
  });
};

export const useSupportGroupRankings = (groupId: string) => {
  return useQuery({
    queryKey: ["support-group-rankings", groupId],
    queryFn: async () => {
      if (!groupId) return { globalRank: 1, globalCount: 1, constituencyRank: 1, constituencyCount: 1, alignments: [] };

      // 1. Fetch current group's KPI score
      const { data: currentGroup, error: currentError } = await supabase
        .from("organizations")
        .select("id, kpi_score")
        .eq("id", groupId)
        .single();

      if (currentError) throw currentError;

      const score = currentGroup?.kpi_score || 0;

      // 2. Query all groups sorted by kpi_score to find global rank
      const { data: globalGroups, error: globalError } = await supabase
        .from("organizations")
        .select("id, kpi_score")
        .order("kpi_score", { ascending: false });

      if (globalError) throw globalError;

      const globalRank = (globalGroups || []).findIndex(g => g.id === groupId) + 1;
      const globalCount = globalGroups?.length || 1;

      // 3. Query alignments for this group
      const { data: alignments, error: alignError } = await supabase
        .from("support_group_candidate_alignments")
        .select("*")
        .eq("organization_id", groupId);

      if (alignError) throw alignError;

      const results = [];

      // Calculate constituency ranks for each alignment
      for (const align of alignments || []) {
        let constituencyRank = 1;
        let constituencyCount = 1;

        if (align.candidate_race && align.candidate_race !== 'governorship') {
          let localQuery = supabase.from("support_group_candidate_alignments").select("organization_id");
          if (align.candidate_race === 'senatorial' && align.senatorial_zone) {
            localQuery = localQuery.eq("senatorial_zone", align.senatorial_zone);
          } else if (align.candidate_race === 'house_of_reps' && align.federal_constituency) {
            localQuery = localQuery.eq("federal_constituency", align.federal_constituency);
          } else if (align.candidate_race === 'state_assembly' && align.lga) {
            localQuery = localQuery.eq("lga", align.lga);
          } else if (align.candidate_race === 'lga_chairman' && align.lga) {
            localQuery = localQuery.eq("lga", align.lga);
          } else if (align.candidate_id) {
            localQuery = localQuery.eq("candidate_id", align.candidate_id);
          }

          const { data: localAlignments, error: localError } = await localQuery;
          if (!localError && localAlignments) {
            const localOrgIds = localAlignments.map(la => la.organization_id);
            const { data: localGroups, error: groupsError } = await supabase
              .from("organizations")
              .select("id, kpi_score")
              .in("id", localOrgIds)
              .order("kpi_score", { ascending: false });

            if (!groupsError && localGroups) {
              const idx = localGroups.findIndex(g => g.id === groupId);
              constituencyRank = idx !== -1 ? idx + 1 : 1;
              constituencyCount = localGroups.length;
            }
          }
        }

        results.push({
          id: align.id,
          candidateRace: align.candidate_race,
          candidateId: align.candidate_id,
          senatorialZone: align.senatorial_zone,
          federalConstituency: align.federal_constituency,
          lga: align.lga,
          constituencyRank,
          constituencyCount,
        });
      }

      const firstAlign = results[0];

      return {
        globalRank,
        globalCount,
        candidateRace: firstAlign?.candidateRace || null,
        senatorialZone: firstAlign?.senatorialZone || null,
        federalConstituency: firstAlign?.federalConstituency || null,
        lga: firstAlign?.lga || null,
        constituencyRank: firstAlign?.constituencyRank || 1,
        constituencyCount: firstAlign?.constituencyCount || 1,
        alignments: results,
      };
    },
    enabled: !!groupId,
  });
};

export const useCandidateSupportGroups = (candidateId?: string) => {
  return useQuery({
    queryKey: ["candidate-support-groups", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      const { data: alignments, error: alignError } = await supabase
        .from("support_group_candidate_alignments")
        .select("organization_id")
        .eq("candidate_id", candidateId);

      if (alignError) throw alignError;
      if (!alignments || alignments.length === 0) return [];

      const orgIds = alignments.map(a => a.organization_id);

      const { data: groups, error } = await supabase
        .from("organizations")
        .select(`
          *,
          support_group_activities(count),
          activities:activities!organization_id(count),
          members_org:members!organization_id(*),
          members_sg:members!support_group_id(*)
        `)
        .in("id", orgIds);

      if (error) throw error;

      const transformed = (groups || []).map(group => {
        const orgMembers = (group as any).members_org || [];
        const sgMembers = (group as any).members_sg || [];
        
        const allMembersMap = new Map();
        orgMembers.forEach((m: any) => allMembersMap.set(m.id, m));
        sgMembers.forEach((m: any) => allMembersMap.set(m.id, m));
        const allMembers = Array.from(allMembersMap.values());

        const memberCount = allMembers.length;
        const pvcCount = allMembers.filter((m: any) => !!m.voters_card_id).length;

        const sgActivitiesCount = group.support_group_activities?.[0]?.count || 0;
        const generalActivitiesCount = (group as any).activities?.[0]?.count || 0;
        const activitiesCount = sgActivitiesCount + generalActivitiesCount;

        return {
          ...group,
          member_count: memberCount,
          pvc_count: pvcCount,
          activities_count: activitiesCount,
        };
      });

      return transformed;
    },
    enabled: !!candidateId,
  });
};

export const useCandidateGroupsActivities = (candidateId?: string) => {
  return useQuery({
    queryKey: ["candidate-groups-activities", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      const { data: alignments, error: alignError } = await supabase
        .from("support_group_candidate_alignments")
        .select("organization_id")
        .eq("candidate_id", candidateId);

      if (alignError) throw alignError;
      if (!alignments || alignments.length === 0) return [];

      const groupIds = alignments.map(a => a.organization_id);

      const { data: activities, error: actError } = await supabase
        .from("support_group_activities")
        .select(`
          *,
          group:support_group_id (name, leader_name)
        `)
        .in("support_group_id", groupIds)
        .order("activity_date", { ascending: false });

      if (actError) throw actError;
      return activities || [];
    },
    enabled: !!candidateId,
  });
};
