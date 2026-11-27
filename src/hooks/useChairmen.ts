import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { localVoterService } from "@/services/LocalVoterService";
import { getWardsForLga, KOGI_LGAS } from "@/lib/campaign-data";
import { ALL_POLLING_UNITS } from "@/data/aggregated_lga_data";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const LOCAL_COUNCILLORS_STORAGE_KEY = "kogi_apm_councillors";

export const normalizeWardKey = (ward: string | null | undefined): string => {
    if (!ward) return "";
    return ward.toLowerCase().replace(/ward/gi, "").replace(/[^a-z0-9]/g, "");
};

export const normalizeLgaKey = (lga: string | null | undefined): string => {
    if (!lga) return "";
    return lga.toLowerCase().replace(/lga/gi, "").replace(/[^a-z0-9]/g, "");
};

export interface CouncillorRecord {
    id: string;
    user_id: string;
    chairman_id: string;
    lga: string;
    ward: string;
    councillor_name: string;
    phone: string | null;
    email: string;
    password?: string;
    must_change_password?: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const getLocalCouncillors = (lga?: string): CouncillorRecord[] => {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(LOCAL_COUNCILLORS_STORAGE_KEY);
        let list: CouncillorRecord[] = raw ? JSON.parse(raw) : [];

        // Also check if single councillor_profile is cached
        try {
            const cachedSingle = localStorage.getItem("councillor_profile");
            if (cachedSingle) {
                const p = JSON.parse(cachedSingle);
                if (p && (p.ward || p.lga)) {
                    const normSingleWard = normalizeWardKey(p.ward);
                    const alreadyExists = list.some(item => normalizeWardKey(item.ward) === normSingleWard);
                    if (!alreadyExists && p.ward) {
                        list.push({
                            id: p.id || ("councillor_" + Date.now()),
                            user_id: p.user_id || p.id || "",
                            chairman_id: p.chairman_id || "",
                            lga: p.lga || "Lokoja",
                            ward: p.ward,
                            councillor_name: p.councillor_name || p.full_name || "Assigned Councillor",
                            phone: p.phone || p.phone_number || null,
                            email: p.email || "",
                            is_active: true,
                            created_at: p.created_at || new Date().toISOString(),
                            updated_at: p.updated_at || new Date().toISOString(),
                        });
                    }
                }
            }
        } catch {}

        if (!lga) return list;
        const normLga = normalizeLgaKey(lga);
        return list.filter(c => {
            const cLga = normalizeLgaKey(c.lga);
            return !cLga || cLga === normLga || cLga.includes(normLga) || normLga.includes(cLga);
        });
    } catch {
        return [];
    }
};

export const saveLocalCouncillor = (councillor: CouncillorRecord): void => {
    if (typeof window === "undefined") return;
    try {
        const raw = localStorage.getItem(LOCAL_COUNCILLORS_STORAGE_KEY);
        let list: CouncillorRecord[] = raw ? JSON.parse(raw) : [];
        const normLga = normalizeLgaKey(councillor.lga);
        const normWard = normalizeWardKey(councillor.ward);

        // Remove existing councillor for same ward in this LGA or same id
        list = list.filter(c => {
            if (c.id === councillor.id || (c.user_id && c.user_id === councillor.user_id)) return false;
            const cLga = normalizeLgaKey(c.lga);
            const cWard = normalizeWardKey(c.ward);
            return !(cLga === normLga && cWard === normWard);
        });
        list.push(councillor);
        localStorage.setItem(LOCAL_COUNCILLORS_STORAGE_KEY, JSON.stringify(list));

        // Also save to councillor_profile so other views immediately recognize it
        localStorage.setItem("councillor_profile", JSON.stringify(councillor));
        localStorage.setItem("councillor_lga", councillor.lga);
        localStorage.setItem("councillor_ward", councillor.ward);
    } catch (e) {
        console.error("Failed to save councillor to localStorage", e);
    }
};

