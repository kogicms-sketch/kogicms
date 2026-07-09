import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface FederalRep {
    id: string;
    user_id: string;
    constituency_name: string;
    constituency_code: string;
    lga_list: string[];
    rep_name: string;
    phone: string | null;
    email: string;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
    updated_at: string;
}

export interface ConstituencyLGABreakdown {
    lga_name: string;
    pu_count: number;
    registered_voters: number;
    target_voters: number;
    app_members_total: number;
    app_members_verified: number;
    app_members_pending: number;
    coverage_pct: number;
}

export interface FederalConstituencyData {
    constituency_name: string;
    constituency_code: string;
    lga_list: string[];
    totalPollingUnits: number;
    totalRegisteredVoters: number;
    totalTargetVoters: number;
    totalAppMembers: number;
    totalVerifiedMembers: number;
    totalPendingMembers: number;
    lgaBreakdown: ConstituencyLGABreakdown[];
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

// Get current federal rep profile
export const useFederalRep = () => {
    return useQuery({
        queryKey: ["federal-rep-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("federal_rep_profile");
                if (cached) {
                    console.log("📦 Loaded federal rep profile from local storage cache.");
                    // Background refresh
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            db.from("federal_reps").select("*").eq("user_id", user.id).single()
                                .then(({ data, error }: any) => {
                                    if (data && !error) {
                                        localStorage.setItem("federal_rep_profile", JSON.stringify(data));
                                    }
                                });
                        }
                    });
                    return JSON.parse(cached) as FederalRep;
                }
            }

            // 2. Fallback to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await db
                .from("federal_reps")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            if (typeof window !== "undefined") {
                localStorage.setItem("federal_rep_profile", JSON.stringify(data));
            }
            return data as FederalRep;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

const fetchFreshConstituencyData = async (rep: FederalRep): Promise<FederalConstituencyData> => {
    // 1. Get summary data via RPC to bypass row limits
    const { data: lgaData, error: rpcError } = await (supabase as any).rpc(
        "get_jurisdiction_lga_summary",
        { target_lgas: rep.lga_list }
    );

    if (rpcError) throw rpcError;

    // 2. Fetch polling units in chunks
    const allUnits: any[] = [];
    const { data: p1 } = await supabase
        .from("polling_units")
        .select("id, name, code, lga_name, ward_name, registered_voters, target_voters, verified_members")
        .in("lga_name", rep.lga_list)
        .order("lga_name")
        .range(0, 999);
    if (p1) allUnits.push(...p1);

    const { data: p2 } = await supabase
        .from("polling_units")
        .select("id, name, code, lga_name, ward_name, registered_voters, target_voters, verified_members")
        .in("lga_name", rep.lga_list)
        .order("lga_name")
        .range(1000, 1999);
    if (p2) allUnits.push(...p2);

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

    const { data: membersRaw } = await db
        .from("members")
        .select("id, full_name, lga, ward, is_verified, created_at, phone")
        .in("lga", rep.lga_list)
        .order("created_at", { ascending: false })
        .limit(50);

    const totalRegisteredVoters = breakdowns.reduce((s, b) => s + b.registered_voters, 0);
    const totalTargetVoters = breakdowns.reduce((s, b) => s + b.target_voters, 0);
    const totalAppMembers = breakdowns.reduce((s, b) => s + b.app_members_total, 0);
    const totalVerifiedMembers = breakdowns.reduce((s, b) => s + b.app_members_verified, 0);
    const totalPendingMembers = breakdowns.reduce((s, b) => s + b.app_members_pending, 0);

    return {
        constituency_name: rep.constituency_name,
        constituency_code: rep.constituency_code,
        lga_list: rep.lga_list,
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
    } as FederalConstituencyData;
};

// Get aggregated stats for the constituency
export const useFederalConstituencyData = () => {
    const { data: rep } = useFederalRep();

    return useQuery({
        queryKey: ["federal-constituency-data", rep?.constituency_code],
        queryFn: async () => {
            if (!rep) throw new Error("Federal rep not loaded");

            const cacheKey = `federal_constituency_data_${rep.constituency_code}`;

            // 1. Check local cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    console.log("📦 Loaded federal constituency data from local cache.");
                    // Background refresh
                    (async () => {
                        try {
                            const freshData = await fetchFreshConstituencyData(rep);
                            localStorage.setItem(cacheKey, JSON.stringify(freshData));
                        } catch (e) {
                            console.error("Error refreshing constituency data in background:", e);
                        }
                    })();
                    return JSON.parse(cached) as FederalConstituencyData;
                }
            }

            const freshData = await fetchFreshConstituencyData(rep);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!rep,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};
