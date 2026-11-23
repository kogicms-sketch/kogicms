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

    // 2. Fetch members of this ward
    let wardMembers: any[] = [];
    try {
        const { data: memberRows } = await supabase
            .from("members")
            .select("id, full_name, email, phone, state, lga, ward, polling_unit, polling_unit_id, gender, is_verified, status")
            .ilike("lga", `%${targetLga}%`);

        if (memberRows && memberRows.length > 0) {
            wardMembers = memberRows.filter((m: any) => {
                const mW = (m.ward || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                return mW === normWard || mW.includes(normWard) || normWard.includes(mW);
            });
        }
    } catch {
        try {
            wardMembers = await localRepository.getMembersByWard(targetLga, targetWard);
        } catch {}
    }

    if (wardMembers.length === 0) {
        try {
            wardMembers = await localRepository.getMembersByWard(targetLga, targetWard);
        } catch {}
    }

    // 3. Map members count and assigned agents per polling unit
    const memberCountMap = new Map<string, number>();
    const verifiedCountMap = new Map<string, number>();
    let totalMembers = wardMembers.length;
    let verifiedMembers = 0;

    wardMembers.forEach((m) => {
        if (m.is_verified || m.status === 'active') verifiedMembers++;
        const puKey = (m.polling_unit || "").toLowerCase().trim();
        if (puKey) {
            memberCountMap.set(puKey, (memberCountMap.get(puKey) || 0) + 1);
            if (m.is_verified || m.status === 'active') {
                verifiedCountMap.set(puKey, (verifiedCountMap.get(puKey) || 0) + 1);
            }
        }
    });

    const starredAgents = getLocalStarredAgents();
    let assignedAgentsCount = 0;

    const pollingUnits = matchedPUs.map((pu) => {
        const key = pu.name.toLowerCase().trim();
        const codeKey = (pu.code || "").toLowerCase().trim();
        const registered = pu.registeredVoters || 0;
        const verified = verifiedCountMap.get(key) || verifiedCountMap.get(codeKey) || 0;
        const total = memberCountMap.get(key) || memberCountMap.get(codeKey) || 0;

        // Check if an agent is assigned
        let assignedAgent: any = null;
        Object.entries(starredAgents).forEach(([memberId, val]) => {
            if (val.is_starred && val.polling_unit && (
                val.polling_unit.toLowerCase() === key ||
                val.polling_unit.toLowerCase() === codeKey ||
                val.polling_unit.toLowerCase().includes(key) ||
                key.includes(val.polling_unit.toLowerCase())
            )) {
                assignedAgent = {
                    id: memberId,
                    designation: val.designation || "lead_agent",
                };
            }
        });

        if (assignedAgent) assignedAgentsCount++;

        let status = "forming";
        if (verified >= registered && registered > 0) {
            status = "complete";
        } else if (verified >= 5 || total >= 10) {
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

            const cacheKey = `ward_data_v5_${activeLga}_${activeWard}`;
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as CouncillorWardData;
                        fetchFreshWardData(tempCouncillor).then(fresh => {
                            localStorage.setItem(cacheKey, JSON.stringify(fresh));
                        }).catch(() => {});
                        return parsed;
                    } catch {}
                }
            }

            const freshData = await fetchFreshWardData(tempCouncillor);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: true,
        staleTime: 1000 * 60 * 5, // 5 minutes
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

            const { data, error } = await supabase
                .from("members")
                .select("*")
                .ilike("lga", `%${councillor.lga}%`)
                .order("created_at", { ascending: false });

            if (error) return [];
            const normWard = councillor.ward.toLowerCase().trim();
            return (data || []).filter((m: any) => m.ward && m.ward.toLowerCase().trim() === normWard);
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
