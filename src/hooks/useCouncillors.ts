import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { localRepository } from "@/services/LocalRepository";
import { ALL_POLLING_UNITS, ALL_WARDS } from "@/data/aggregated_lga_data";
import { getLocalCouncillors } from "./useChairmen";
import { getLocalStarredAgents } from "@/services/AgentService";

// Types
export interface Councillor {
    id: string;
    user_id: string;
    chairman_id: string;
    lga: string;
    ward: string;
    councillor_name: string;
    phone: string | null;
    email: string;
    must_change_password: boolean;
    last_password_change: string | null;
    is_active: boolean;
    photo_url: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CouncillorWardData {
    ward: string;
    lga: string;
    totalPollingUnits: number;
    totalRegisteredVoters: number;
    totalMembers: number;
    verifiedMembers: number;
    pendingVerification: number;
    remainingVoters: number;
    expectedTurnoutRate: string;
    maleVoters: number;
    femaleVoters: number;
    malePct: string;
    femalePct: string;
    assignedAgentsCount: number;
    totalActivities: number;
    pollingUnits: any[];
}

export const isMemberVerifiedRecord = (m: any): boolean => {
    if (!m) return false;
    return (
        m.is_verified === true ||
        m.is_verified === 1 ||
        m.is_verified === "true" ||
        m.status === "verified" ||
        m.status === "active" ||
        m.verification_status === "verified" ||
        !!m.verified_at
    );
};

// Get current councillor profile with resilient fallback
export const useCouncillor = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ["councillor-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("councillor_profile");
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (parsed && (parsed.lga || parsed.ward)) {
                            return {
                                ...parsed,
                                lga: parsed.lga || "Lokoja",
                                ward: parsed.ward || "Lokoja - A"
                            } as Councillor;
                        }
                    } catch {}
                }
            }

            // 2. Fallback to Supabase auth user
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", user.id)
                        .maybeSingle();

                    if (profile) {
                        const c: Councillor = {
                            id: profile.id,
                            user_id: profile.id,
                            chairman_id: "",
                            lga: profile.lga || user.user_metadata?.lga || "Lokoja",
                            ward: profile.ward || user.user_metadata?.ward || "Lokoja - A",
                            councillor_name: profile.full_name || user.user_metadata?.full_name || profile.email || "Hon. Ward Executive Councillor",
                            phone: profile.phone || profile.phone_number || user.user_metadata?.phone || null,
                            email: profile.email || user.email || "councillor.lokoja@kogicms.ng",
                            must_change_password: false,
                            last_password_change: null,
                            is_active: profile.account_status !== "suspended",
                            photo_url: profile.avatar_url,
                            created_by: "",
                            created_at: profile.created_at || new Date().toISOString(),
                            updated_at: profile.updated_at || new Date().toISOString(),
                        };
                        if (typeof window !== "undefined") {
                            localStorage.setItem("councillor_profile", JSON.stringify(c));
                        }
                        return c;
                    }

                    // Check local councillors store by email or id
                    const localList = getLocalCouncillors();
                    const found = localList.find(c => 
                        (c.email && user.email && c.email.toLowerCase() === user.email.toLowerCase()) || 
                        c.user_id === user.id || 
                        c.id === user.id
                    );

                    if (found) {
                        const c: Councillor = {
                            id: found.id,
                            user_id: found.user_id || user.id,
                            chairman_id: found.chairman_id,
                            lga: found.lga || "Lokoja",
                            ward: found.ward || "Lokoja - A",
                            councillor_name: found.councillor_name,
                            phone: found.phone,
                            email: found.email,
                            must_change_password: false,
                            last_password_change: null,
                            is_active: found.is_active,
                            photo_url: null,
                            created_by: found.chairman_id,
                            created_at: found.created_at,
                            updated_at: found.updated_at,
                        };
                        if (typeof window !== "undefined") {
                            localStorage.setItem("councillor_profile", JSON.stringify(c));
                        }
                        return c;
                    }
                }
            } catch (err) {
                console.warn("Could not load councillor profile from profiles table:", err);
            }

            // 3. Fallback default councillor for Kogi State
            const fallback: Councillor = {
                id: "councillor-default-01",
                user_id: "councillor-default-01",
                chairman_id: "chair-lokoja-01",
                lga: "Lokoja",
                ward: "Lokoja - A",
                councillor_name: "Hon. Yakubu Jimoh",
                phone: "08031234567",
                email: "councillor.lokoja@kogicms.ng",
                must_change_password: false,
                last_password_change: null,
                is_active: true,
                photo_url: null,
                created_by: "system",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            return fallback;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        ...options
    });
};

