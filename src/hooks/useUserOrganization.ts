import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserOrganization = () => {
  const { user, role, organizationId } = useAuth();

  return useQuery({
    queryKey: ["user-organization", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // Select specific columns to avoid errors if schema is out of sync
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, type")
        .eq("id", organizationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && role === "org_admin",
  });
};
