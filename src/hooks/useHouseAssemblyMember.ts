import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface HouseAssemblyMember {
    id: string;
    user_id: string;
    member_name: string;
    lga: string;
    phone: string | null;
    email: string;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
    updated_at: string;
}

export interface AssemblyLGAStats {
    totalPollingUnits: number;
    totalRegisteredVoters: number;
    totalAppMembers: number;
    totalVerifiedMembers: number;
    totalPendingMembers: number;
    totalWards: number;
    wardPerformance: {
        ward: string;
        pollingUnits: number;
        registeredVoters: number;
        appMembers: number;
        verifiedMembers: number;
    }[];
    pollingUnits: any[];
    recentMembers: {
        id: string;
        name: string;
        lga: string;
        ward: string;
        is_verified: boolean;
        created_at: string;
        phone: string | null;
    }[];
}

// Get current house assembly member profile
export const useHouseAssemblyMember = () => {
    return useQuery({
        queryKey: ["house-assembly-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("house_assembly_profile");
                if (cached) {
                    console.log("📦 Loaded house assembly profile from local storage cache.");
                    // Background refresh
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            db.from("house_assembly_members").select("*").eq("user_id", user.id).single()
                                .then(({ data, error }: any) => {
                                    if (data && !error) {
                                        localStorage.setItem("house_assembly_profile", JSON.stringify(data));
                                    }
                                });
                        }
                    });
                    return JSON.parse(cached) as HouseAssemblyMember;
                }
            }

            // 2. Fallback to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await db
                .from("house_assembly_members")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            if (typeof window !== "undefined") {
                localStorage.setItem("house_assembly_profile", JSON.stringify(data));
            }
            return data as HouseAssemblyMember;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

const fetchFreshAssemblyLGAStats = async (member: HouseAssemblyMember): Promise<AssemblyLGAStats> => {
    // 1. Get summary data
    const { data: lgaData, error: rpcError } = await (supabase as any).rpc(
        "get_jurisdiction_lga_summary",
        { target_lgas: [member.lga] }
    );

    if (rpcError) throw rpcError;

    const stats = lgaData?.[0] || {
        pu_count: 0,
        inec_registered_voters: 0,
        target_voters: 0,
        app_members_total: 0,
        app_members_verified: 0,
        app_members_pending: 0
    };

    // 2. Fetch all polling units for this LGA (safe within 1000 limit)
    const { data: pollingUnits, error: puError } = await supabase
        .from("polling_units")
        .select("id, name, lga_name, ward_name, registered_voters, target_voters")
        .eq("lga_name", member.lga)
        .order("ward_name");

    if (puError) throw puError;

    const pus = pollingUnits || [];

    // 3. Fetch recent members
    const { data: membersRaw } = await db
        .from("members")
        .select("id, full_name, lga, ward, is_verified, created_at, phone")
        .eq("lga", member.lga)
        .order("created_at", { ascending: false })
        .limit(50);

    const recentMembers = (membersRaw || []).map(m => ({
        id: m.id,
        name: m.full_name,
        lga: m.lga,
        ward: m.ward,
        is_verified: m.is_verified,
        created_at: m.created_at,
        phone: m.phone
    }));

    // Group by ward
    const wardMap: Record<string, any> = {};
    pus.forEach((pu: any) => {
        if (!wardMap[pu.ward_name]) {
            wardMap[pu.ward_name] = { 
                ward: pu.ward_name, 
                pollingUnits: 0, 
                registeredVoters: 0, 
                appMembers: 0, 
                verifiedMembers: 0,
                coverage_pct: Number(pu.target_voters) > 0
                    ? Math.min((Number(pu.app_members_total || 0) / Number(pu.target_voters)) * 100, 100)
                    : 0
            };
        }
        wardMap[pu.ward_name].pollingUnits++;
        wardMap[pu.ward_name].registeredVoters += pu.registered_voters || 0;
    });

    return {
        totalPollingUnits: Number(stats.pu_count),
        totalRegisteredVoters: Number(stats.inec_registered_voters),
        totalAppMembers: Number(stats.app_members_total),
        totalVerifiedMembers: Number(stats.app_members_verified),
        totalPendingMembers: Number(stats.app_members_pending),
        totalWards: Object.keys(wardMap).length,
        wardPerformance: Object.values(wardMap).sort((a, b) => b.registeredVoters - a.registeredVoters),
        pollingUnits: pus,
        recentMembers: recentMembers,
    } as AssemblyLGAStats;
};

// Get stats for the member's LGA using the new summary RPC
export const useAssemblyLGAStats = () => {
    const { data: member } = useHouseAssemblyMember();

    return useQuery({
        queryKey: ["assembly-lga-stats", member?.lga],
        queryFn: async () => {
            if (!member) throw new Error("Member not loaded");

            const cacheKey = `assembly_lga_stats_${member.lga}`;

            // 1. Check local cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    console.log("📦 Loaded assembly lga stats from local cache.");
                    // Background refresh
                    (async () => {
                        try {
                            const freshData = await fetchFreshAssemblyLGAStats(member);
                            localStorage.setItem(cacheKey, JSON.stringify(freshData));
                        } catch (e) {
                            console.error("Error refreshing assembly stats in background:", e);
                        }
                    })();
                    return JSON.parse(cached) as AssemblyLGAStats;
                }
            }

            const freshData = await fetchFreshAssemblyLGAStats(member);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!member,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};
