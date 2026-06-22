import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";

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

      const { data, error } = await query;

      if (error) throw error;
      return (data as any) as MemberWithOrganization[];
    },
  });
};

export const useMember = (id: string) => {
  return useQuery({
    queryKey: ["members", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select(`
          *,
          organizations:organization_id (name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return (data as any) as MemberWithOrganization | null;
    },
    enabled: !!id,
  });
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: MemberInsert) => {
      const membershipId = `DR-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from("members")
        .insert({ ...member, membership_id: membershipId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Member registered successfully");
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
      const { data, error } = await supabase
        .from("members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["member", data.id] });
        queryClient.invalidateQueries({ queryKey: ["member-attendance", data.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Member updated successfully");
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

      const { data: role, error: roleError } = await (supabase as any).rpc("get_user_role", {
        _user_id: user.id,
      });
      if (roleError) throw roleError;

      if (role === "polling_unit_agent") {
        const { data: agent, error: agentError } = await (supabase as any)
          .from("polling_unit_agents")
          .select("polling_unit_id, polling_unit_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (agentError) throw agentError;
        if (!agent?.polling_unit_id && !agent?.polling_unit_name) {
          throw new Error("Agent is not assigned to a polling unit.");
        }

        const { data: member, error: memberError } = await (supabase as any)
          .from("members")
          .select("id, polling_unit_id, polling_unit")
          .eq("id", id)
          .maybeSingle();

        if (memberError) throw memberError;

        const matchesPollingUnit =
          (!!agent?.polling_unit_id && agent.polling_unit_id === member?.polling_unit_id) ||
          (!!agent?.polling_unit_name && agent.polling_unit_name === member?.polling_unit);

        if (!matchesPollingUnit) {
          throw new Error("Agents can only verify members within their assigned polling unit.");
        }
      }

      const { error } = await (supabase as any)
        .from("members")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by_agent_id: user.id,
        })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["demographics"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin"] });
      toast.success("Member verified successfully!");
    },
    onError: (error: any) => {
      console.error("Error verifying member:", error);
      toast.error(`Verification failed: ${error.message}`);
    },
  });
};
