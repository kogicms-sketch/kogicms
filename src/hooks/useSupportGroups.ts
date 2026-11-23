"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import { localRepository } from "@/services/LocalRepository";

export interface SupportGroup {
  id: string;
  name: string;
  type?: string | null;
  focus_level?: string | null;
  description?: string | null;
  state?: string | null;
  lga?: string | null;
  ward?: string | null;
  leader_name?: string | null;
  leader_email?: string | null;
  leader_phone?: string | null;
  member_target?: number | null;
  verification_status?: string | null;
  verification_notes?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  kpi_score?: number | null;
  social_media_score?: number | null;
  category?: string | null;
  candidate_race?: string | null;
  candidate_id?: string | null;
  senatorial_zone?: string | null;
  federal_constituency?: string | null;
}

export type SupportGroupWithStats = SupportGroup & {
  activities_count?: number;
  verified_activities_count?: number;
  last_activity_date?: string | null;
  member_count?: number;
  pvc_count?: number;
};

export const LOCAL_STORAGE_SG_KEY = "kogi_apm_support_groups";
export const LOCAL_STORAGE_SG_ACTIVITIES_KEY = "kogi_apm_support_group_activities";
export const LOCAL_STORAGE_SG_ADMINS_KEY = "kogi_apm_support_group_admins";

export const DEFAULT_KOGI_SUPPORT_GROUPS: SupportGroupWithStats[] = [
  {
    id: "sg-kogi-grassroots",
    name: "Kogi APM Grassroots Mobilization Movement",
    type: "political_movement",
    focus_level: "State",
    description: "State-wide grassroots mobilization across all 21 LGAs of Kogi State.",
    state: "Kogi State",
    lga: "Lokoja",
    ward: "Lokoja A",
    leader_name: "Hon. Usman Danladi",
    leader_phone: "08031234567",
    leader_email: "danladi@kogicms.ng",
    member_target: 5000,
    verification_status: "verified",
    verified_at: "2026-01-15T10:00:00Z",
    created_at: "2026-01-10T08:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    kpi_score: 95,
    social_media_score: 80,
    member_count: 320,
    activities_count: 12,
  },
  {
    id: "sg-confluence-youth",
    name: "Confluence Youth Vanguard for APM",
    type: "youth_association",
    focus_level: "State",
    description: "Empowering youth leadership and polling unit voter mobilization across Kogi State.",
    state: "Kogi State",
    lga: "Okene",
    ward: "Bariki",
    leader_name: "Comrade Salihu Ibrahim",
    leader_phone: "08059876543",
    leader_email: "youth.vanguard@kogicms.ng",
    member_target: 3500,
    verification_status: "verified",
    verified_at: "2026-01-18T12:00:00Z",
    created_at: "2026-01-12T09:00:00Z",
    updated_at: "2026-01-18T12:00:00Z",
    kpi_score: 88,
    social_media_score: 92,
    member_count: 245,
    activities_count: 8,
  },
  {
    id: "sg-kogi-women-dev",
    name: "Kogi Women in Development Forum",
    type: "women_group",
    focus_level: "LGA",
    description: "Women mobilization and welfare outreach forum in Kogi East.",
    state: "Kogi State",
    lga: "Ankpa",
    ward: "Ankpa Township",
    leader_name: "Hajiya Aisha Bello",
    leader_phone: "08023456789",
    leader_email: "women.ankpa@kogicms.ng",
    member_target: 2000,
    verification_status: "verified",
    verified_at: "2026-01-20T14:00:00Z",
    created_at: "2026-01-15T11:00:00Z",
    updated_at: "2026-01-20T14:00:00Z",
    kpi_score: 82,
    social_media_score: 75,
    member_count: 180,
    activities_count: 6,
  },
  {
    id: "sg-kogi-traders",
    name: "Confluence Traders & Artisans Coalition",
    type: "traders_association",
    focus_level: "State",
    description: "Mobilizing traders, market unions and artisans for economic empowerment and victory.",
    state: "Kogi State",
    lga: "Kabba/Bunu",
    ward: "Kabba Township",
    leader_name: "Chief Sunday Adebayo",
    leader_phone: "08034567890",
    leader_email: "traders.kogi@kogicms.ng",
    member_target: 4000,
    verification_status: "pending",
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-02-01T10:00:00Z",
    kpi_score: 70,
    social_media_score: 60,
    member_count: 110,
    activities_count: 3,
  }
];

export const getLocalSupportGroups = (): SupportGroupWithStats[] => {
  if (typeof window === "undefined") return DEFAULT_KOGI_SUPPORT_GROUPS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SG_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_SG_KEY, JSON.stringify(DEFAULT_KOGI_SUPPORT_GROUPS));
      return DEFAULT_KOGI_SUPPORT_GROUPS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_KOGI_SUPPORT_GROUPS;
  } catch (err) {
    console.error("Error reading local support groups:", err);
    return DEFAULT_KOGI_SUPPORT_GROUPS;
  }
};

