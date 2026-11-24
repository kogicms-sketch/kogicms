import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { ALL_POLLING_UNITS, ALL_LGA_SUMMARIES } from "@/data/aggregated_lga_data";
import { localRepository } from "@/services/LocalRepository";

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

// 9 Default Kogi Federal Constituencies (House of Reps)
export const DEFAULT_FEDERAL_REPS: FederalRep[] = [
    {
        id: 'USR-REP-01',
        user_id: 'USR-REP-01',
        constituency_code: 'FED-ADAVI-OKEHI',
        constituency_name: 'Adavi/Okehi Federal Constituency',
        lga_list: ['Adavi', 'Okehi'],
        rep_name: 'Hon. Rep (Adavi/Okehi)',
        phone: '08032000001',
        email: 'rep.adavi.okehi@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-REP-02',
        user_id: 'USR-REP-02',
        constituency_code: 'FED-AJAOKUTA',
        constituency_name: 'Ajaokuta Federal Constituency',
        lga_list: ['Ajaokuta'],
        rep_name: 'Hon. Rep (Ajaokuta)',
        phone: '08032000002',
        email: 'rep.ajaokuta@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-REP-03',
        user_id: 'USR-REP-03',
        constituency_code: 'FED-ANKPA-OMALA-OLAMABORO',
        constituency_name: 'Ankpa/Omala/Olamaboro Federal Constituency',
        lga_list: ['Ankpa', 'Omala', 'Olamaboro'],
        rep_name: 'Hon. Rep (Ankpa/Omala/Olamaboro)',
        phone: '08032000003',
        email: 'rep.ankpa@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-REP-04',
        user_id: 'USR-REP-04',
        constituency_code: 'FED-BASSA-DEKINA',
        constituency_name: 'Bassa/Dekina Federal Constituency',
        lga_list: ['Bassa', 'Dekina'],
        rep_name: 'Hon. Rep (Bassa/Dekina)',
        phone: '08032000004',
        email: 'rep.bassa.dekina@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-REP-05',
        user_id: 'USR-REP-05',
        constituency_code: 'FED-IDAH-IBAJI-OFU',
        constituency_name: 'Idah/Ibaji/Igalamela-Odolu/Ofu Federal Constituency',
        lga_list: ['Idah', 'Ibaji', 'Igalamela-Odolu', 'Ofu'],
        rep_name: 'Hon. Rep (Idah/Ibaji/Igalamela/Ofu)',
        phone: '08032000005',
        email: 'rep.idah.federal@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-REP-06',
        user_id: 'USR-REP-06',
        constituency_code: 'FED-KABBA-IJUMU',
        constituency_name: 'Kabba-Bunu/Ijumu Federal Constituency',
        lga_list: ['Kabba/Bunu', 'Ijumu'],
        rep_name: 'Hon. Rep (Kabba-Bunu/Ijumu)',
        phone: '08032000006',
        email: 'rep.kabba.ijumu@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-REP-07',
        user_id: 'USR-REP-07',
        constituency_code: 'FED-LOKOJA-KOGI',
        constituency_name: 'Lokoja/Kogi (Koton Karfe) Federal Constituency',
        lga_list: ['Lokoja', 'Kogi (Koton Karfe)'],
        rep_name: 'Hon. Rep (Lokoja/Kogi KK)',
        phone: '08032000007',
        email: 'rep.lokoja.kogi@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-REP-08',
        user_id: 'USR-REP-08',
        constituency_code: 'FED-OKENE-OGORI',
        constituency_name: 'Okene/Ogori-Magongo Federal Constituency',
        lga_list: ['Okene', 'Ogori/Magongo'],
        rep_name: 'Hon. Rep (Okene/Ogori-Magongo)',
        phone: '08032000008',
        email: 'rep.okene.ogori@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'USR-REP-09',
        user_id: 'USR-REP-09',
        constituency_code: 'FED-YAGBA-MOPAMURO',
        constituency_name: 'Yagba East/Yagba West/Mopa-Muro Federal Constituency',
        lga_list: ['Yagba East', 'Yagba West', 'Mopa-Muro'],
        rep_name: 'Hon. Rep (Yagba/Mopamuro)',
        phone: '08032000009',
        email: 'rep.yagba.mopamuro@kogicms.ng',
        is_active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
];

export const getLocalFederalReps = (): FederalRep[] => {
    if (typeof window === "undefined") return DEFAULT_FEDERAL_REPS;
    try {
        const stored = localStorage.getItem("local_federal_reps");
        if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_FEDERAL_REPS;
};

// Get current federal rep profile
export const useFederalRep = () => {
    return useQuery({
        queryKey: ["federal-rep-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("federal_rep_profile");
                if (cached) {
                    try {
                        return JSON.parse(cached) as FederalRep;
                    } catch {}
                }
            }

            // 2. Identify authenticated user
            let currentUser: any = null;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
            } catch {}

            const reps = getLocalFederalReps();
            const currentEmail = (currentUser?.email || (typeof window !== "undefined" ? localStorage.getItem("auth_email") : ""))?.toLowerCase().trim();

            if (currentEmail) {
                const matched = reps.find(r => r.email.toLowerCase().trim() === currentEmail);
                if (matched) {
                    if (typeof window !== "undefined") {
                        localStorage.setItem("federal_rep_profile", JSON.stringify(matched));
                    }
                    return matched;
                }
            }

            // 3. Fallback to Supabase if online
            if (currentUser?.id) {
                try {
                    const { data, error } = await db
                        .from("federal_reps")
                        .select("*")
                        .eq("user_id", currentUser.id)
                        .maybeSingle();

                    if (!error && data) {
                        if (typeof window !== "undefined") {
                            localStorage.setItem("federal_rep_profile", JSON.stringify(data));
                        }
                        return data as FederalRep;
                    }
                } catch {}
            }

            // 4. Fallback default to Lokoja/Kogi KK Rep
            const fallback = reps.find(r => r.constituency_code === 'FED-LOKOJA-KOGI') || reps[0] || DEFAULT_FEDERAL_REPS[0];
            if (typeof window !== "undefined") {
                localStorage.setItem("federal_rep_profile", JSON.stringify(fallback));
            }
            return fallback;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });
};

const fetchFreshConstituencyData = async (rep: FederalRep): Promise<FederalConstituencyData> => {
    const norm = (s: string) => (s ? s.toLowerCase().replace(/[^a-z]/g, "") : "");
    const targetLgasNorm = rep.lga_list.map(norm);

    // 1. Gather all polling units for this constituency from ALL_POLLING_UNITS
    const matchedPUs = ALL_POLLING_UNITS.filter(pu => {
        const puLgaNorm = norm(pu.lga);
        return targetLgasNorm.some(tl => tl === puLgaNorm || tl.includes(puLgaNorm) || puLgaNorm.includes(tl));
    });

    // 2. Load members in this constituency from localRepository + Supabase
    let constMembers: any[] = [];
    try {
        const allLocal = await localRepository.getMembers();
        constMembers = allLocal.filter(m => {
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
            constMembers.forEach(m => memberMap.set(m.id, m));
            remoteRows.forEach(m => {
                const mLgaNorm = norm(m.lga || "");
                if (targetLgasNorm.some(tl => tl === mLgaNorm || tl.includes(mLgaNorm) || mLgaNorm.includes(tl))) {
                    if (!memberMap.has(m.id)) {
                        memberMap.set(m.id, m);
                    }
                }
            });
            constMembers = Array.from(memberMap.values());
        }
    } catch {}

    // 3. Build LGA Breakdown
    const breakdowns: ConstituencyLGABreakdown[] = rep.lga_list.map(lgaName => {
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
        const targetVoters = Math.round(regVoters * 0.45);

        const lgaMembers = constMembers.filter(m => {
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
        constituency_name: rep.constituency_name,
        constituency_code: rep.constituency_code,
        lga_list: rep.lga_list,
        totalPollingUnits: pollingUnits.length,
        totalRegisteredVoters,
        totalTargetVoters,
        totalAppMembers,
        totalVerifiedMembers,
        totalPendingMembers,
        lgaBreakdown: breakdowns,
        pollingUnits,
        recentMembers: constMembers.slice(0, 50).map(m => ({
            id: m.id,
            name: m.full_name || m.name || "APM Member",
            lga: m.lga || "",
            ward: m.ward || "",
            is_verified: !!(m.is_verified || m.status === 'verified'),
            created_at: m.created_at || new Date().toISOString(),
            phone: m.phone || null,
        })),
    } as FederalConstituencyData;
};

// Get aggregated stats for the constituency
export const useFederalConstituencyData = () => {
    const { data: rep } = useFederalRep();

    return useQuery({
        queryKey: ["federal-constituency-data", rep?.constituency_code],
        queryFn: async () => {
            if (!rep) throw new Error("Rep not loaded");

            const cacheKey = `federal_constituency_data_${rep.constituency_code}`;

            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as FederalConstituencyData;
                        fetchFreshConstituencyData(rep).then(fresh => {
                            localStorage.setItem(cacheKey, JSON.stringify(fresh));
                        }).catch(() => {});
                        return parsed;
                    } catch {}
                }
            }

            const freshData = await fetchFreshConstituencyData(rep);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!rep,
        staleTime: 1000 * 10,
        gcTime: 1000 * 60 * 30,
    });
};
