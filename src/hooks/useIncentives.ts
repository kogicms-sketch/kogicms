import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

export interface IncentiveBatch {
  id: string;
  name: string;
  type: 'cash' | 'material' | 'grant' | 'other';
  item_name: string;
  amount_per_member: number;
  total_packages: number;
  allocated_packages: number;
  disbursed_packages: number;
  funder_id: string | null;
  funder_name: string;
  funder_role: string;
  target_lga: string | null;
  target_ward: string | null;
  status: 'active' | 'completed' | 'cancelled';
  received_status?: 'pending' | 'received';
  created_at: string;
  updated_at: string;
}

export interface MemberIncentive {
  id: string;
  batch_id: string;
  member_id: string;
  status: 'allocated' | 'disbursed';
  allocated_at: string;
  disbursed_at: string | null;
  disbursed_by_user_id: string | null;
  disbursed_by_name: string | null;
  phone_number: string | null;
  audit_status: 'pending' | 'verified' | 'flagged';
  audit_by_user_id: string | null;
  audit_at: string | null;
  audit_notes: string | null;
  created_at: string;
  updated_at: string;
  member?: {
    full_name: string;
    phone: string | null;
    lga: string | null;
    ward: string | null;
    polling_unit: string | null;
  };
  batch?: IncentiveBatch;
}

export const useIncentiveBatches = (filters?: {
  target_lga?: string;
  target_ward?: string;
  funder_id?: string;
}) => {
  return useQuery({
    queryKey: ["incentive-batches", filters],
    queryFn: async () => {
      let query = supabase.from("incentive_batches").select("*").order("created_at", { ascending: false });

      if (filters?.target_lga) {
        query = query.eq("target_lga", filters.target_lga);
      }
      if (filters?.target_ward) {
        query = query.eq("target_ward", filters.target_ward);
      }
      if (filters?.funder_id) {
        query = query.eq("funder_id", filters.funder_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as IncentiveBatch[];
    },
  });
};

export const useIncentiveBatch = (id: string) => {
  return useQuery({
    queryKey: ["incentive-batch", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incentive_batches")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as IncentiveBatch | null;
    },
    enabled: !!id,
  });
};

export const useCreateIncentiveBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: Omit<IncentiveBatch, "id" | "allocated_packages" | "disbursed_packages" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("incentive_batches")
        .insert({
          ...batch,
          funder_id: user.id,
          allocated_packages: 0,
          disbursed_packages: 0,
          received_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as IncentiveBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incentive-batches"] });
      toast.success("Incentive package allocated and routed successfully!");
    },
    onError: (error) => {
      console.error("Error creating incentive batch:", error);
      toast.error(`Failed to route package: ${error.message}`);
    },
  });
};

export const useAcceptIncentiveBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase
        .from("incentive_batches")
        .update({
          received_status: "received",
        })
        .eq("id", batchId)
        .select()
        .single();

      if (error) throw error;
      return data as IncentiveBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incentive-batches"] });
      toast.success("Incentive allocation received and accepted!");
    },
    onError: (error: any) => {
      console.error("Error accepting incentive batch:", error);
      toast.error(`Acceptance failed: ${error.message}`);
    },
  });
};

