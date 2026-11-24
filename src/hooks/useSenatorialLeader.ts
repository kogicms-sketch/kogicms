import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { ALL_POLLING_UNITS, ALL_LGA_SUMMARIES } from "@/data/aggregated_lga_data";
import { localRepository } from "@/services/LocalRepository";

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

// 3 Default Kogi Senatorial Districts
export const DEFAULT_SENATORIAL_LEADERS: SenatorialLeader[] = [
    {
        id: 'USR-SEN-CENTRAL',
        user_id: 'USR-SEN-CENTRAL',
        zone_code: 'KGI-CENTRAL',
        zone_name: 'Kogi Central Senatorial District',
        lga_list: ['Adavi', 'Ajaokuta', 'Ogori/Magongo', 'Okehi', 'Okene'],
        leader_name: 'Hon. Senator (Kogi Central)',
        phone: '08031000001',
        email: 'senate.central@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-SEN-EAST',
        user_id: 'USR-SEN-EAST',
        zone_code: 'KGI-EAST',
        zone_name: 'Kogi East Senatorial District',
        lga_list: ['Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela-Odolu', 'Ofu', 'Olamaboro', 'Omala'],
        leader_name: 'Hon. Senator (Kogi East)',
        phone: '08031000002',
        email: 'senate.east@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-SEN-WEST',
        user_id: 'USR-SEN-WEST',
        zone_code: 'KGI-WEST',
        zone_name: 'Kogi West Senatorial District',
        lga_list: ['Ijumu', 'Kabba/Bunu', 'Kogi (Koton Karfe)', 'Lokoja', 'Mopa-Muro', 'Yagba East', 'Yagba West'],
        leader_name: 'Hon. Senator (Kogi West)',
        phone: '08031000003',
        email: 'senate.west@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
];

export const getLocalSenatorialLeaders = (): SenatorialLeader[] => {
    if (typeof window === "undefined") return DEFAULT_SENATORIAL_LEADERS;
    try {
        const stored = localStorage.getItem("local_senatorial_leaders");
        if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_SENATORIAL_LEADERS;
};

// Get current senatorial leader profile
export const useSenatorialLeader = () => {
    return useQuery({
        queryKey: ["senatorial-leader-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("senatorial_leader_profile");
                if (cached) {
                    try {
                        return JSON.parse(cached) as SenatorialLeader;
                    } catch {}
                }
            }

            // 2. Identify authenticated user
            let currentUser: any = null;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
            } catch {}

            const leaders = getLocalSenatorialLeaders();
            const currentEmail = (currentUser?.email || (typeof window !== "undefined" ? localStorage.getItem("auth_email") : ""))?.toLowerCase().trim();

            if (currentEmail) {
                const matched = leaders.find(l => l.email.toLowerCase().trim() === currentEmail);
                if (matched) {
                    if (typeof window !== "undefined") {
                        localStorage.setItem("senatorial_leader_profile", JSON.stringify(matched));
                    }
                    return matched;
                }
            }

            // 3. Check Supabase senatorial_leaders table if online
            if (currentUser?.id) {
                try {
                    const { data, error } = await db
                        .from("senatorial_leaders")
                        .select("*")
                        .eq("user_id", currentUser.id)
                        .maybeSingle();

                    if (!error && data) {
                        if (typeof window !== "undefined") {
                            localStorage.setItem("senatorial_leader_profile", JSON.stringify(data));
                        }
                        return data as SenatorialLeader;
                    }
                } catch {}
            }

            // 4. Default to Kogi Central leader
            const fallback = leaders[0] || DEFAULT_SENATORIAL_LEADERS[0];
            if (typeof window !== "undefined") {
                localStorage.setItem("senatorial_leader_profile", JSON.stringify(fallback));
            }
            return fallback;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });
};

const fetchFreshSenatorialZoneData = async (leader: SenatorialLeader): Promise<SenatorialZoneData> => {
    const norm = (s: string) => (s ? s.toLowerCase().replace(/[^a-z]/g, "") : "");
    const targetLgasNorm = leader.lga_list.map(norm);

    // 1. Gather all polling units for this zone from ALL_POLLING_UNITS
    const matchedPUs = ALL_POLLING_UNITS.filter(pu => {
        const puLgaNorm = norm(pu.lga);
        return targetLgasNorm.some(tl => tl === puLgaNorm || tl.includes(puLgaNorm) || puLgaNorm.includes(tl));
    });

    // 2. Load members in this zone from localRepository + Supabase
    let zoneMembers: any[] = [];
    try {
        const allLocal = await localRepository.getMembers();
        zoneMembers = allLocal.filter(m => {
            if (m.deleted === 1) return false;
            const mLgaNorm = norm(m.lga || "");
            return targetLgasNorm.some(tl => tl === mLgaNorm || tl.includes(mLgaNorm) || mLgaNorm.includes(tl));
        });
    } catch {}

    try {
        const { data: remoteRows } = await supabase
            .from("members")
            .select("id, full_name, lga, ward, is_verified, status, created_at, phone")
            .order("created_at", { ascending: false })
            .limit(100);

        if (remoteRows && remoteRows.length > 0) {
            const memberMap = new Map<string, any>();
            zoneMembers.forEach(m => memberMap.set(m.id, m));
            remoteRows.forEach(m => {
                const mLgaNorm = norm(m.lga || "");
                if (targetLgasNorm.some(tl => tl === mLgaNorm || tl.includes(mLgaNorm) || mLgaNorm.includes(tl))) {
                    if (!memberMap.has(m.id)) {
                        memberMap.set(m.id, m);
                    }
                }
            });
            zoneMembers = Array.from(memberMap.values());
        }
    } catch {}

    // 3. Build LGA Breakdown
    const breakdowns: LGABreakdown[] = leader.lga_list.map(lgaName => {
        const lNorm = norm(lgaName);
        const lgaPUs = matchedPUs.filter(p => {
            const pNorm = norm(p.lga);
            return pNorm === lNorm || pNorm.includes(lNorm) || lNorm.includes(pNorm);
        });

        const lgaSummary = ALL_LGA_SUMMARIES.find(s => {
            const sNorm = norm(s.lga);
            return sNorm === lNorm || sNorm.includes(lNorm) || lNorm.includes(sNorm);
        });

        const regVoters = lgaPUs.reduce((acc, pu) => acc + (pu.registeredVoters || 0), 0) || (lgaSummary?.totalRegisteredVoters || 0);
        const targetVoters = Math.round(regVoters * 0.45); // 45% campaign victory mobilization target

        const lgaMembers = zoneMembers.filter(m => {
            const mNorm = norm(m.lga || "");
            return mNorm === lNorm || mNorm.includes(lNorm) || lNorm.includes(mNorm);
        });

        const appMembersTotal = lgaMembers.length;
        const appMembersVerified = lgaMembers.filter(m => m.is_verified || m.status === 'verified' || m.status === 'active').length;
        const appMembersPending = Math.max(0, appMembersTotal - appMembersVerified);
        const coveragePct = targetVoters > 0 ? Math.min((appMembersVerified / targetVoters) * 100, 100) : 0;

        return {
            lga_name: lgaName,
            pu_count: lgaPUs.length || (lgaSummary?.totalPollingUnits || 0),
            registered_voters: regVoters,
            target_voters: targetVoters,
            app_members_total: appMembersTotal,
            app_members_verified: appMembersVerified,
            app_members_pending: appMembersPending,
            coverage_pct: coveragePct,
        };
    });

    const totalRegisteredVoters = breakdowns.reduce((s, b) => s + b.registered_voters, 0);
    const totalTargetVoters = breakdowns.reduce((s, b) => s + b.target_voters, 0);
    const totalAppMembers = breakdowns.reduce((s, b) => s + b.app_members_total, 0);
    const totalVerifiedMembers = breakdowns.reduce((s, b) => s + b.app_members_verified, 0);
    const totalPendingMembers = breakdowns.reduce((s, b) => s + b.app_members_pending, 0);

    const pollingUnits = matchedPUs.map(pu => ({
        id: pu.id,
        name: pu.name,
        code: pu.code,
        lga_name: pu.lga,
        ward_name: pu.wardName,
        registered_voters: pu.registeredVoters || 0,
        target_voters: Math.round((pu.registeredVoters || 500) * 0.45),
        verified_members: 0,
    }));

    return {
        zone_name: leader.zone_name,
        zone_code: leader.zone_code,
        lga_list: leader.lga_list,
        totalPollingUnits: pollingUnits.length,
        totalRegisteredVoters,
        totalTargetVoters,
        totalAppMembers,
        totalVerifiedMembers,
        totalPendingMembers,
        lgaBreakdown: breakdowns,
        pollingUnits,
        recentMembers: zoneMembers.slice(0, 50).map(m => ({
            id: m.id,
            name: m.full_name || m.name || "APM Member",
            lga: m.lga || "",
            ward: m.ward || "",
            is_verified: !!(m.is_verified || m.status === 'verified'),
            created_at: m.created_at || new Date().toISOString(),
            phone: m.phone || null,
        })),
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

            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as SenatorialZoneData;
                        fetchFreshSenatorialZoneData(leader).then(fresh => {
                            localStorage.setItem(cacheKey, JSON.stringify(fresh));
                        }).catch(() => {});
                        return parsed;
                    } catch {}
                }
            }

            const freshData = await fetchFreshSenatorialZoneData(leader);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!leader,
        staleTime: 1000 * 10, // 10 seconds
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};
