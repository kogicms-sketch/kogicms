import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";

export type Activity = Tables<"activities">;
export type ActivityInsert = TablesInsert<"activities">;

export type ActivityWithOrganization = Activity & {
  organizations: { name: string } | null;
};

export const useActivities = (organizationId?: string, status?: string) => {
  return useQuery({
    queryKey: ["activities", organizationId, status],
    queryFn: async () => {
      let query = supabase
        .from("activities")
        .select(`
          *,
          organizations:organization_id (name)
        `)
        .order("scheduled_date", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ActivityWithOrganization[];
    },
  });
};

export const useActivity = (id: string) => {
  return useQuery({
    queryKey: ["activities", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          organizations:organization_id (name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as ActivityWithOrganization | null;
    },
    enabled: !!id,
  });
};

export const useCreateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: ActivityInsert) => {
      const { data, error } = await supabase
        .from("activities")
        .insert(activity)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Activity created successfully");
    },
    onError: (error) => {
      console.error("Error creating activity:", error);
      toast.error("Failed to create activity");
    },
  });
};

export const useUpdateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Activity> & { id: string }) => {
      const { data, error } = await supabase
        .from("activities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Activity updated successfully");
    },
    onError: (error) => {
      console.error("Error updating activity:", error);
      toast.error("Failed to update activity");
    },
  });
};

export const useActivityStats = (organizationId?: string | null) => {
  return useQuery({
    queryKey: ["activities", "stats", organizationId],
    queryFn: async () => {
      let query = supabase.from("activities").select("status");
      
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data.length;
      const planned = data.filter((a) => a.status === "planned").length;
      const ongoing = data.filter((a) => a.status === "ongoing").length;
      const completed = data.filter((a) => a.status === "completed").length;
      
      return { total, planned, ongoing, completed };
    },
  });
};
