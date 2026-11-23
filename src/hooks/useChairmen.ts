import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { localVoterService } from "@/services/LocalVoterService";
import { getWardsForLga } from "@/lib/campaign-data";
import { ALL_POLLING_UNITS } from "@/data/aggregated_lga_data";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const LOCAL_COUNCILLORS_STORAGE_KEY = "kogi_apm_councillors";

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
        const list: CouncillorRecord[] = raw ? JSON.parse(raw) : [];
        if (!lga) return list;
        const normLga = lga.toLowerCase().replace(/[^a-z]/g, "");
        return list.filter(c => {
            const cLga = (c.lga || "").toLowerCase().replace(/[^a-z]/g, "");
            return cLga === normLga || cLga.includes(normLga) || normLga.includes(cLga);
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
        const normLga = (councillor.lga || "").toLowerCase().replace(/[^a-z]/g, "");
        const normWard = (councillor.ward || "").toLowerCase().trim();
        // Remove existing councillor for same ward in this LGA or same id
        list = list.filter(c => {
            if (c.id === councillor.id) return false;
            const cLga = (c.lga || "").toLowerCase().replace(/[^a-z]/g, "");
            const cWard = (c.ward || "").toLowerCase().trim();
            return !(cLga === normLga && cWard === normWard);
        });
        list.push(councillor);
        localStorage.setItem(LOCAL_COUNCILLORS_STORAGE_KEY, JSON.stringify(list));
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
        const filtered = list.filter(c => c.id !== id);
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

// Get current chairman profile
export const useChairman = () => {
    const { role } = useAuth();

    return useQuery({
        queryKey: ["chairman-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("chairman_profile");
                if (cached) {
                    console.log("📦 Loaded chairman profile from local storage cache.");
                    // Background refresh
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            db.from("lga_chairmen").select("*").eq("user_id", user.id).single()
                                .then(({ data, error }: any) => {
                                    if (data && !error) {
                                        localStorage.setItem("chairman_profile", JSON.stringify(data));
                                    }
                                });
                        }
                    });
                    return JSON.parse(cached) as LGAChairman;
                }
            }

            // 2. Fallback to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await db
                .from("lga_chairmen")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            if (typeof window !== "undefined") {
                localStorage.setItem("chairman_profile", JSON.stringify(data));
            }
            return data as unknown as LGAChairman;
        },
        enabled: role === "lga_chairman", // Only run for lga_chairman role
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
        const normP = pu.lga.toLowerCase().replace(/[^a-z]/g, "");
        const normC = chairman.lga.toLowerCase().replace(/[^a-z]/g, "");
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
            const normLga = chairman.lga.toLowerCase().replace(/[^a-z]/g, "");
            membersData = data.filter((m: any) => {
                if (!m.lga) return false;
                const mNorm = m.lga.toLowerCase().replace(/[^a-z]/g, "");
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

    // 3. Count assigned councillors for this LGA
    const councillorsList = getLocalCouncillors(chairman.lga);
    const councillorCount = councillorsList.length;

    let sgCount = 0;
    try {
        const { count } = await supabase
            .from("organizations")
            .select("*", { count: "exact", head: true })
            .eq("category", "support_group");
        sgCount = count || 0;
    } catch {}

    // 4. Calculate ward breakdown
    const wardMapFromSummary = new Map((summary?.wards || []).map(w => [w.ward_name.toLowerCase().trim(), w]));

    const wardStats = allLgaWards.map((wardName) => {
        const normW = wardName.toLowerCase().trim();
        const wardSummary = wardMapFromSummary.get(normW);
        const wardMembers = membersData.filter((m) =>
            m.ward && m.ward.toLowerCase().trim() === normW
        ).length;
        const totalVoters = wardSummary?.total_voters || 0;
        const pollingUnitsCount = wardSummary?.polling_units_count || ALL_POLLING_UNITS.filter(pu => {
            const normL = pu.lga.toLowerCase().replace(/[^a-z]/g, "");
            const normC = chairman.lga.toLowerCase().replace(/[^a-z]/g, "");
            return normL === normC && pu.wardName.toLowerCase().trim() === normW;
        }).length;
        const perf = totalVoters > 0 ? (wardMembers / totalVoters) * 100 : 0;
        const assignedCouncillor = councillorsList.find(c => c.ward.toLowerCase().trim() === normW);

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
export const useChairmanDashboardStats = () => {
    const { data: chairman } = useChairman();

    return useQuery({
        queryKey: ["chairman-dashboard-stats", chairman?.lga],
        queryFn: async () => {
            if (!chairman) throw new Error("Chairman not loaded");

            const cacheKey = `chairman_dashboard_stats_${chairman.lga}`;

            // 1. Check local cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    // Background refresh
                    (async () => {
                        try {
                            const freshData = await fetchFreshChairmanDashboardStats(chairman);
                            localStorage.setItem(cacheKey, JSON.stringify(freshData));
                        } catch (e) {
                            console.error("Error refreshing chairman dashboard stats in background:", e);
                        }
                    })();
                    return JSON.parse(cached) as ChairmanDashboardStats;
                }
            }

            const freshData = await fetchFreshChairmanDashboardStats(chairman);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!chairman,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

// Get polling units in chairman's LGA
export const useChairmanPollingUnits = (filters?: { ward?: string }) => {
    const { data: chairman } = useChairman();

    return useQuery({
        queryKey: ["chairman-polling-units", chairman?.lga, filters],
        queryFn: async () => {
            if (!chairman?.lga) return [];

            const normLga = chairman.lga.toLowerCase().replace(/[^a-z]/g, "");
            let pus = ALL_POLLING_UNITS.filter(pu => {
                const puLga = pu.lga.toLowerCase().replace(/[^a-z]/g, "");
                return puLga === normLga || puLga.includes(normLga) || normLga.includes(puLga);
            });

            if (filters?.ward && filters.ward !== "all") {
                const normWard = filters.ward.toLowerCase().trim();
                pus = pus.filter(pu => pu.wardName.toLowerCase().trim() === normWard);
            }

            // Fetch member counts from members table / local cache to enrich
            let members: any[] = [];
            try {
                const { data } = await supabase.from("members").select("id, polling_unit, ward, is_verified, status").ilike("lga", `%${chairman.lga}%`);
                if (data) members = data;
            } catch {}

            return pus.map(pu => {
                const puMembers = members.filter(m => (m.polling_unit && m.polling_unit.toLowerCase().trim() === pu.name.toLowerCase().trim()) || m.ward?.toLowerCase().trim() === pu.wardName.toLowerCase().trim());
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
        enabled: !!chairman?.lga,
    });
};

// Get wards in chairman's LGA
export const useChairmanWards = () => {
    const { data: chairman } = useChairman();

    return useQuery({
        queryKey: ["chairman-wards", chairman?.lga],
        queryFn: async () => {
            if (!chairman?.lga) return [];
            return getWardsForLga(chairman.lga);
        },
        enabled: !!chairman?.lga,
    });
};

// Create or assign councillor for a ward
export const useCreateCouncillor = () => {
    const queryClient = useQueryClient();
    const { data: chairman } = useChairman();

    return useMutation({
        mutationFn: async (councillorData: {
            ward: string;
            councillor_name: string;
            email: string;
            password: string;
            phone?: string;
        }) => {
            if (!chairman) throw new Error("Chairman not loaded");

            const id = 'councillor_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            const now = new Date().toISOString();

            const newCouncillor: CouncillorRecord = {
                id,
                user_id: id,
                chairman_id: chairman.id,
                lga: chairman.lga,
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
                const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://glaqcvjfziuvpjbslvpw.supabase.co";
                const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsYXFjdmpmeml1dnBqYnNsdnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMDY0NzEsImV4cCI6MjExMDc4MjQ3MX0.P8rZed_CPabZ3eYjaSvW65Y-dh-iRUP1Gq16pJ_voM4";
                const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
                const { data: authData } = await tempClient.auth.signUp({
                    email: councillorData.email,
                    password: councillorData.password,
                    options: {
                        data: {
                            full_name: councillorData.councillor_name,
                            role: "councillor",
                            lga: chairman.lga,
                            ward: councillorData.ward,
                        }
                    }
                });

                if (authData?.user) {
                    newCouncillor.user_id = authData.user.id;
                    saveLocalCouncillor(newCouncillor);
                }
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
                    lga: chairman.lga,
                    name: councillorData.councillor_name,
                }
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["councillors"] });
            queryClient.invalidateQueries({ queryKey: ["chairman-dashboard-stats"] });
            toast.success("Ward Admin assigned successfully!");
        },
        onError: (error: Error) => {
            console.error("Error creating councillor:", error);
            toast.error(error.message || "Failed to create councillor");
        },
    });
};

// Delete / unassign councillor
export const useDeleteCouncillor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            deleteLocalCouncillor(id);
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
export const useChairmanCouncillors = () => {
    const { data: chairman } = useChairman();

    return useQuery({
        queryKey: ["councillors", chairman?.lga],
        queryFn: async () => {
            if (!chairman?.lga) return [];

            // 1. Get from local storage
            const localList = getLocalCouncillors(chairman.lga);

            // 2. Try fetching from Supabase profiles where role = 'councillor'
            try {
                const { data: profiles, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("role", "councillor");

                if (!error && profiles && profiles.length > 0) {
                    const normChairmanLga = chairman.lga.toLowerCase().replace(/[^a-z]/g, "");
                    const remoteCouncillors: CouncillorRecord[] = profiles
                        .filter((p: any) => {
                            if (!p.lga) return false;
                            const pLga = p.lga.toLowerCase().replace(/[^a-z]/g, "");
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
                            must_change_password: false,
                            is_active: p.account_status !== "suspended",
                            created_at: p.created_at || new Date().toISOString(),
                            updated_at: p.updated_at || new Date().toISOString(),
                        }));

                    // Merge remote with local
                    const mergedMap = new Map<string, CouncillorRecord>();
                    localList.forEach(c => mergedMap.set(`${c.lga.toLowerCase()}|${c.ward.toLowerCase()}`, c));
                    remoteCouncillors.forEach(c => mergedMap.set(`${c.lga.toLowerCase()}|${c.ward.toLowerCase()}`, c));
                    const combined = Array.from(mergedMap.values());

                    if (typeof window !== "undefined") {
                        const allRaw = localStorage.getItem(LOCAL_COUNCILLORS_STORAGE_KEY);
                        let allList: CouncillorRecord[] = allRaw ? JSON.parse(allRaw) : [];
                        allList = allList.filter(c => c.lga.toLowerCase() !== chairman.lga.toLowerCase());
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
        enabled: !!chairman?.lga,
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