export const deleteLocalCouncillor = (id: string): void => {
    if (typeof window === "undefined") return;
    try {
        const raw = localStorage.getItem(LOCAL_COUNCILLORS_STORAGE_KEY);
        if (!raw) return;
        const list: CouncillorRecord[] = JSON.parse(raw);
        const filtered = list.filter(c => c.id !== id && c.user_id !== id);
        localStorage.setItem(LOCAL_COUNCILLORS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error("Failed to delete councillor from localStorage", e);
    }
};

// Types
export interface LGAChairman {
    id: string;
    user_id: string;
    lga: string;
    chairman_name: string;
    phone: string | null;
    email: string;
    party: string;
    election_date: string | null;
    sworn_in_date: string | null;
    must_change_password: boolean;
    last_password_change: string | null;
    is_active: boolean;
    photo_url: string | null;
    bio: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChairmanDashboardStats {
    totalWards: number;
    totalPollingUnits: number;
    totalRegisteredVoters: number;
    maleVoters: number;
    malePct: string;
    femaleVoters: number;
    femalePct: string;
    totalMembers: number;
    verifiedMembers: number;
    pendingVerification: number;
    remainingVoters: number;
    expectedTurnoutRate: string;
    totalCouncillors: number;
    totalSupportGroups: number;
    wardPerformance: {
        ward: string;
        pollingUnits: number;
        members: number;
        totalVoters?: number;
        performance: number;
        councillorName?: string | null;
        isAssigned?: boolean;
    }[];
}

export const detectLgaFromUser = (email?: string | null, metadata?: any): string | null => {
    if (metadata?.lga) return metadata.lga;
    if (!email) return null;
    const clean = email.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const lga of KOGI_LGAS) {
        const normLga = lga.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (clean.includes(normLga)) return lga;
    }
    return null;
};

// Get current chairman profile
export const useChairman = () => {
    const { role, user } = useAuth();

    return useQuery({
        queryKey: ["chairman-profile", role, user?.id, user?.email],
        queryFn: async () => {
            const expectedLga = detectLgaFromUser(user?.email, user?.user_metadata);

            // 1. Check local storage cache, but rigorously validate against current user
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("chairman_profile");
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as LGAChairman;
                        const userMatches = user
                            ? (parsed.user_id === user.id ||
                               (user.email && parsed.email?.toLowerCase().trim() === user.email.toLowerCase().trim()))
                            : true;

                        const lgaMatches = !expectedLga || (parsed.lga && parsed.lga.toLowerCase() === expectedLga.toLowerCase());

                        if (parsed && parsed.lga && userMatches && lgaMatches) {
                            return parsed;
                        } else {
                            // Stale cache from a previous or different user; clear it!
                            localStorage.removeItem("chairman_profile");
                        }
                    } catch {
                        localStorage.removeItem("chairman_profile");
                    }
                }
            }

            // 2. If user is authenticated, query lga_chairmen table
            if (user) {
                try {
                    let query = db.from("lga_chairmen").select("*");
                    if (user.id) {
                        query = query.or(`user_id.eq.${user.id},email.eq.${user.email}`);
                    } else if (user.email) {
                        query = query.eq("email", user.email);
                    }
                    const { data, error } = await query.maybeSingle();

                    if (data && !error && data.lga) {
                        if (typeof window !== "undefined") {
                            localStorage.setItem("chairman_profile", JSON.stringify(data));
                            localStorage.setItem("chairman_lga", data.lga);
                        }
                        return data as unknown as LGAChairman;
                    }
                } catch (e) {
                    console.warn("Could not query lga_chairmen table:", e);
                }

                // Check profiles table
                try {
                    const { data: profile } = await db
                        .from("profiles")
                        .select("*")
                        .eq("id", user.id)
                        .maybeSingle();

                    if (profile?.lga) {
                        const profLga = profile.lga;
                        const profileChairman: LGAChairman = {
                            id: profile.id || `chair-${profLga.toLowerCase()}`,
                            user_id: user.id,
                            lga: profLga,
                            chairman_name: profile.full_name || `${profLga} LGA Chairman`,
                            phone: profile.phone || null,
                            email: user.email || profile.email || `chairman.${profLga.toLowerCase()}@kogicms.ng`,
                            party: "APM",
                            election_date: null,
                            sworn_in_date: null,
                            must_change_password: false,
                            last_password_change: null,
                            is_active: true,
                            photo_url: profile.passport_url || null,
                            bio: null,
                            created_at: profile.created_at || new Date().toISOString(),
                            updated_at: profile.updated_at || new Date().toISOString()
                        };
                        if (typeof window !== "undefined") {
                            localStorage.setItem("chairman_profile", JSON.stringify(profileChairman));
                            localStorage.setItem("chairman_lga", profLga);
                        }
                        return profileChairman;
                    }
                } catch (e) {
                    console.warn("Could not query profiles table for LGA:", e);
                }
            }

            // 3. Fallback for admin or mock user
            const adminSelected = typeof window !== "undefined" ? localStorage.getItem("admin_selected_lga") : null;
            const targetLga = expectedLga || adminSelected || "Lokoja";

            const adminFallback: LGAChairman = {
                id: "chair-" + targetLga.toLowerCase().replace(/[^a-z0-9]/g, ""),
                user_id: user?.id || `chair-${targetLga.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
                lga: targetLga,
                chairman_name: user?.user_metadata?.full_name || `${targetLga} LGA Chairman`,
                phone: user?.user_metadata?.phone || null,
                email: user?.email || `chairman.${targetLga.toLowerCase().replace(/[^a-z0-9]/g, "")}@kogicms.ng`,
                party: "APM",
                election_date: null,
                sworn_in_date: null,
                must_change_password: false,
                last_password_change: null,
                is_active: true,
                photo_url: null,
                bio: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (typeof window !== "undefined") {
                localStorage.setItem("chairman_profile", JSON.stringify(adminFallback));
                localStorage.setItem("chairman_lga", targetLga);
            }
            return adminFallback;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

const fetchFreshChairmanDashboardStats = async (chairman: LGAChairman): Promise<ChairmanDashboardStats> => {
    // 1. Get official INEC voter & gender stats for this LGA
    const summary = await localVoterService.getSummary(chairman.lga);
    const allLgaWards = getWardsForLga(chairman.lga);
    const totalWards = allLgaWards.length > 0 ? allLgaWards.length : (summary?.total_wards || 0);
    const totalPollingUnits = summary?.total_polling_units || ALL_POLLING_UNITS.filter(pu => {
        const normP = normalizeLgaKey(pu.lga);
        const normC = normalizeLgaKey(chairman.lga);
        return normP === normC;
    }).length;
    const totalRegisteredVoters = summary?.total_voters_extracted || 0;
    const maleVoters = summary?.male_voters || 0;
    const malePct = summary?.male_pct || "0%";
    const femaleVoters = summary?.female_voters || 0;
    const femalePct = summary?.female_pct || "0%";

    // 2. Fetch campaign registered members in Supabase for this LGA
    let totalMembers = 0;
    let verifiedMembers = 0;
    let pendingVerification = 0;
    let membersData: any[] = [];

    try {
        const { data, error } = await supabase
            .from("members")
            .select("id, status, is_verified, ward, gender, lga");

        if (!error && data) {
            const normLga = normalizeLgaKey(chairman.lga);
            membersData = data.filter((m: any) => {
                if (!m.lga) return false;
                const mNorm = normalizeLgaKey(m.lga);
                return mNorm === normLga || mNorm.includes(normLga) || normLga.includes(mNorm);
            });
            totalMembers = membersData.length;
            verifiedMembers = membersData.filter((m: any) => m.is_verified || m.status === "active").length;
            pendingVerification = totalMembers - verifiedMembers;
        }
    } catch (e) {
        console.warn("Could not load campaign members from Supabase:", e);
    }

    const remainingVoters = Math.max(0, totalRegisteredVoters - totalMembers);
    const expectedTurnoutRate = totalRegisteredVoters > 0
        ? ((totalMembers / totalRegisteredVoters) * 100).toFixed(1) + "%"
        : "0%";

    // 3. Count assigned councillors for this LGA (combining local storage & Supabase profiles)
    let councillorsList = getLocalCouncillors(chairman.lga);
    try {
        const { data: remoteProfiles } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "councillor");
        if (remoteProfiles && remoteProfiles.length > 0) {
            const normChairmanLga = normalizeLgaKey(chairman.lga);
            const matchingRemote: CouncillorRecord[] = remoteProfiles
                .filter((p: any) => {
                    if (!p.lga) return false;
                    const pLga = normalizeLgaKey(p.lga);
                    return pLga === normChairmanLga || pLga.includes(normChairmanLga) || normChairmanLga.includes(pLga);
                })
                .map((p: any) => ({
                    id: p.id,
                    user_id: p.id,
                    chairman_id: chairman.id,
                    lga: p.lga,
                    ward: p.ward || "",
                    councillor_name: p.full_name || p.email,
                    phone: p.phone || p.phone_number || null,
                    email: p.email,
                    is_active: p.account_status !== "suspended",
                    created_at: p.created_at || new Date().toISOString(),
                    updated_at: p.updated_at || new Date().toISOString(),
                }));
            const map = new Map<string, CouncillorRecord>();
            councillorsList.forEach(c => map.set(normalizeWardKey(c.ward), c));
            matchingRemote.forEach(c => map.set(normalizeWardKey(c.ward), c));
            councillorsList = Array.from(map.values());
        }
    } catch {}

    const councillorCount = councillorsList.length;

    let sgCount = 0;
    try {
        const { count } = await supabase
            .from("organizations")
            .select("*", { count: "exact", head: true })
            .eq("category", "support_group");
        sgCount = count || 0;
    } catch {}

    // 4. Calculate ward breakdown with normalized ward matching
    const wardMapFromSummary = new Map((summary?.wards || []).map(w => [normalizeWardKey(w.ward_name), w]));

    const wardStats = allLgaWards.map((wardName) => {
        const normW = normalizeWardKey(wardName);
        const wardSummary = wardMapFromSummary.get(normW);
        const wardMembers = membersData.filter((m) =>
            m.ward && normalizeWardKey(m.ward) === normW
        ).length;
        const totalVoters = wardSummary?.total_voters || 0;
        const pollingUnitsCount = wardSummary?.polling_units_count || ALL_POLLING_UNITS.filter(pu => {
            const normL = normalizeLgaKey(pu.lga);
            const normC = normalizeLgaKey(chairman.lga);
            return normL === normC && normalizeWardKey(pu.wardName) === normW;
        }).length;
        const perf = totalVoters > 0 ? (wardMembers / totalVoters) * 100 : 0;
        const assignedCouncillor = councillorsList.find(c => {
            const cW = normalizeWardKey(c.ward);
            return cW === normW || cW.includes(normW) || normW.includes(cW);
        });

        return {
            ward: wardName,
            pollingUnits: pollingUnitsCount,
            totalVoters,
            members: wardMembers,
            performance: parseFloat(perf.toFixed(1)),
            councillorName: assignedCouncillor?.councillor_name || null,
            isAssigned: !!assignedCouncillor,
        };
    });

    return {
        totalWards,
        totalPollingUnits,
        totalRegisteredVoters,
        maleVoters,
        malePct,
        femaleVoters,
        femalePct,
        totalMembers,
        verifiedMembers,
        pendingVerification,
        remainingVoters,
        expectedTurnoutRate,
        totalCouncillors: councillorCount,
        totalSupportGroups: sgCount,
        wardPerformance: wardStats,
    };
};

// Get dashboard statistics for chairman's LGA
export const useChairmanDashboardStats = (overrideLga?: string) => {
    const { data: chairman } = useChairman();
    const targetLga = overrideLga || chairman?.lga || "Lokoja";

    return useQuery({
        queryKey: ["chairman-dashboard-stats", targetLga],
        queryFn: async () => {
            const activeChairman: LGAChairman = chairman && chairman.lga === targetLga ? chairman : {
                id: "chair-" + targetLga.toLowerCase(),
                user_id: "admin",
                lga: targetLga,
                chairman_name: `${targetLga} LGA Chairman`,
                phone: null,
                email: `chairman.${targetLga.toLowerCase()}@apm.ng`,
                party: "APM",
                election_date: null,
                sworn_in_date: null,
                must_change_password: false,
                last_password_change: null,
                is_active: true,
                photo_url: null,
                bio: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const cacheKey = `chairman_dashboard_stats_${targetLga}`;

            // 1. Check local cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    // Background refresh
                    (async () => {
                        try {
                            const freshData = await fetchFreshChairmanDashboardStats(activeChairman);
                            localStorage.setItem(cacheKey, JSON.stringify(freshData));
                        } catch (e) {
                            console.error("Error refreshing chairman dashboard stats in background:", e);
                        }
                    })();
                    return JSON.parse(cached) as ChairmanDashboardStats;
                }
            }

            const freshData = await fetchFreshChairmanDashboardStats(activeChairman);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!targetLga,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

// Get polling units in chairman's LGA
export const useChairmanPollingUnits = (filters?: { ward?: string; lga?: string }) => {
    const { data: chairman } = useChairman();
    const targetLga = filters?.lga || chairman?.lga || "Lokoja";

    return useQuery({
        queryKey: ["chairman-polling-units", targetLga, filters],
        queryFn: async () => {
            if (!targetLga) return [];

            const normLga = normalizeLgaKey(targetLga);
            let pus = ALL_POLLING_UNITS.filter(pu => {
                const puLga = normalizeLgaKey(pu.lga);
                return puLga === normLga || puLga.includes(normLga) || normLga.includes(puLga);
            });

            if (filters?.ward && filters.ward !== "all") {
                const normWard = normalizeWardKey(filters.ward);
                pus = pus.filter(pu => normalizeWardKey(pu.wardName) === normWard);
            }

            // Fetch member counts from members table / local cache to enrich
            let members: any[] = [];
            try {
                const { data } = await supabase.from("members").select("id, polling_unit, ward, is_verified, status").ilike("lga", `%${targetLga}%`);
                if (data) members = data;
            } catch {}

            return pus.map(pu => {
                const puMembers = members.filter(m => (m.polling_unit && m.polling_unit.toLowerCase().trim() === pu.name.toLowerCase().trim()) || normalizeWardKey(m.ward) === normalizeWardKey(pu.wardName));
                const verified = puMembers.filter(m => m.is_verified || m.status === 'active').length;
                return {
                    id: pu.id,
                    name: pu.name,
                    code: pu.code,
                    ward_name: pu.wardName,
                    lga_name: pu.lga,
                    registered_voters: pu.registeredVoters || 0,
                    verified_members: verified,
                    total_members: puMembers.length,
                    status: verified >= 10 ? "complete" : verified >= 5 ? "ready" : verified > 0 ? "active" : "forming",
                };
            });
        },
        enabled: !!targetLga,
    });
};

// Get wards in chairman's LGA
export const useChairmanWards = (overrideLga?: string) => {
    const { data: chairman } = useChairman();
    const targetLga = overrideLga || chairman?.lga || "Lokoja";

    return useQuery({
        queryKey: ["chairman-wards", targetLga],
        queryFn: async () => {
            if (!targetLga) return [];
            return getWardsForLga(targetLga);
        },
        enabled: !!targetLga,
    });
};

// Create or assign councillor for a ward
export const useCreateCouncillor = (overrideLga?: string) => {
    const queryClient = useQueryClient();
    const { data: chairman } = useChairman();

    return useMutation({
        mutationFn: async (councillorData: {
            ward: string;
            councillor_name: string;
            email: string;
            password: string;
            phone?: string;
            lga?: string;
        }) => {
            const activeLga = councillorData.lga || overrideLga || chairman?.lga || "Lokoja";
            const chairmanId = chairman?.id || `chair_${activeLga.toLowerCase()}`;

            const id = 'councillor_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            const now = new Date().toISOString();

            const newCouncillor: CouncillorRecord = {
                id,
                user_id: id,
                chairman_id: chairmanId,
                lga: activeLga,
                ward: councillorData.ward,
                councillor_name: councillorData.councillor_name,
                email: councillorData.email,
                password: councillorData.password,
                phone: councillorData.phone || null,
                must_change_password: false,
                is_active: true,
                created_at: now,
                updated_at: now,
            };

            // 1. Immediately persist to localStorage for 100% offline & instant UI availability
            saveLocalCouncillor(newCouncillor);

            // 2. Attempt online registration via Supabase auth (without logging out current user)
            try {
                const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oxpgjbynsxaabchvrrwp.supabase.co";
                const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGdqYnluc3hhYWJjaHZycndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDI1NzgsImV4cCI6MjEwNDI3ODU3OH0.ZCv2qd8zs3gbDgPIJDLt6L3EaktppEmyET9KphD0g3w";
                const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
                const { data: authData } = await tempClient.auth.signUp({
                    email: councillorData.email,
                    password: councillorData.password,
                    options: {
                        data: {
                            full_name: councillorData.councillor_name,
                            role: "councillor",
                            lga: activeLga,
                            ward: councillorData.ward,
                        }
                    }
                });

                const userId = authData?.user?.id || newCouncillor.id;
                newCouncillor.user_id = userId;

                // Also persist directly into public.profiles & user_roles
                try {
                    await supabase.from("profiles").upsert({
                        id: userId,
                        email: councillorData.email,
                        full_name: councillorData.councillor_name,
                        phone: councillorData.phone || null,
                        role: "councillor",
                        lga: activeLga,
                        ward: councillorData.ward,
                        account_status: "active",
                    });

                    await supabase.from("user_roles").upsert({
                        user_id: userId,
                        role: "councillor",
                    });
                } catch (profErr) {
                    console.warn("Could not upsert profile directly to Supabase:", profErr);
                }

                saveLocalCouncillor(newCouncillor);
            } catch (authErr) {
                console.warn("Background auth creation notice (saved locally):", authErr);
            }

            return {
                success: true,
                councillor_id: newCouncillor.id,
                credentials: {
                    email: councillorData.email,
                    password: councillorData.password,
                    ward: councillorData.ward,
                    lga: activeLga,
                    name: councillorData.councillor_name,
                }
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["councillors"] });
            queryClient.invalidateQueries({ queryKey: ["chairman-dashboard-stats"] });
            queryClient.invalidateQueries({ queryKey: ["chairman-wards"] });
            toast.success("Ward Admin assigned successfully!");
        },
        onError: (error: Error) => {
            console.error("Error creating councillor:", error);
            toast.error(error.message || "Failed to create councillor");
        },
    });
};

// Delete / unassign councillor
export const useDeleteCouncillor = (overrideLga?: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            deleteLocalCouncillor(id);
            try {
                await supabase.from("profiles").delete().eq("id", id);
                await supabase.from("user_roles").delete().eq("user_id", id);
            } catch (e) {
                console.warn("Could not remove councillor profile from Supabase:", e);
            }
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["councillors"] });
            queryClient.invalidateQueries({ queryKey: ["chairman-dashboard-stats"] });
            toast.success("Ward Admin removed successfully");
        },
    });
};

// Get all councillors for chairman's LGA
export const useChairmanCouncillors = (overrideLga?: string) => {
    const { data: chairman } = useChairman();
    const targetLga = overrideLga || chairman?.lga || "Lokoja";

    return useQuery({
        queryKey: ["councillors", targetLga],
        queryFn: async () => {
            if (!targetLga) return [];

            // 1. Get from local storage
            const localList = getLocalCouncillors(targetLga);

            // 2. Try fetching from Supabase profiles where role = 'councillor'
            try {
                const { data: profiles, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("role", "councillor");

                if (!error && profiles && profiles.length > 0) {
                    const normChairmanLga = normalizeLgaKey(targetLga);
                    const remoteCouncillors: CouncillorRecord[] = profiles
                        .filter((p: any) => {
                            if (!p.lga) return false;
                            const pLga = normalizeLgaKey(p.lga);
                            return pLga === normChairmanLga || pLga.includes(normChairmanLga) || normChairmanLga.includes(pLga);
                        })
                        .map((p: any) => ({
                            id: p.id,
                            user_id: p.id,
                            chairman_id: chairman?.id || "chair_" + targetLga.toLowerCase(),
                            lga: p.lga,
                            ward: p.ward || "",
                            councillor_name: p.full_name || p.email,
                            phone: p.phone || p.phone_number || null,
                            email: p.email,
                            must_change_password: false,
                            is_active: p.account_status !== "suspended",
                            created_at: p.created_at || new Date().toISOString(),
                            updated_at: p.updated_at || new Date().toISOString(),
                        }));

                    // Merge remote with local using normalized ward keys
                    const mergedMap = new Map<string, CouncillorRecord>();
                    localList.forEach(c => mergedMap.set(normalizeWardKey(c.ward), c));
                    remoteCouncillors.forEach(c => mergedMap.set(normalizeWardKey(c.ward), c));
                    const combined = Array.from(mergedMap.values());

                    if (typeof window !== "undefined") {
                        const allRaw = localStorage.getItem(LOCAL_COUNCILLORS_STORAGE_KEY);
                        let allList: CouncillorRecord[] = allRaw ? JSON.parse(allRaw) : [];
                        const targetNorm = normalizeLgaKey(targetLga);
                        allList = allList.filter(c => normalizeLgaKey(c.lga) !== targetNorm);
                        allList.push(...combined);
                        localStorage.setItem(LOCAL_COUNCILLORS_STORAGE_KEY, JSON.stringify(allList));
                    }

                    return combined;
                }
            } catch (e) {
                console.warn("Could not fetch councillors from Supabase profiles, using local cache:", e);
            }

            return localList;
        },
        enabled: !!targetLga,
    });
};

// Generate support group credentials
export const useGenerateSupportGroupCredentials = () => {
    const queryClient = useQueryClient();
    const { data: chairman } = useChairman();

    return useMutation({
        mutationFn: async (credentialData: {
            support_group_id: string;
            username: string;
            password: string;
        }) => {
            if (!chairman) throw new Error("Chairman not loaded");

            const { data, error } = await db.rpc("generate_support_group_credentials", {
                p_support_group_id: credentialData.support_group_id,
                p_chairman_id: chairman.id,
                p_username: credentialData.username,
                p_password: credentialData.password,
                p_lga: chairman.lga,
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string; credential_id?: string };

            if (!result.success) {
                throw new Error(result.error || "Failed to generate credentials");
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["support-group-credentials"] });
            toast.success("Credentials generated successfully!");
        },
        onError: (error: Error) => {
            console.error("Error generating credentials:", error);
            toast.error(error.message || "Failed to generate credentials");
        },
    });
};

// Get support group credentials created by chairman
export const useChairmanSupportGroupCredentials = () => {
    const { data: chairman } = useChairman();

    return useQuery({
        queryKey: ["support-group-credentials", chairman?.id],
        queryFn: async () => {
            if (!chairman) throw new Error("Chairman not loaded");

            const { data, error } = await db
                .from("support_group_credentials")
                .select(`
          *,
          support_group:organizations(id, name, member_count)
        `)
                .eq("chairman_id", chairman.id)
                .order("generated_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!chairman,
    });
};

// Change chairman password
export const useChangePassword = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newPassword: string) => {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chairman-profile"] });
            toast.success("Password changed successfully!");
        },
        onError: (error: Error) => {
            console.error("Error changing password:", error);
            toast.error(error.message || "Failed to change password");
        },
    });
};
