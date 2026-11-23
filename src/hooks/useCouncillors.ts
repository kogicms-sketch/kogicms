import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { localRepository } from "@/services/LocalRepository";
import { ALL_POLLING_UNITS } from "@/data/aggregated_lga_data";
import { getLocalCouncillors } from "./useChairmen";

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
    totalMembers: number;
    verifiedMembers: number;
    pendingVerification: number;
    totalActivities: number;
    pollingUnits: any[];
}

// Get current councillor profile
export const useCouncillor = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ["councillor-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("councillor_profile");
                if (cached) {
                    return JSON.parse(cached) as Councillor;
                }
            }

            // 2. Fallback to Supabase auth user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Check profiles table
            try {
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
                        lga: profile.lga || "",
                        ward: profile.ward || "",
                        councillor_name: profile.full_name || profile.email,
                        phone: profile.phone || profile.phone_number || null,
                        email: profile.email,
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
            } catch (err) {
                console.warn("Could not load councillor profile from profiles table:", err);
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
                    lga: found.lga,
                    ward: found.ward,
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

            throw new Error("Councillor profile not found");
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        ...options
    });
};

// Helper function to load ward dashboard details
const fetchFreshWardData = async (councillor: Councillor): Promise<CouncillorWardData> => {
    // 1. Fetch members of this ward from Supabase / LocalRepository
    let wardMembers: any[] = [];
    try {
        const { data: memberRows } = await supabase
            .from("members")
            .select("id, full_name, email, phone, state, lga, ward, polling_unit, polling_unit_id, gender, is_verified, status")
            .ilike("lga", `%${councillor.lga}%`);

        if (memberRows && memberRows.length > 0) {
            const normWard = councillor.ward.toLowerCase().trim();
            wardMembers = memberRows.filter((m: any) => m.ward && m.ward.toLowerCase().trim() === normWard);
        }
    } catch {
        wardMembers = await localRepository.getMembersByWard(councillor.lga, councillor.ward);
    }

    if (wardMembers.length === 0) {
        try {
            wardMembers = await localRepository.getMembersByWard(councillor.lga, councillor.ward);
        } catch {}
    }

    // 2. Fetch master polling units of this ward from local ALL_POLLING_UNITS
    const normLga = councillor.lga.toLowerCase().replace(/[^a-z]/g, "");
    const normWard = councillor.ward.toLowerCase().trim();

    const matchedPUs = ALL_POLLING_UNITS.filter(pu => {
        const puLga = pu.lga.toLowerCase().replace(/[^a-z]/g, "");
        const puWard = pu.wardName.toLowerCase().trim();
        return (puLga === normLga || puLga.includes(normLga) || normLga.includes(puLga)) && puWard === normWard;
    });

    // 3. Map members count per polling unit
    const memberCountMap = new Map<string, number>();
    const verifiedCountMap = new Map<string, number>();
    let totalMembers = wardMembers.length;
    let verifiedMembers = 0;

    wardMembers.forEach((m) => {
        if (m.is_verified || m.status === 'active') verifiedMembers++;
        const puNameKey = (m.polling_unit || "").toLowerCase().trim();
        if (puNameKey) {
            memberCountMap.set(puNameKey, (memberCountMap.get(puNameKey) || 0) + 1);
            if (m.is_verified || m.status === 'active') {
                verifiedCountMap.set(puNameKey, (verifiedCountMap.get(puNameKey) || 0) + 1);
            }
        }
    });

    const pollingUnits = matchedPUs.map((pu) => {
        const key = pu.name.toLowerCase().trim();
        const registered = pu.registeredVoters || 0;
        const verified = verifiedCountMap.get(key) || 0;
        const total = memberCountMap.get(key) || 0;

        let status = "forming";
        if (verified >= registered && registered > 0) {
            status = "complete";
        } else if (verified >= 5) {
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
            agent: null,
        };
    });

    const pendingVerification = Math.max(0, totalMembers - verifiedMembers);

    return {
        ward: councillor.ward,
        lga: councillor.lga,
        totalPollingUnits: pollingUnits.length,
        totalMembers,
        verifiedMembers,
        pendingVerification,
        totalActivities: 0,
        pollingUnits,
    };
};

// Get ward-specific data for councillor
export const useCouncillorWardData = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-ward-data", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            if (!councillor) throw new Error("Councillor not loaded");

            const cacheKey = `ward_data_v4_${councillor.lga}_${councillor.ward}`;

            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as CouncillorWardData;
                        // background refresh
                        fetchFreshWardData(councillor).then(fresh => {
                            localStorage.setItem(cacheKey, JSON.stringify(fresh));
                        }).catch(() => {});
                        return parsed;
                    } catch {}
                }
            }

            const freshData = await fetchFreshWardData(councillor);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!councillor,
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
            if (!councillor) throw new Error("Councillor not loaded");

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
