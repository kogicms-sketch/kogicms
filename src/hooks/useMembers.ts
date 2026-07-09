import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";
import { localRepository } from "@/services/LocalRepository";
import { syncManager } from "@/services/SyncManager";
import { generateSequentialMembershipId } from "@/lib/campaign-data";

// Helper to wrap promises in a timeout to prevent hanging states
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Promise timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise
  ]);
}

export type Member = Tables<"members"> & { 
  is_verified?: boolean; 
  polling_unit_id?: string | null;
  activity_count?: number;
};
export type MemberInsert = TablesInsert<"members">;

export type MemberWithOrganization = Member & {
  organizations: { name: string } | null;
};

type MemberScope = "all" | "organization" | "polling_unit";

export const useMembers = (
  organizationId?: string,
  pollingUnitId?: string,
  pollingUnitName?: string,
  scope: MemberScope = "all",
  allowedLgas?: string[],
  allowedWard?: string,
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("members-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["members"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["members", scope, organizationId, pollingUnitId, pollingUnitName, allowedLgas, allowedWard],
    enabled: scope !== "polling_unit" || !!pollingUnitId || !!pollingUnitName,
    queryFn: async () => {
      // 1. Try to fetch from Supabase first to sync local cache
      try {
        console.log(`🌐 Fetching latest members from Supabase...`);
        let query = supabase
          .from("members")
          .select(`
            *,
            organizations:organization_id (name)
          `)
          .order("created_at", { ascending: false });
        
        if (scope === "polling_unit") {
          if (pollingUnitId && pollingUnitName) {
            query = query.or(`polling_unit_id.eq.${pollingUnitId},polling_unit.eq.${pollingUnitName}`);
          } else if (pollingUnitId) {
            query = query.eq("polling_unit_id", pollingUnitId);
          } else if (pollingUnitName) {
            query = query.eq("polling_unit", pollingUnitName);
          }
        } else if (scope === "organization" && organizationId) {
          query = query.or(`organization_id.eq.${organizationId},support_group_id.eq.${organizationId}`);
        }

        if (allowedWard) {
          query = query.eq("ward", allowedWard);
        }

        if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
          query = query.in("lga", allowedLgas);
        }

        const networkResult = await withTimeout(
          query,
          4000,
          { data: null, error: new Error("Network query timed out") }
        );

        const { data, error } = networkResult as any;
        if (!error && data && data.length > 0) {
          for (const member of data) {
            await localRepository.saveMember(member);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch fresh members from server, using cached:", err);
      }

      // 2. Load from local cache (IndexedDB)
      let list = await localRepository.getMembers();
      
      // Apply filters locally
      if (scope === "polling_unit") {
        if (pollingUnitId && pollingUnitName) {
          list = list.filter(m => m.polling_unit_id === pollingUnitId || m.polling_unit === pollingUnitName);
        } else if (pollingUnitId) {
          list = list.filter(m => m.polling_unit_id === pollingUnitId);
        } else if (pollingUnitName) {
          list = list.filter(m => m.polling_unit === pollingUnitName);
        }
      } else if (scope === "organization" && organizationId) {
        list = list.filter(m => m.organization_id === organizationId || m.support_group_id === organizationId);
      }

      if (allowedWard) {
        list = list.filter(m => m.ward === allowedWard);
      }

      if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
        list = list.filter(m => m.lga && allowedLgas.includes(m.lga));
      }

      return list as MemberWithOrganization[];
    },
  });
};

