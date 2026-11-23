import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { getLocalSupportGroups } from "./useSupportGroups";

export const useUserOrganization = () => {
  const { user, role, organizationId } = useAuth();

  return useQuery({
    queryKey: ["user-organization", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // 1. Check local support groups first for immediate access
      const localGroups = getLocalSupportGroups();
      const localMatch = localGroups.find((g) => g.id === organizationId);
      if (localMatch) {
        return {
          id: localMatch.id,
          name: localMatch.name,
          type: localMatch.type,
        };
      }

      // 2. Select from Supabase with timeout fallback
      try {
        const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), 1200)
        );
        const fetchPromise = supabase
          .from("organizations")
          .select("id, name, type")
          .eq("id", organizationId)
          .maybeSingle();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Could not fetch organization from Supabase:", err);
      }

      // Fallback to first available local group if exists
      if (localGroups.length > 0) {
        return {
          id: localGroups[0].id,
          name: localGroups[0].name,
          type: localGroups[0].type,
        };
      }

      return null;
    },
    enabled: !!organizationId && role === "org_admin",
  });
};