export const useMemberIncentives = (filters?: {
  member_id?: string;
  batch_id?: string;
  status?: string;
  audit_status?: string;
}) => {
  return useQuery({
    queryKey: ["member-incentives", filters],
    queryFn: async () => {
      let query = supabase
        .from("member_incentives")
        .select(`
          *,
          member:member_id (full_name, phone, lga, ward, polling_unit),
          batch:batch_id (*)
        `)
        .order("created_at", { ascending: false });

      if (filters?.member_id) {
        query = query.eq("member_id", filters.member_id);
      }
      if (filters?.batch_id) {
        query = query.eq("batch_id", filters.batch_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.audit_status) {
        query = query.eq("audit_status", filters.audit_status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[] as MemberIncentive[];
    },
  });
};

export const useAllocateIncentive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batch_id, member_id }: { batch_id: string; member_id: string }) => {
      // 1. Insert allocation record
      const { data, error } = await supabase
        .from("member_incentives")
        .insert({
          batch_id,
          member_id,
          status: "allocated",
          audit_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Increment allocated packages
      const { data: batchData, error: batchError } = await supabase.rpc("increment_batch_allocated", {
        _batch_id: batch_id
      });
      
      // If RPC fails, try doing it via standard update
      if (batchError) {
        const { data: currentBatch } = await supabase
          .from("incentive_batches")
          .select("allocated_packages")
          .eq("id", batch_id)
          .single();
        
        await supabase
          .from("incentive_batches")
          .update({ allocated_packages: (currentBatch?.allocated_packages || 0) + 1 })
          .eq("id", batch_id);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member-incentives"] });
      queryClient.invalidateQueries({ queryKey: ["incentive-batches"] });
      queryClient.invalidateQueries({ queryKey: ["incentive-batch", variables.batch_id] });
      toast.success("Incentive allocated to member!");
    },
    onError: (error: any) => {
      console.error("Error allocating incentive:", error);
      toast.error(`Allocation failed: ${error.message}`);
    },
  });
};

export const useDisburseIncentive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      batch_id, 
      member_id,
      phone_number 
    }: { 
      id?: string; 
      batch_id: string; 
      member_id: string;
      phone_number: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const execName = profile?.full_name || user.email || "Ward Admin";

      let recordId = id;

      // If id is not provided, check if an allocation already exists
      if (!recordId) {
        const { data: existing } = await supabase
          .from("member_incentives")
          .select("id")
          .eq("batch_id", batch_id)
          .eq("member_id", member_id)
          .maybeSingle();

        if (existing) {
          recordId = existing.id;
        }
      }

      let result;

      if (recordId) {
        // Update existing allocation to disbursed
        const { data, error } = await supabase
          .from("member_incentives")
          .update({
            status: "disbursed",
            disbursed_at: new Date().toISOString(),
            disbursed_by_user_id: user.id,
            disbursed_by_name: execName,
            phone_number: phone_number,
          })
          .eq("id", recordId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new disbursed record directly
        const { data, error } = await supabase
          .from("member_incentives")
          .insert({
            batch_id,
            member_id,
            status: "disbursed",
            disbursed_at: new Date().toISOString(),
            disbursed_by_user_id: user.id,
            disbursed_by_name: execName,
            phone_number: phone_number,
            audit_status: "pending",
          })
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Increment allocated packages too since it went straight to disbursed
        await supabase.rpc("increment_batch_allocated", { _batch_id: batch_id }).catch(() => {});
      }

      // Increment disbursed packages in batch
      const { error: batchErr } = await supabase.rpc("increment_batch_disbursed", {
        _batch_id: batch_id
      });

      if (batchErr) {
        // Fallback update
        const { data: currentBatch } = await supabase
          .from("incentive_batches")
          .select("allocated_packages, disbursed_packages, total_packages")
          .eq("id", batch_id)
          .single();
        
        const updates: any = {
          disbursed_packages: (currentBatch?.disbursed_packages || 0) + 1
        };

        // If direct disbursement, ensure allocated is also incremented
        if (!recordId) {
          updates.allocated_packages = (currentBatch?.allocated_packages || 0) + 1;
        }

        // If fully disbursed, mark as completed
        if ((currentBatch?.disbursed_packages || 0) + 1 >= (currentBatch?.total_packages || 0)) {
          updates.status = "completed";
        }

        await supabase
          .from("incentive_batches")
          .update(updates)
          .eq("id", batch_id);
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member-incentives"] });
      queryClient.invalidateQueries({ queryKey: ["incentive-batches"] });
      queryClient.invalidateQueries({ queryKey: ["incentive-batch", variables.batch_id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", variables.member_id] });
      toast.success("Package marked as disbursed and verified!");
    },
    onError: (error: any) => {
      console.error("Error disbursing incentive:", error);
      toast.error(`Disbursement failed: ${error.message}`);
    },
  });
};

export const useAuditIncentive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      audit_status,
      audit_notes,
    }: {
      id: string;
      audit_status: 'verified' | 'flagged';
      audit_notes: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("member_incentives")
        .update({
          audit_status,
          audit_notes,
          audit_at: new Date().toISOString(),
          audit_by_user_id: user.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-incentives"] });
      toast.success("Audit verification submitted successfully!");
    },
    onError: (error: any) => {
      console.error("Error auditing incentive:", error);
      toast.error(`Audit submit failed: ${error.message}`);
    },
  });
};
