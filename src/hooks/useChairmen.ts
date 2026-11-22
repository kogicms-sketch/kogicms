import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { localVoterService } from "@/services/LocalVoterService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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
    const totalWards = summary?.total_wards || 0;
    const totalPollingUnits = summary?.total_polling_units || 0;
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

    // 3. Councillors & Support Groups
    let councillorCount = 0;
    try {
        const { count } = await db
            .from("councillors")
            .select("*", { count: "exact", head: true })
            .ilike("lga", `%${chairman.lga}%`);
        councillorCount = count || 0;
    } catch {}

    let sgCount = 0;
    try {
        const { count } = await supabase
            .from("organizations")
            .select("*", { count: "exact", head: true })
            .eq("category", "support_group");
        sgCount = count || 0;
    } catch {}

    // 4. Calculate ward breakdown
    const wardStats = (summary?.wards || []).map((w) => {
        const wardMembers = membersData.filter((m) =>
            m.ward && m.ward.toLowerCase().trim() === w.ward_name.toLowerCase().trim()
        ).length;
        const perf = w.total_voters > 0 ? (wardMembers / w.total_voters) * 100 : 0;
        return {
            ward: w.ward_name,
            pollingUnits: w.polling_units_count,
            totalVoters: w.total_voters,
            members: wardMembers,
            performance: parseFloat(perf.toFixed(1)),
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
                    console.log("📦 Loaded chairman dashboard stats from local cache.");
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
            if (!chairman) throw new Error("Chairman not loaded");

            let query = supabase
                .from("polling_units")
                .select("*")
                .eq("lga_name", chairman.lga)
                .order("ward_name")
                .order("name");

            if (filters?.ward) {
                query = query.eq("ward_name", filters.ward);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!chairman,
    });
};

// Get wards in chairman's LGA
export const useChairmanWards = () => {
    const { data: chairman } = useChairman();

    return useQuery({
        queryKey: ["chairman-wards", chairman?.lga],
        queryFn: async () => {
            if (!chairman) throw new Error("Chairman not loaded");

            const { data, error } = await supabase
                .from("polling_units")
                .select("ward_name")
                .eq("lga_name", chairman.lga);

            if (error) throw error;

            // Get unique wards
            const uniqueWards = Array.from(new Set((data as any[]).map((item) => String(item.ward_name || ""))))
                .filter(Boolean)
                .sort();

            return uniqueWards as string[];
        },
        enabled: !!chairman,
    });
};

// Create councillor
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

            const { data, error } = await db.rpc("create_councillor", {
                p_chairman_id: chairman.id,
                p_lga: chairman.lga,
                p_ward: councillorData.ward,
                p_councillor_name: councillorData.councillor_name,
                p_email: councillorData.email,
                p_password: councillorData.password,
                p_phone: councillorData.phone || null,
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string; councillor_id?: string; credentials?: any };

            if (!result.success) {
                throw new Error(result.error || "Failed to create councillor");
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["councillors"] });
            toast.success("Councillor created successfully!");
        },
        onError: (error: Error) => {
            console.error("Error creating councillor:", error);
            toast.error(error.message || "Failed to create councillor");
        },
    });
};

// Get all councillors for chairman's LGA
export const useChairmanCouncillors = () => {
    const { data: chairman } = useChairman();

    return useQuery({
        queryKey: ["councillors", chairman?.lga],
        queryFn: async () => {
            if (!chairman) throw new Error("Chairman not loaded");

            const { data, error } = await db
                .from("councillors")
                .select("*")
                .eq("lga", chairman.lga)
                .order("ward");

            if (error) throw error;
            return data;
        },
        enabled: !!chairman,
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
            const { data, error } = await db.rpc("change_chairman_password", {
                p_new_password: newPassword,
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string };

            if (!result.success) {
                throw new Error(result.error || "Failed to change password");
            }

            return result;
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
