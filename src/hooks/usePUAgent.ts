import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

export interface PollingUnitAgent {
    id: string;
    user_id: string;
    councillor_id: string;
    polling_unit_id: string | null;
    polling_unit_name: string;
    ward: string;
    lga: string;
    agent_name: string;
    phone: string | null;
    email: string;
    is_active: boolean;
}

export const usePUAgent = () => {
    return useQuery({
        queryKey: ["pu-agent-profile"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await (supabase
                .from("polling_unit_agents" as any)
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle() as any);

            if (error) {
                console.error("Error fetching PU agent profile:", error);
                return null;
            }
            return data as PollingUnitAgent | null;
        },
    });
};