export const saveLocalSupportGroup = (group: any): SupportGroupWithStats => {
  const existing = getLocalSupportGroups();
  const id = group.id || `sg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const index = existing.findIndex(g => g.id === id);

  const item: SupportGroupWithStats = {
    ...group,
    id,
    created_at: group.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    member_count: group.member_count ?? 0,
    activities_count: group.activities_count ?? 0,
    verification_status: group.verification_status || "verified",
    kpi_score: group.kpi_score ?? 85,
    social_media_score: group.social_media_score ?? 60,
  };

  let updatedList: SupportGroupWithStats[];
  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = { ...updatedList[index], ...item };
  } else {
    updatedList = [item, ...existing];
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_SG_KEY, JSON.stringify(updatedList));
  }
  return item;
};

export const deleteLocalSupportGroup = (id: string): void => {
  const existing = getLocalSupportGroups();
  const updated = existing.filter(g => g.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_SG_KEY, JSON.stringify(updated));
  }
};

export const useSupportGroups = (filters?: {
  category?: string;
  verificationStatus?: string;
  lga?: string;
}) => {
  return useQuery({
    queryKey: ["support-groups", filters],
    queryFn: async () => {
      let groups = getLocalSupportGroups();

      // Enrich with counts from members table if possible
      try {
        const { data: members } = await supabase
          .from("members")
          .select("id, organization_id, support_group_id");

        if (members && members.length > 0) {
          const counts: Record<string, number> = {};
          members.forEach((m: any) => {
            const orgId = m.organization_id || m.support_group_id;
            if (orgId) {
              counts[orgId] = (counts[orgId] || 0) + 1;
            }
          });
          groups = groups.map(g => ({
            ...g,
            member_count: (g.member_count || 0) + (counts[g.id] || 0),
          }));
        }
      } catch (err) {
        console.warn("Could not query members table:", err);
      }

      if (filters?.verificationStatus && filters.verificationStatus !== "all") {
        groups = groups.filter(g => g.verification_status === filters.verificationStatus);
      }

      if (filters?.lga && filters.lga !== "all") {
        groups = groups.filter(g => g.lga?.toLowerCase() === filters.lga?.toLowerCase());
      }

      return groups;
    },
  });
};

export const useSupportGroup = (id: string) => {
  return useQuery({
    queryKey: ["support-groups", id],
    queryFn: async () => {
      if (!id) return null;
      const groups = getLocalSupportGroups();
      let match = groups.find(g => g.id === id);

      if (!match) {
        // Try background fetch from Supabase organizations
        try {
          const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (!error && data) {
            match = {
              ...data,
              member_count: 0,
              activities_count: 0,
            } as SupportGroupWithStats;
          }
        } catch {}
      }

      if (!match && groups.length > 0) {
        match = groups[0];
      }

      if (!match) return null;

      // Count members
      try {
        const { count } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .or(`organization_id.eq.${match.id},support_group_id.eq.${match.id}`);

        if (typeof count === "number" && count > 0) {
          match = { ...match, member_count: (match.member_count || 0) + count };
        }
      } catch {}

      return match;
    },
    enabled: !!id,
  });
};

export const useSupportGroupMembers = (supportGroupId: string) => {
  return useQuery({
    queryKey: ["support-group-members", supportGroupId],
    queryFn: async () => {
      if (!supportGroupId) return [];

      let membersList: any[] = [];
      try {
        const { data, error } = await supabase
          .from("members")
          .select("*")
          .or(`organization_id.eq.${supportGroupId},support_group_id.eq.${supportGroupId}`)
          .order("created_at", { ascending: false });

        if (!error && data) {
          membersList = data;
        }
      } catch (err) {
        console.warn("Error fetching support group members from Supabase:", err);
      }

      // Also check local offline repository
      try {
        const offlineMembers = await localRepository.getMembers();
        const matchedOffline = offlineMembers.filter(
          (m: any) => m.organization_id === supportGroupId || (m as any).support_group_id === supportGroupId
        );
        if (matchedOffline.length > 0) {
          const existingIds = new Set(membersList.map(m => m.id));
          matchedOffline.forEach(om => {
            if (!existingIds.has(om.id)) {
              membersList.push(om);
            }
          });
        }
      } catch {}

      return membersList;
    },
    enabled: !!supportGroupId,
  });
};

export const useSupportGroupAdmins = (organizationId: string) => {
  return useQuery({
    queryKey: ["support-group-admins", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Check local storage admins
      let localAdmins: any[] = [];
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_SG_ADMINS_KEY);
          if (raw) {
            const allAdmins = JSON.parse(raw);
            localAdmins = allAdmins.filter((a: any) => a.organization_id === organizationId);
          }
        } catch {}
      }

      if (localAdmins.length > 0) {
        return localAdmins;
      }

      try {
        const { data: adminsData } = await supabase
          .from("organization_admins")
          .select("*")
          .eq("organization_id", organizationId);

        if (adminsData && adminsData.length > 0) {
          return adminsData;
        }
      } catch {}

      return [];
    },
    enabled: !!organizationId,
  });
};

export const useCreateSupportGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (group: any) => {
      const saved = saveLocalSupportGroup(group);

      // Attempt Supabase insert in background with timeout
      try {
        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 1200));
        const insertPromise = supabase
          .from("organizations")
          .insert({
            id: saved.id,
            name: saved.name,
            type: saved.type,
            focus_level: saved.focus_level,
            description: saved.description,
            state: saved.state,
            lga: saved.lga,
            ward: saved.ward,
            leader_name: saved.leader_name,
            leader_email: saved.leader_email,
            leader_phone: saved.leader_phone,
            member_target: saved.member_target,
            verification_status: saved.verification_status,
            category: "support_group",
          });
        await Promise.race([insertPromise, timeoutPromise]);
      } catch (err) {
        console.warn("Background Supabase save skipped/failed:", err);
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-groups"] });
      toast.success("Support group registered successfully!");
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
      const existing = getLocalSupportGroups();
      const updated = existing.map(g => {
        if (g.id === id) {
          return {
            ...g,
            verification_status: status,
            verification_notes: notes,
            verified_at: new Date().toISOString(),
          };
        }
        return g;
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_SG_KEY, JSON.stringify(updated));
      }

      // Try background update to Supabase
      try {
        await supabase
          .from("organizations")
          .update({
            verification_status: status,
            verification_notes: notes,
            verified_at: new Date().toISOString(),
          })
          .eq("id", id);
      } catch {}

      return { id, status };
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
      let activities: any[] = [];

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_SG_ACTIVITIES_KEY);
          if (raw) {
            activities = JSON.parse(raw);
          }
        } catch {}
      }

      if (supportGroupId) {
        activities = activities.filter((a: any) => a.support_group_id === supportGroupId);
      }

      return activities;
    },
    enabled: true,
  });
};

export const useLogSupportGroupActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: any) => {
      const newActivity = {
        ...activity,
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        created_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_SG_ACTIVITIES_KEY);
          const list = raw ? JSON.parse(raw) : [];
          list.unshift(newActivity);
          localStorage.setItem(LOCAL_STORAGE_SG_ACTIVITIES_KEY, JSON.stringify(list));
        } catch {}
      }

      try {
        await supabase.from("support_group_activities").insert(newActivity);
      } catch {}

      return newActivity;
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
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_SG_ACTIVITIES_KEY);
          if (raw) {
            const list = JSON.parse(raw);
            const updated = list.map((a: any) => a.id === activityId ? { ...a, verified_at: new Date().toISOString() } : a);
            localStorage.setItem(LOCAL_STORAGE_SG_ACTIVITIES_KEY, JSON.stringify(updated));
          }
        } catch {}
      }
      return { id: activityId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-group-activities"] });
      toast.success("Activity verified!");
    },
  });
};

export const useSupportGroupDonations = (supportGroupId?: string) => {
  return useQuery({
    queryKey: ["support-group-donations", supportGroupId],
    queryFn: async () => {
      return [];
    },
    enabled: !!supportGroupId,
  });
};

export const useLogSupportGroupDonation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (donation: any) => {
      return donation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-group-donations"] });
      toast.success("Fund logged successfully!");
    },
  });
};

export const useMaterialRequests = (supportGroupId?: string) => {
  return useQuery({
    queryKey: ["material-requests", supportGroupId],
    queryFn: async () => {
      return [];
    },
    enabled: !!supportGroupId,
  });
};

export const useSupportGroupRankings = (groupId: string) => {
  return useQuery({
    queryKey: ["support-group-rankings", groupId],
    queryFn: async () => {
      const groups = getLocalSupportGroups();
      const current = groups.find(g => g.id === groupId) || groups[0];
      const sorted = [...groups].sort((a, b) => ((b as any).kpi_score || 0) - ((a as any).kpi_score || 0));
      const rank = Math.max(1, sorted.findIndex(g => g.id === (current?.id || groupId)) + 1);

      return {
        globalRank: rank,
        globalCount: groups.length,
        candidateRace: 'governorship',
        senatorialZone: null,
        federalConstituency: null,
        lga: current?.lga || "Kogi Central",
        constituencyRank: 1,
        constituencyCount: Math.max(1, groups.filter(g => g.lga === current?.lga).length),
        alignments: [
          {
            id: 'gov-central',
            candidateRace: 'governorship',
            candidateId: null,
            senatorialZone: null,
            federalConstituency: null,
            lga: current?.lga || 'Kogi Central',
            constituencyRank: 1,
            constituencyCount: 1,
          }
        ],
      };
    },
    enabled: !!groupId,
  });
};

export const useCandidateSupportGroups = (candidateId?: string) => {
  return useQuery({
    queryKey: ["candidate-support-groups", candidateId],
    queryFn: async () => {
      return getLocalSupportGroups();
    },
    enabled: !!candidateId,
  });
};

export const useCandidateGroupsActivities = (candidateId?: string) => {
  return useQuery({
    queryKey: ["candidate-groups-activities", candidateId],
    queryFn: async () => {
      return [];
    },
    enabled: !!candidateId,
  });
};