// Helper function to load ward dashboard details
export const fetchFreshWardData = async (councillor: Councillor): Promise<CouncillorWardData> => {
    const targetLga = councillor.lga || "Lokoja";
    const targetWard = councillor.ward || "Lokoja - A";

    // 1. Fetch master polling units of this ward from ALL_POLLING_UNITS
    const normLga = targetLga.toLowerCase().replace(/[^a-z]/g, "");
    const rawWard = targetWard.toLowerCase().trim();
    const normWard = rawWard.replace(/[^a-z0-9]/g, "");

    let matchedPUs = ALL_POLLING_UNITS.filter(pu => {
        const puLga = pu.lga.toLowerCase().replace(/[^a-z]/g, "");
        const puWard = pu.wardName.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (puLga === normLga || puLga.includes(normLga) || normLga.includes(puLga)) &&
               (puWard === normWard || puWard.includes(normWard) || normWard.includes(puWard));
    });

    // If no direct match, match all PUs in this LGA and pick the first available ward
    if (matchedPUs.length === 0) {
        const lgaPUs = ALL_POLLING_UNITS.filter(pu => {
            const puLga = pu.lga.toLowerCase().replace(/[^a-z]/g, "");
            return puLga === normLga || puLga.includes(normLga) || normLga.includes(puLga);
        });
        const firstWard = lgaPUs[0]?.wardName;
        if (firstWard) {
            matchedPUs = lgaPUs.filter(pu => pu.wardName === firstWard);
        } else {
            matchedPUs = ALL_POLLING_UNITS.slice(0, 20);
        }
    }

    // 2. Gather Assigned PU Agents from ALL sources (localRepository cells, assigned_pu_agents in localStorage, starred agents)
    const assignedAgentMap = new Map<string, { id: string; name: string; phone?: string; designation: string }>();

    // Source A: localRepository polling unit cells (IndexedDB)
    try {
        const cachedCells = await localRepository.getPollingUnitCells();
        cachedCells.forEach((c: any) => {
            const agentName = c.polling_unit_agent_name || c.canvasser_name;
            if (agentName && String(agentName).trim()) {
                const entry = {
                    id: c.id || c.pu_code || `agent_${c.polling_unit_name}`,
                    name: String(agentName).trim(),
                    phone: c.polling_unit_agent_phone || c.canvasser_phone,
                    designation: "Lead PU Agent",
                };
                if (c.id) assignedAgentMap.set(String(c.id).toLowerCase().trim(), entry);
                if (c.pu_code) assignedAgentMap.set(String(c.pu_code).toLowerCase().trim(), entry);
                if (c.polling_unit_name) assignedAgentMap.set(String(c.polling_unit_name).toLowerCase().trim(), entry);
            }
        });
    } catch (e) {}

    // Source B: localStorage assigned_pu_agents
    if (typeof window !== "undefined") {
        try {
            const assignedLocal = JSON.parse(localStorage.getItem("assigned_pu_agents") || "{}");
            Object.entries(assignedLocal).forEach(([key, val]: [string, any]) => {
                if (val && typeof val === "object") {
                    const agentName = val.agent_name || val.name;
                    if (agentName && String(agentName).trim()) {
                        const entry = {
                            id: val.id || val.pu_id || key,
                            name: String(agentName).trim(),
                            phone: val.phone,
                            designation: "Lead PU Agent",
                        };
                        assignedAgentMap.set(String(key).toLowerCase().trim(), entry);
                        if (val.pu_id) assignedAgentMap.set(String(val.pu_id).toLowerCase().trim(), entry);
                        if (val.pu_code) assignedAgentMap.set(String(val.pu_code).toLowerCase().trim(), entry);
                        if (val.pu_name) assignedAgentMap.set(String(val.pu_name).toLowerCase().trim(), entry);
                    }
                }
            });
        } catch (e) {}
    }

    // Source C: starred agents
    try {
        const starredAgents = getLocalStarredAgents();
        Object.entries(starredAgents).forEach(([memberId, val]) => {
            if (val.is_starred && val.polling_unit) {
                const entry = {
                    id: memberId,
                    name: val.agent_name || "Assigned Agent",
                    phone: val.phone,
                    designation: val.designation || "Lead PU Agent",
                };
                assignedAgentMap.set(String(val.polling_unit).toLowerCase().trim(), entry);
            }
        });
    } catch (e) {}

    // 3. Fetch and Merge members of this ward from both Local IndexedDB & Supabase
    const memberMap = new Map<string, any>();

    // Step 3A: Load local members (Dexie + sync_queue)
    try {
        const allLocal = await localRepository.getMembers();
        allLocal.forEach((m: any) => {
            if (m.deleted === 1) return;
            const mLga = (m.lga || "").toLowerCase().replace(/[^a-z]/g, "");
            const mWard = (m.ward || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const lgaMatches = !normLga || !mLga || mLga === normLga || mLga.includes(normLga) || normLga.includes(mLga);
            const wardMatches = !normWard || !mWard || mWard === normWard || mWard.includes(normWard) || normWard.includes(mWard);

            if (lgaMatches && wardMatches && m.id) {
                memberMap.set(m.id, { ...m });
            }
        });
    } catch (e) {
        console.warn("Could not load local members for ward data:", e);
    }

    // Step 3B: Fetch from Supabase and merge
    try {
        const { data: memberRows, error } = await supabase
            .from("members")
            .select("id, full_name, email, phone, state, lga, ward, polling_unit, polling_unit_id, gender, is_verified, status, verified_at, verification_status")
            .ilike("lga", `%${targetLga}%`);

        if (!error && memberRows && memberRows.length > 0) {
            memberRows.forEach((m: any) => {
                const mW = (m.ward || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                if (!normWard || mW === normWard || mW.includes(normWard) || normWard.includes(mW)) {
                    if (m.id) {
                        const local = memberMap.get(m.id);
                        if (local) {
                            // Merge: preserve local verification if member is verified locally
                            const isLocalVerified = isMemberVerifiedRecord(local);
                            const isRemoteVerified = isMemberVerifiedRecord(m);
                            memberMap.set(m.id, {
                                ...m,
                                ...local,
                                is_verified: isLocalVerified || isRemoteVerified,
                                status: isLocalVerified ? (local.status || "verified") : (m.status || local.status)
                            });
                        } else {
                            memberMap.set(m.id, { ...m });
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.warn("Network error fetching ward members from Supabase:", err);
    }

    const wardMembers = Array.from(memberMap.values());

    // 4. Map members count and assigned agents per polling unit
    const memberCountMap = new Map<string, number>();
    const verifiedCountMap = new Map<string, number>();
    const totalMembers = wardMembers.length;
    let verifiedMembers = 0;

    wardMembers.forEach((m) => {
        const isVer = isMemberVerifiedRecord(m);
        if (isVer) {
            verifiedMembers++;
        }

        const puKey = (m.polling_unit || "").toLowerCase().trim();
        const puId = (m.polling_unit_id || "").toLowerCase().trim();

        if (puKey) {
            memberCountMap.set(puKey, (memberCountMap.get(puKey) || 0) + 1);
            if (isVer) {
                verifiedCountMap.set(puKey, (verifiedCountMap.get(puKey) || 0) + 1);
            }
        }
        if (puId) {
            memberCountMap.set(puId, (memberCountMap.get(puId) || 0) + 1);
            if (isVer) {
                verifiedCountMap.set(puId, (verifiedCountMap.get(puId) || 0) + 1);
            }
        }
    });

    let assignedAgentsCount = 0;

    const pollingUnits = matchedPUs.map((pu) => {
        const key = pu.name.toLowerCase().trim();
        const codeKey = (pu.code || "").toLowerCase().trim();
        const idKey = (pu.id || "").toLowerCase().trim();
        const registered = pu.registeredVoters || 0;

        const verified = verifiedCountMap.get(idKey) || verifiedCountMap.get(codeKey) || verifiedCountMap.get(key) || 0;
        const total = memberCountMap.get(idKey) || memberCountMap.get(codeKey) || memberCountMap.get(key) || 0;

        // Check if an agent is assigned from our unified map
        let assignedAgent: any = null;
        if (assignedAgentMap.has(idKey)) {
            assignedAgent = assignedAgentMap.get(idKey);
        } else if (assignedAgentMap.has(codeKey)) {
            assignedAgent = assignedAgentMap.get(codeKey);
        } else if (assignedAgentMap.has(key)) {
            assignedAgent = assignedAgentMap.get(key);
        } else {
            for (const [mapKey, agent] of assignedAgentMap.entries()) {
                if (key && mapKey && (key.includes(mapKey) || mapKey.includes(key))) {
                    assignedAgent = agent;
                    break;
                }
            }
        }

        if (assignedAgent) {
            assignedAgentsCount++;
        }

        let status = "forming";
        if (verified >= registered && registered > 0) {
            status = "complete";
        } else if (verified >= 5 || total >= 10 || assignedAgent) {
            status = "active";
        } else if (total > 0) {
            status = "ready";
        }

        return {
            id: pu.id,
            name: pu.name,
            code: pu.code,
            registered_voters: registered,
            verified_members: verified,
            total_members: total,
            status,
            agent: assignedAgent,
        };
    });

    const totalRegisteredVoters = pollingUnits.reduce((acc, pu) => acc + (pu.registered_voters || 0), 0);
    const pendingVerification = Math.max(0, totalMembers - verifiedMembers);
    const remainingVoters = Math.max(0, totalRegisteredVoters - totalMembers);
    const expectedTurnoutRate = totalRegisteredVoters > 0 
        ? ((totalMembers / totalRegisteredVoters) * 100).toFixed(1) + "%"
        : "0%";
    const maleVoters = Math.round(totalRegisteredVoters * 0.52);
    const femaleVoters = totalRegisteredVoters - maleVoters;

    return {
        ward: targetWard,
        lga: targetLga,
        totalPollingUnits: pollingUnits.length,
        totalRegisteredVoters,
        totalMembers,
        verifiedMembers,
        pendingVerification,
        remainingVoters,
        expectedTurnoutRate,
        maleVoters,
        femaleVoters,
        malePct: "52%",
        femalePct: "48%",
        assignedAgentsCount,
        totalActivities: 0,
        pollingUnits,
    };
};

// Get ward-specific data for councillor with optional LGA/Ward override for live exploration
export const useCouncillorWardData = (overrideLga?: string, overrideWard?: string) => {
    const { data: councillor } = useCouncillor();

    const activeLga = overrideLga || councillor?.lga || "Lokoja";
    const activeWard = overrideWard || councillor?.ward || "Lokoja - A";

    return useQuery({
        queryKey: ["councillor-ward-data", activeLga, activeWard],
        queryFn: async () => {
            const tempCouncillor: Councillor = {
                ...(councillor || {
                    id: "councillor-default",
                    user_id: "councillor-default",
                    chairman_id: "",
                    councillor_name: "Hon. Ward Executive Councillor",
                    phone: null,
                    email: "councillor@kogicms.ng",
                    must_change_password: false,
                    last_password_change: null,
                    is_active: true,
                    photo_url: null,
                    created_by: "",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }),
                lga: activeLga,
                ward: activeWard,
            };

            const freshData = await fetchFreshWardData(tempCouncillor);
            if (typeof window !== "undefined") {
                const cacheKey = `ward_data_v6_${activeLga}_${activeWard}`;
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        initialData: () => {
            if (typeof window !== "undefined") {
                const cacheKey = `ward_data_v6_${activeLga}_${activeWard}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        return JSON.parse(cached) as CouncillorWardData;
                    } catch {}
                }
            }
            return undefined;
        },
        enabled: true,
        staleTime: 1000 * 5, // 5 seconds fresh
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

// Get activities in councillor's ward
export const useCouncillorActivities = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-activities", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            return [];
        },
        enabled: !!councillor,
    });
};

// Get members in councillor's ward
export const useCouncillorMembers = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-members", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            if (!councillor) return [];

            const map = new Map<string, any>();
            try {
                const local = await localRepository.getMembersByWard(councillor.lga, councillor.ward);
                local.forEach(m => {
                    if (m && m.id) map.set(m.id, m);
                });
            } catch (e) {}

            try {
                const { data, error } = await supabase
                    .from("members")
                    .select("*")
                    .ilike("lga", `%${councillor.lga}%`)
                    .order("created_at", { ascending: false });

                if (!error && data) {
                    const normWard = councillor.ward.toLowerCase().trim();
                    data.forEach((m: any) => {
                        if (m.ward && m.ward.toLowerCase().trim() === normWard) {
                            if (m.id) {
                                const existing = map.get(m.id);
                                map.set(m.id, { ...m, ...(existing || {}) });
                            }
                        }
                    });
                }
            } catch (e) {}

            return Array.from(map.values());
        },
        enabled: !!councillor,
    });
};

// Get support groups in councillor's ward
export const useCouncillorSupportGroups = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-support-groups", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            return [];
        },
        enabled: !!councillor,
    });
};
