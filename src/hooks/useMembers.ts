import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";
import { localRepository } from "@/services/LocalRepository";
import { syncManager } from "@/services/SyncManager";
import { generateSequentialMembershipId } from "@/lib/campaign-data";
import { offlineDb } from "@/services/offlineDb";

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

export const MEMBER_VALID_COLUMNS = new Set([
  "id",
  "membership_id",
  "full_name",
  "email",
  "phone",
  "state",
  "lga",
  "ward",
  "polling_unit",
  "polling_unit_id",
  "gender",
  "date_of_birth",
  "voters_card_id",
  "pvc_status",
  "created_by",
  "social_media_handle",
  "bank_name",
  "account_number",
  "marital_status",
  "occupation",
  "school_name",
  "school_level",
  "status",
  "is_verified",
  "created_at",
  "updated_at",
]);

export function cleanMemberForDb(raw: any): any {
  if (!raw) return {};
  const clean: any = {};
  for (const [k, v] of Object.entries(raw)) {
    if (MEMBER_VALID_COLUMNS.has(k) && v !== undefined) {
      if ((k === "id" || k === "created_by" || k === "polling_unit_id") && v === "") {
        clean[k] = null;
      } else {
        clean[k] = v;
      }
    }
  }
  return clean;
}

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
          .select("*")
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
          const wardVariants = Array.from(new Set([
            allowedWard,
            allowedWard.toUpperCase(),
            allowedWard.toLowerCase(),
            allowedWard.charAt(0).toUpperCase() + allowedWard.slice(1).toLowerCase()
          ]));
          query = query.in("ward", wardVariants);
        }

        if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
          const lgaVariants = Array.from(new Set(
            allowedLgas.flatMap(l => [
              l,
              l.toUpperCase(),
              l.toLowerCase(),
              l.charAt(0).toUpperCase() + l.slice(1).toLowerCase()
            ])
          ));
          query = query.in("lga", lgaVariants);
        }

        const networkResult = await withTimeout(
          query,
          4000,
          { data: null, error: new Error("Network query timed out") }
        );

        const { data, error } = networkResult as any;
        if (!error && data) {
          // Sync local cache: delete cached records for this scope before saving fresh ones
          let cachedList = await localRepository.getMembers();
          if (scope === "polling_unit") {
            if (pollingUnitId && pollingUnitName) {
              cachedList = cachedList.filter(m => m.polling_unit_id === pollingUnitId || m.polling_unit === pollingUnitName);
            } else if (pollingUnitId) {
              cachedList = cachedList.filter(m => m.polling_unit_id === pollingUnitId);
            } else if (pollingUnitName) {
              cachedList = cachedList.filter(m => m.polling_unit === pollingUnitName);
            }
          } else if (scope === "organization" && organizationId) {
            cachedList = cachedList.filter(m => m.organization_id === organizationId || m.support_group_id === organizationId);
          } else if (scope === "all") {
            if (allowedWard) {
              cachedList = cachedList.filter(m => m.ward && m.ward.toLowerCase() === allowedWard.toLowerCase());
            }
            if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
              cachedList = cachedList.filter(m => m.lga && allowedLgas.some(al => al.toLowerCase() === m.lga.toLowerCase()));
            }
          }
          
          for (const m of cachedList) {
            await offlineDb.members.delete(m.id);
          }

          if (data.length > 0) {
            for (const member of data) {
              await localRepository.saveMember(member);
            }
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
        list = list.filter(m => m.ward && m.ward.toLowerCase() === allowedWard.toLowerCase());
      }

      if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
        list = list.filter(m => m.lga && allowedLgas.some(al => al.toLowerCase() === m.lga.toLowerCase()));
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
        .select("*")
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
      const id = member.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : localRepository.generateUUID());
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
      const cleanRecord = cleanMemberForDb(newMember);
      try {
        const { data, error } = await supabase
          .from("members")
          .insert(cleanRecord)
          .select()
          .maybeSingle();

        if (error) {
          console.warn("Direct Supabase insert failed, enqueuing for background sync:", error);
          await localRepository.enqueueAction("members", "INSERT", id, cleanRecord);
        } else if (data) {
          await localRepository.saveMember(data as any);
          return data;
        }
      } catch (err) {
        console.warn("Network error inserting member, enqueuing for background sync:", err);
        await localRepository.enqueueAction("members", "INSERT", id, cleanRecord);
      }

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
        list = list.filter(m => m.ward && m.ward.toLowerCase() === allowedWard.toLowerCase());
      }

      if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
        list = list.filter(m => m.lga && allowedLgas.some(al => al.toLowerCase() === m.lga.toLowerCase()));
      }

      // If local cache has data, calculate statistics locally
      if (list.length > 0) {
        const activeMembers = list;
        const total = activeMembers.length;
        const active = activeMembers.filter((m) => m.status === "active").length;
        return { total, active, inactive: total - active };
      }

      // 2. Fallback to Supabase
      let query = supabase.from("members").select("status");

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
          const wardVariants = Array.from(new Set([
            allowedWard,
            allowedWard.toUpperCase(),
            allowedWard.toLowerCase(),
            allowedWard.charAt(0).toUpperCase() + allowedWard.slice(1).toLowerCase()
          ]));
          query = query.in("ward", wardVariants);
        }

      if (allowedLgas && allowedLgas.length > 0 && !allowedLgas.includes("ALL")) {
          const lgaVariants = Array.from(new Set(
            allowedLgas.flatMap(l => [
              l,
              l.toUpperCase(),
              l.toLowerCase(),
              l.charAt(0).toUpperCase() + l.slice(1).toLowerCase()
            ])
          ));
          query = query.in("lga", lgaVariants);
        }

      const { data, error } = await query;
      if (error) throw error;

      const activeMembers = data || [];
      const total = activeMembers.length;
      const active = activeMembers.filter((m) => m.status === "active").length;

      return { total, active, inactive: total - active };
    },
  });
};

export const useVerifyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: string | { id: string; memberData?: Partial<Member> }) => {
      const id = typeof payload === "string" ? payload : payload.id;
      const passedMember = typeof payload === "object" ? payload.memberData : undefined;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Get existing member from local IndexedDB or passed data
      const existing = (await localRepository.getMemberById(id)) || passedMember || {};

      const now = new Date().toISOString();
      const updatedMember = {
        ...existing,
        id,
        is_verified: true,
        verified_at: now,
        verified_by_agent_id: user.id,
        updated_at: now
      };

      // 2. Try direct update to Supabase first if online
      let onlineSuccess = false;
      try {
        const { error } = await withTimeout(
          supabase
            .from("members")
            .update({
              is_verified: true,
              verified_at: now,
              verified_by_agent_id: user.id,
              updated_at: now
            })
            .eq("id", id),
          8000,
          { error: new Error("Supabase update timed out") } as any
        );

        if (!error) {
          onlineSuccess = true;
        }
      } catch (err) {
        console.warn("Direct Supabase update failed, will rely on sync queue:", err);
      }

      // 3. Save to local IndexedDB (Optimistic UI update)
      await localRepository.saveMember(updatedMember as any);

      // 4. If direct update didn't succeed (offline or timeout), queue for background sync
      if (!onlineSuccess) {
        await localRepository.enqueueAction("members", "UPDATE", id, {
          is_verified: true,
          verified_at: now,
          verified_by_agent_id: user.id
        });
        syncManager.sync();
      }

      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Member physically verified successfully!");
    },
    onError: (error: any) => {
      console.error("Error verifying member:", error);
      toast.error(`Verification failed: ${error.message}`);
    },
  });
};
