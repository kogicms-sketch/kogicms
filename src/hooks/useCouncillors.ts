import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { localRepository } from "@/services/LocalRepository";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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
                    console.log("📦 Loaded councillor profile from local storage cache.");
                    // Background refresh
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            db.from("councillors").select("*").eq("user_id", user.id).single()
                                .then(({ data, error }: any) => {
                                    if (data && !error) {
                                        localStorage.setItem("councillor_profile", JSON.stringify(data));
                                    }
                                });
                        }
                    });
                    return JSON.parse(cached) as Councillor;
                }
            }

            // 2. Fallback to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await db
                .from("councillors")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            if (typeof window !== "undefined") {
                localStorage.setItem("councillor_profile", JSON.stringify(data));
            }
            return data as unknown as Councillor;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        ...options
    });
};

// Helper function to load ward dashboard details from database or IndexedDB
const fetchFreshWardData = async (councillor: Councillor): Promise<CouncillorWardData> => {
    // Check local IndexedDB first for polling units
    let pollingUnits: any[] = [];
    const cachedPUs = await localRepository.getPollingUnitCells();
    const wardPUs = cachedPUs.filter(c => c.lga === councillor.lga && c.ward === councillor.ward);
    if (wardPUs.length > 0) {
        pollingUnits = wardPUs;
    } else {
        const { data, error: puError } = await supabase
            .from("polling_units")
            .select("*")
            .eq("lga_name", councillor.lga)
            .eq("ward_name", councillor.ward)
            .order("name");
        if (puError) throw puError;
        pollingUnits = data || [];
    }

    // Check local IndexedDB members cache first
    let totalMembers = 0;
    let verifiedMembers = 0;
    const cachedMembers = await localRepository.getMembers();
    const wardMembers = cachedMembers.filter(m => m.lga === councillor.lga && m.ward === councillor.ward);
    if (wardMembers.length > 0) {
        totalMembers = wardMembers.length;
        verifiedMembers = wardMembers.filter(m => m.is_verified === true).length;
    } else {
        const { data: memberStats, error: memberError } = await (supabase
            .from("members")
            .select("is_verified")
            .eq("lga", councillor.lga)
            .eq("ward", councillor.ward) as any);
        if (memberError) throw memberError;
        totalMembers = memberStats?.length || 0;
        verifiedMembers = memberStats?.filter(m => m.is_verified === true).length || 0;
    }
    const pendingVerification = totalMembers - verifiedMembers;

    // Get activities in ward
    const { count: activityCount, error: activityError } = await supabase
        .from("support_group_activities")
        .select("*", { count: "exact", head: true })
        .eq("lga", councillor.lga)
        .eq("ward", councillor.ward);
    if (activityError) throw activityError;

    return {
        ward: councillor.ward,
        lga: councillor.lga,
        totalPollingUnits: pollingUnits.length,
        totalMembers,
        verifiedMembers,
        pendingVerification,
        totalActivities: activityCount || 0,
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

            const cacheKey = `ward_data_${councillor.lga}_${councillor.ward}`;

            // 1. Check local cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    console.log("📦 Loaded ward dashboard data from local cache.");
                    // Background refresh
                    (async () => {
                        try {
                            const freshData = await fetchFreshWardData(councillor);
                            localStorage.setItem(cacheKey, JSON.stringify(freshData));
                        } catch (e) {
                            console.error("Error refreshing ward data in background:", e);
                        }
                    })();
                    return JSON.parse(cached) as CouncillorWardData;
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
            if (!councillor) throw new Error("Councillor not loaded");

            const { data, error } = await supabase
                .from("support_group_activities")
                .select(`
          *,
          support_group:organizations(id, name)
        `)
                .eq("lga", councillor.lga)
                .eq("ward", councillor.ward)
                .order("activity_date", { ascending: false });

            if (error) throw error;
            return data;
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
                .eq("lga", councillor.lga)
                .eq("ward", councillor.ward)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
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
            if (!councillor) throw new Error("Councillor not loaded");

            const { data, error } = await supabase
                .from("organizations")
                .select("*")
                .eq("category", "support_group");

            if (error) throw error;
            return data;
        },
        enabled: !!councillor,
    });
};
