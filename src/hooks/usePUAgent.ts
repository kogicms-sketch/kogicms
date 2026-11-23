"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

export interface PollingUnitAgent {
    id: string;
    user_id: string;
    councillor_id?: string | null;
    polling_unit_id: string | null;
    polling_unit_name: string;
    ward: string;
    lga: string;
    agent_name: string;
    phone: string | null;
    email: string;
    is_active: boolean;
    status?: string;
}

export const usePUAgent = () => {
    return useQuery({
        queryKey: ["pu-agent-profile"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // 1. Check local storage assigned_pu_agents first
            if (typeof window !== "undefined") {
                try {
                    const assignedLocal = JSON.parse(localStorage.getItem("assigned_pu_agents") || "{}");
                    const userEmail = (user.email || "").toLowerCase().trim();
                    for (const [, agentInfo] of Object.entries(assignedLocal) as [string, any][]) {
                        if (
                            (agentInfo.email && agentInfo.email.toLowerCase().trim() === userEmail) ||
                            (agentInfo.user_id && agentInfo.user_id === user.id) ||
                            (agentInfo.pu_id && agentInfo.pu_id === user.user_metadata?.polling_unit_id)
                        ) {
                            return {
                                id: agentInfo.id || user.id,
                                user_id: user.id,
                                councillor_id: null,
                                polling_unit_id: agentInfo.pu_id || agentInfo.id || user.user_metadata?.polling_unit_id || null,
                                polling_unit_name: agentInfo.pu_name || user.user_metadata?.polling_unit_name || "Assigned Polling Unit",
                                ward: agentInfo.ward || user.user_metadata?.ward || "Ward",
                                lga: agentInfo.lga || user.user_metadata?.lga || "Lokoja",
                                agent_name: agentInfo.agent_name || user.user_metadata?.full_name || "Field Agent",
                                phone: agentInfo.phone || user.user_metadata?.phone || null,
                                email: agentInfo.email || user.email || "",
                                is_active: true,
                            };
                        }
                    }
                } catch (e) {
                    console.warn("Error reading assigned_pu_agents in usePUAgent:", e);
                }
            }

            // 2. Try Supabase polling_unit_agents table
            try {
                const { data, error } = await (supabase
                    .from("polling_unit_agents" as any)
                    .select("*")
                    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
                    .maybeSingle() as any);

                if (!error && data) {
                    return data as PollingUnitAgent;
                }
            } catch (err) {
                console.warn("Notice: polling_unit_agents query fallback:", err);
            }

            // 3. Fallback to user metadata
            if (user.user_metadata?.polling_unit_name || user.user_metadata?.ward || user.user_metadata?.role === "polling_unit_agent") {
                return {
                    id: user.id,
                    user_id: user.id,
                    councillor_id: null,
                    polling_unit_id: user.user_metadata?.polling_unit_id || null,
                    polling_unit_name: user.user_metadata?.polling_unit_name || "Eggan Tifain Area LGEA Sch Eggan",
                    ward: user.user_metadata?.ward || "Eggan",
                    lga: user.user_metadata?.lga || "Lokoja",
                    agent_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Polling Unit Agent",
                    phone: user.user_metadata?.phone || null,
                    email: user.email || "",
                    is_active: true,
                };
            }

            // 4. Default mock/fallback if user role is polling_unit_agent
            const cachedRole = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null;
            if (cachedRole === "polling_unit_agent") {
                return {
                    id: user.id,
                    user_id: user.id,
                    councillor_id: null,
                    polling_unit_id: "LOKOJA-W10-PU001",
                    polling_unit_name: "Eggan Tifain Area LGEA Sch Eggan",
                    ward: "Eggan",
                    lga: "Lokoja",
                    agent_name: user.user_metadata?.full_name || "Polling Unit Agent",
                    phone: user.user_metadata?.phone || "08012345678",
                    email: user.email || "agent@kogicms.ng",
                    is_active: true,
                };
            }

            return null;
        },
    });
};
