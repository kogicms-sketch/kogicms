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
            // 1. Direct check: local storage cached pu_agent_profile
            if (typeof window !== "undefined") {
                const cachedProfile = localStorage.getItem("pu_agent_profile");
                if (cachedProfile) {
                    try {
                        const parsed = JSON.parse(cachedProfile);
                        if (parsed && (parsed.polling_unit_name || parsed.polling_unit_id)) {
                            return parsed as PollingUnitAgent;
                        }
                    } catch {}
                }
            }

            // 2. Fetch authenticated user (with safe offline/catch wrapper)
            let user: any = null;
            try {
                const { data } = await supabase.auth.getUser();
                user = data?.user;
            } catch (e) {
                console.warn("Notice: supabase.auth.getUser() exception in usePUAgent:", e);
            }

            // Fallback user from local storage if network call failed
            if (!user && typeof window !== "undefined") {
                const authEmail = localStorage.getItem("auth_email");
                const rawMock = localStorage.getItem("mock_users");
                if (authEmail && rawMock) {
                    try {
                        const list = JSON.parse(rawMock);
                        const found = list.find((u: any) => u.email?.toLowerCase().trim() === authEmail.toLowerCase().trim());
                        if (found) {
                            user = {
                                id: found.id,
                                email: found.email,
                                user_metadata: {
                                    full_name: found.full_name || found.name,
                                    role: found.role,
                                    lga: found.lga,
                                    ward: found.ward,
                                    polling_unit_id: found.polling_unit_id,
                                    polling_unit_name: found.polling_unit_name || found.pollingUnit,
                                    phone: found.phoneNumber || found.phone,
                                }
                            };
                        }
                    } catch {}
                }
            }

            // 3. Check local storage assigned_pu_agents
            if (typeof window !== "undefined") {
                try {
                    const assignedLocal = JSON.parse(localStorage.getItem("assigned_pu_agents") || "{}");
                    const userEmail = (user?.email || localStorage.getItem("auth_email") || "").toLowerCase().trim();
                    for (const [, agentInfo] of Object.entries(assignedLocal) as [string, any][]) {
                        if (
                            (agentInfo.email && agentInfo.email.toLowerCase().trim() === userEmail) ||
                            (user?.id && agentInfo.user_id === user.id) ||
                            (user?.user_metadata?.polling_unit_id && agentInfo.pu_id === user.user_metadata.polling_unit_id)
                        ) {
                            const matched: PollingUnitAgent = {
                                id: agentInfo.id || user?.id || "USR-PU-01",
                                user_id: user?.id || agentInfo.id || "USR-PU-01",
                                councillor_id: null,
                                polling_unit_id: agentInfo.pu_id || agentInfo.id || user?.user_metadata?.polling_unit_id || "LOKOJA-W10-PU001",
                                polling_unit_name: agentInfo.pu_name || user?.user_metadata?.polling_unit_name || "Eggan Tifain Area LGEA Sch Eggan",
                                ward: agentInfo.ward || user?.user_metadata?.ward || "Eggan",
                                lga: agentInfo.lga || user?.user_metadata?.lga || "Lokoja",
                                agent_name: agentInfo.agent_name || user?.user_metadata?.full_name || "Field Agent",
                                phone: agentInfo.phone || user?.user_metadata?.phone || null,
                                email: agentInfo.email || user?.email || "",
                                is_active: true,
                            };
                            localStorage.setItem("pu_agent_profile", JSON.stringify(matched));
                            return matched;
                        }
                    }
                } catch (e) {
                    console.warn("Error reading assigned_pu_agents in usePUAgent:", e);
                }
            }

            // 4. Try Supabase polling_unit_agents table if network is reachable
            if (user?.id) {
                try {
                    const { data, error } = await (supabase
                        .from("polling_unit_agents" as any)
                        .select("*")
                        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
                        .maybeSingle() as any);

                    if (!error && data) {
                        if (typeof window !== "undefined") {
                            localStorage.setItem("pu_agent_profile", JSON.stringify(data));
                        }
                        return data as PollingUnitAgent;
                    }
                } catch (err) {
                    console.warn("Notice: polling_unit_agents query fallback:", err);
                }
            }

            // 5. Match from user metadata if user has an assigned polling unit
            if (user?.user_metadata?.polling_unit_name || user?.user_metadata?.polling_unit_id) {
                const metaAgent: PollingUnitAgent = {
                    id: user.id,
                    user_id: user.id,
                    councillor_id: null,
                    polling_unit_id: user.user_metadata?.polling_unit_id || "LOKOJA-W10-PU001",
                    polling_unit_name: user.user_metadata.polling_unit_name || "Eggan Tifain Area LGEA Sch Eggan",
                    ward: user.user_metadata?.ward || "Eggan",
                    lga: user.user_metadata?.lga || "Lokoja",
                    agent_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Polling Unit Agent",
                    phone: user.user_metadata?.phone || null,
                    email: user.email || "",
                    is_active: true,
                };
                if (typeof window !== "undefined") {
                    localStorage.setItem("pu_agent_profile", JSON.stringify(metaAgent));
                }
                return metaAgent;
            }

            // 6. Default fallback if user has polling_unit_agent role
            const cachedRole = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null;
            if (cachedRole === "polling_unit_agent" || user?.user_metadata?.role === "polling_unit_agent") {
                const defaultAgent: PollingUnitAgent = {
                    id: user?.id || "USR-PU-01",
                    user_id: user?.id || "USR-PU-01",
                    councillor_id: null,
                    polling_unit_id: "LOKOJA-W10-PU001",
                    polling_unit_name: "Eggan Tifain Area LGEA Sch Eggan",
                    ward: "Eggan",
                    lga: "Lokoja",
                    agent_name: user?.user_metadata?.full_name || "Grace Onoja",
                    phone: user?.user_metadata?.phone || "07055443322",
                    email: user?.email || "agent.pu001@kogicms.ng",
                    is_active: true,
                };
                if (typeof window !== "undefined") {
                    localStorage.setItem("pu_agent_profile", JSON.stringify(defaultAgent));
                }
                return defaultAgent;
            }

            return null;
        },
    });
};
