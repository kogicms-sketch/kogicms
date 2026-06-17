import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";

export type Organization = Tables<"organizations">;
export type OrganizationInsert = TablesInsert<"organizations">;

export const useOrganizations = () => {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*");
      // .order("created_at", { ascending: false }); // Commented out to prevent 400 error if column missing

      if (error) throw error;
      return data as Organization[];
    },
  });
};

export const useOrganization = (id: string) => {
  return useQuery({
    queryKey: ["organizations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Organization | null;
    },
    enabled: !!id,
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (org: OrganizationInsert) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert(org)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created successfully");
    },
    onError: (error) => {
      console.error("Error creating organization:", error);
      toast.error("Failed to create organization");
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization updated successfully");
    },
    onError: (error) => {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization");
    },
  });
};
