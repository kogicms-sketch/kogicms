import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface SenatorialLeader {
    id: string;
    user_id: string;
    zone_name: string;
    zone_code: string;
    lga_list: string[];
    leader_name: string;
    phone: string | null;
    email: string;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
    updated_at: string;
}

export interface LGABreakdown {
    lga_name: string;
    pu_count: number;
    registered_voters: number;
    target_voters: number;
    app_members_total: number;
    app_members_verified: number;
    app_members_pending: number;
    coverage_pct: number;
}

export interface SenatorialZoneData {
    zone_name: string;
    zone_code: string;
    lga_list: string[];
    totalPollingUnits: number;
    totalRegisteredVoters: number;
    totalTargetVoters: number;
    totalAppMembers: number;
    totalVerifiedMembers: number;
    totalPendingMembers: number;
    lgaBreakdown: LGABreakdown[];
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

// Get current senatorial leader profile
export const useSenatorialLeader = () => {
    return useQuery({
        queryKey: ["senatorial-leader-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("senatorial_leader_profile");
                if (cached) {
                    console.log("📦 Loaded senatorial leader profile from local storage cache.");
                    // Background refresh
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            db.from("senatorial_leaders").select("*").eq("user_id", user.id).single()
                                .then(({ data, error }: any) => {
                                    if (data && !error) {
                                        localStorage.setItem("senatorial_leader_profile", JSON.stringify(data));
                                    }
                                });
                        }
                    });
                    return JSON.parse(cached) as SenatorialLeader;
                }
            }

            // 2. Fallback to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await db
                .from("senatorial_leaders")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            if (typeof window !== "undefined") {
                localStorage.setItem("senatorial_leader_profile", JSON.stringify(data));
            }
            return data as SenatorialLeader;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

const fetchFreshSenatorialZoneData = async (leader: SenatorialLeader): Promise<SenatorialZoneData> => {
    // 1. Get summary data via RPC to bypass row limits
    const { data: lgaData, error: rpcError } = await (supabase as any).rpc(
        "get_jurisdiction_lga_summary",
        { target_lgas: leader.lga_list }
    );

    if (rpcError) throw rpcError;

    // 2. Fetch polling units in chunks to avoid the 1000-row limit
    const allUnits: any[] = [];
    
    // Page 1 (0-999)
    const { data: p1 } = await supabase
        .from("polling_units")
        .select("id, name, code, lga_name, ward_name, registered_voters, target_voters, verified_members")
        .in("lga_name", leader.lga_list)
        .order("lga_name")
        .range(0, 999);
    if (p1) allUnits.push(...p1);

    // Page 2 (1000-1999)
    const { data: p2 } = await supabase
        .from("polling_units")
        .select("id, name, code, lga_name, ward_name, registered_voters, target_voters, verified_members")
        .in("lga_name", leader.lga_list)
        .order("lga_name")
        .range(1000, 1999);
    if (p2) allUnits.push(...p2);

    // Page 3 (2000-2999)
    const { data: p3 } = await supabase
        .from("polling_units")
        .select("id, name, code, lga_name, ward_name, registered_voters, target_voters, verified_members")
        .in("lga_name", leader.lga_list)
        .order("lga_name")
        .range(2000, 2999);
    if (p3) allUnits.push(...p3);

    const breakdowns = (lgaData || []).map((lga: any) => ({
        lga_name: lga.lga_name,
        pu_count: Number(lga.pu_count),
        registered_voters: Number(lga.inec_registered_voters),
        target_voters: Number(lga.target_voters),
        app_members_total: Number(lga.app_members_total),
        app_members_verified: Number(lga.app_members_verified),
        app_members_pending: Number(lga.app_members_pending),
        coverage_pct:
            Number(lga.target_voters) > 0
                ? Math.min((Number(lga.app_members_total) / Number(lga.target_voters)) * 100, 100)
                : 0,
    }));

    const { data: membersRaw } = await supabase
        .from("members")
        .select("id, full_name, lga, ward, is_verified, created_at, phone")
        .in("lga", leader.lga_list)
        .order("created_at", { ascending: false })
        .limit(50);

    const totalRegisteredVoters = breakdowns.reduce((s, b) => s + b.registered_voters, 0);
    const totalTargetVoters = breakdowns.reduce((s, b) => s + b.target_voters, 0);
    const totalAppMembers = breakdowns.reduce((s, b) => s + b.app_members_total, 0);
    const totalVerifiedMembers = breakdowns.reduce((s, b) => s + b.app_members_verified, 0);
    const totalPendingMembers = breakdowns.reduce((s, b) => s + b.app_members_pending, 0);

    return {
        zone_name: leader.zone_name,
        zone_code: leader.zone_code,
        lga_list: leader.lga_list,
        totalPollingUnits: allUnits.length,
        totalRegisteredVoters,
        totalTargetVoters,
        totalAppMembers,
        totalVerifiedMembers,
        totalPendingMembers,
        lgaBreakdown: breakdowns,
        pollingUnits: allUnits,
        recentMembers: (membersRaw || []).map(m => ({
            id: m.id,
            name: m.full_name,
            lga: m.lga,
            ward: m.ward,
            is_verified: m.is_verified,
            created_at: m.created_at,
            phone: m.phone
        }))
    } as SenatorialZoneData;
};

// Get all polling units + aggregated stats for the senatorial zone
export const useSenatorialZoneData = () => {
    const { data: leader } = useSenatorialLeader();

    return useQuery({
        queryKey: ["senatorial-zone-data", leader?.zone_code],
        queryFn: async () => {
            if (!leader) throw new Error("Leader not loaded");

            const cacheKey = `senatorial_zone_data_${leader.zone_code}`;

            // 1. Check local cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    console.log("📦 Loaded senatorial zone data from local cache.");
                    // Background refresh
                    (async () => {
                        try {
                            const freshData = await fetchFreshSenatorialZoneData(leader);
                            localStorage.setItem(cacheKey, JSON.stringify(freshData));
                        } catch (e) {
                            console.error("Error refreshing senatorial zone data in background:", e);
                        }
                    })();
                    return JSON.parse(cached) as SenatorialZoneData;
                }
            }

            const freshData = await fetchFreshSenatorialZoneData(leader);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!leader,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};
