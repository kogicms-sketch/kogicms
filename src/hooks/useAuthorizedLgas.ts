import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";

export const useAuthorizedLgas = () => {
    const { user, role } = useAuth();
    const db = supabase as any;

    return useQuery({
        queryKey: ["authorized-lgas", user?.id, role],
        queryFn: async () => {
            if (!user || !role) return [];

            if (role === "super_admin" || role === "org_admin") {
                // Return all possible LGAs or a flag for "all"
                return ["ALL"];
            }

            if (role === "senatorial_leader") {
                const { data } = await db
                    .from("senatorial_leaders")
                    .select("lga_list")
                    .eq("user_id", user.id)
                    .single();
                return data?.lga_list || [];
            }

            if (role === "federal_rep") {
                const { data } = await db
                    .from("federal_reps")
                    .select("lga_list")
                    .eq("user_id", user.id)
                    .single();
                return data?.lga_list || [];
            }

            if (role === "house_assembly_member") {
                const { data } = await db
                    .from("house_assembly_members")
                    .select("lga")
                    .eq("user_id", user.id)
                    .single();
                return data?.lga ? [data.lga] : [];
            }

            if (role === "lga_chairman") {
                const { data } = await supabase
                    .from("profiles")
                    .select("lga")
                    .eq("id", user.id)
                    .single();
                return data?.lga ? [data.lga] : [];
            }

            if (role === "councillor") {
                const { data } = await supabase
                    .from("profiles")
                    .select("lga")
                    .eq("id", user.id)
                    .single();
                return data?.lga ? [data.lga] : [];
            }
            
            if (role === "polling_unit_agent") {
                 const { data } = await supabase
                    .from("profiles")
                    .select("lga")
                    .eq("id", user.id)
                    .single();
                return data?.lga ? [data.lga] : [];
            }

            return [];
        },
        enabled: !!user && !!role,
    });
};