export const useMember = (id: string) => {
  return useQuery({
    queryKey: ["members", "detail", id],
    queryFn: async () => {
      // 1. Check local cache
      const cached = await localRepository.getMemberById(id);
      if (cached) {
        console.log(`📦 Loaded member details for ${id} from IndexedDB.`);
        return cached as MemberWithOrganization;
      }

      // 2. Fallback to Supabase
      console.log(`🌐 Member not found in cache. Fetching from Supabase...`);
      const { data, error } = await supabase
        .from("members")
        .select(`
          *,
          organizations:organization_id (name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        await localRepository.saveMember(data);
      }
      return (data as any) as MemberWithOrganization | null;
    },
    enabled: !!id,
  });
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: MemberInsert) => {
      const id = member.id || localRepository.generateUUID();
      const membershipId = member.membership_id || await generateSequentialMembershipId(
        member.lga || "",
        member.ward || "",
        member.polling_unit || "",
        member.voters_card_id
      );
      
      const newMember = {
        ...member,
        id,
        membership_id: membershipId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 1. Instantly write to local IndexedDB (Optimistic UI update)
      await localRepository.saveMember(newMember as any);

      // 2. Queue the mutation in background outbox
      await localRepository.enqueueAction("members", "INSERT", id, newMember);

      // 3. Trigger background Supabase synchronization
      syncManager.sync();

      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Member registered successfully (Saved locally)");
    },
    onError: (error) => {
      console.error("Error creating member:", error);
      toast.error(`Failed to register member: ${error.message}`);
    },
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Member> & { id: string }) => {
      // 1. Get existing record from IndexedDB
      const existing = await localRepository.getMemberById(id);
      
      const updatedMember = {
        ...(existing || {}),
        ...updates,
        id,
        updated_at: new Date().toISOString()
      };

      // 2. Instantly update local IndexedDB (Optimistic UI update)
      await localRepository.saveMember(updatedMember as any);

      // 3. Queue mutation
      await localRepository.enqueueAction("members", "UPDATE", id, updates);

      // 4. Trigger background sync
      syncManager.sync();

      return updatedMember;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["member", data.id] });
        queryClient.invalidateQueries({ queryKey: ["member-attendance", data.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Member updated successfully (Saved locally)");
    },
    onError: (error) => {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    },
  });
};

export const useMemberStats = (
  organizationId?: string | null,
  pollingUnitId?: string,
  pollingUnitName?: string,
  scope: MemberScope = "all",
  allowedLgas?: string[],
  allowedWard?: string,
) => {
  return useQuery({
    queryKey: ["members", "stats", scope, organizationId, pollingUnitId, pollingUnitName, allowedLgas, allowedWard],
    enabled: scope !== "polling_unit" || !!pollingUnitId || !!pollingUnitName,
    queryFn: async () => {
      // 1. Check local cache first
      let list = await localRepository.getMembers();
      
      // Apply filters locally
      if (scope === "polling_unit") {
        if (pollingUnitId && pollingUnitName) {
          list = list.filter(m => m.polling_unit_id === pollingUnitId || m.polling_unit === pollingUnitName);
        } else if (pollingUnitId) {
          list = list.filter(m => m.polling_unit_id === pollingUnitId);
        } else if (pollingUnitName) {
          list = list.filter(m => m.polling_unit === pollingUnitName);
        }
      } else if (scope === "organization" && organizationId) {
        list = list.filter(m => m.organization_id === organizationId || m.support_group_id === organizationId);
      }

      if (allowedWard) {
        list = list.filter(m => m.ward === allowedWard);
      }

      if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
        list = list.filter(m => m.lga && allowedLgas.includes(m.lga));
      }

      // If local cache has data, calculate statistics locally
      if (list.length > 0) {
        const activeMembers = list.filter((m: any) => !m.is_deceased);
        const total = activeMembers.length;
        const active = activeMembers.filter((m) => m.status === "active").length;
        return { total, active, inactive: total - active };
      }

      // 2. Fallback to Supabase
      let query = supabase.from("members").select("status, is_deceased");

      if (scope === "polling_unit") {
        if (pollingUnitId && pollingUnitName) {
          query = query.or(`polling_unit_id.eq.${pollingUnitId},polling_unit.eq.${pollingUnitName}`);
        } else if (pollingUnitId) {
          query = query.eq("polling_unit_id", pollingUnitId);
        } else if (pollingUnitName) {
          query = query.eq("polling_unit", pollingUnitName);
        }
      } else if (scope === "organization" && organizationId) {
        query = query.or(`organization_id.eq.${organizationId},support_group_id.eq.${organizationId}`);
      }

      if (allowedWard) {
        query = query.eq("ward", allowedWard);
      }

      if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
        query = query.in("lga", allowedLgas);
      }

      const { data, error } = await query;
      if (error) throw error;

      const activeMembers = (data || []).filter((m: any) => !m.is_deceased);
      const total = activeMembers.length;
      const active = activeMembers.filter((m) => m.status === "active").length;

      return { total, active, inactive: total - active };
    },
  });
};

export const useVerifyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Get existing member from local IndexedDB
      const existing = await localRepository.getMemberById(id);
      
      const updatedMember = {
        ...(existing || {}),
        id,
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by_agent_id: user.id,
        updated_at: new Date().toISOString()
      };

      // 2. Instantly update local IndexedDB (Optimistic UI update)
      await localRepository.saveMember(updatedMember as any);

      // 3. Queue mutation
      await localRepository.enqueueAction("members", "UPDATE", id, {
        is_verified: true,
        verified_at: updatedMember.verified_at,
        verified_by_agent_id: user.id
      });

      // 4. Trigger background sync
      syncManager.sync();

      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Member verified successfully! (Saved locally)");
    },
    onError: (error: any) => {
      console.error("Error verifying member:", error);
      toast.error(`Verification failed: ${error.message}`);
    },
  });
};
