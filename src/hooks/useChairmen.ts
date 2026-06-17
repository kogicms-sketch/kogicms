import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
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
    totalMembers: number;
    verifiedMembers: number;
    pendingVerification: number;
    totalCouncillors: number;
    totalSupportGroups: number;
    wardPerformance: {
        ward: string;
        pollingUnits: number;
        members: number;
        performance: number;
    }[];
}

// Get current chairman profile
export const useChairman = () => {
    const { role } = useAuth();

    return useQuery({
        queryKey: ["chairman-profile"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await db
                .from("lga_chairmen")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            return data as unknown as LGAChairman;
        },
        enabled: role === "lga_chairman", // Only run for lga_chairman role
    });
};

// Get dashboard statistics for chairman's LGA
export const useChairmanDashboardStats = () => {
    const { data: chairman } = useChairman();

    return useQuery({
        queryKey: ["chairman-dashboard-stats", chairman?.lga],
        queryFn: async () => {
            if (!chairman) throw new Error("Chairman not loaded");

            // Get total wards and polling units from the main polling_units table
            const { data: pollingUnits, error: puError } = await supabase
                .from("polling_units")
                .select("ward_name, name, lga_name")
                .eq("lga_name", chairman.lga);

            if (puError) throw puError;

            const uniqueWards = new Set<string>(
                ((pollingUnits as any[] | undefined)?.map((pu) => String(pu.ward_name || "")).filter(Boolean)) || []
            );
            const totalWards = uniqueWards.size;
            const totalPollingUnits = pollingUnits?.length || 0;

            // Get total members and verification stats in LGA using the optimized RPC
            const { data: lgaSummary, error: lgaError } = await (supabase as any).rpc("get_jurisdiction_lga_summary", {
                target_lgas: [chairman.lga]
            });

            if (lgaError) throw lgaError;
            const lgaStats = lgaSummary?.[0] || {};
            const totalRegisteredVoters = Number(lgaStats.inec_registered_voters || 0);
            const totalMembers = lgaStats.app_members_total || 0;
            const verifiedMembers = lgaStats.app_members_verified || 0;
            const pendingVerification = lgaStats.app_members_pending || 0;

            // Get members per ward for performance overview
            const { data: memberStats, error: memberStatsError } = await supabase
                .from("members")
                .select("ward")
                .eq("lga", chairman.lga);

            if (memberStatsError) throw memberStatsError;

            const memberCountByWard = (memberStats || []).reduce((acc: Record<string, number>, member) => {
                if (member.ward) {
                    acc[member.ward] = (acc[member.ward] || 0) + 1;
                }
                return acc;
            }, {});

            // Get total councillors
            const { count: councillorCount, error: councillorError } = await db
                .from("councillors")
                .select("*", { count: "exact", head: true })
                .eq("lga", chairman.lga);

            if (councillorError) throw councillorError;

            // Get total support groups in LGA
            const { count: sgCount, error: sgError } = await supabase
                .from("organizations")
                .select("*", { count: "exact", head: true })
                .eq("category", "support_group")
                .eq("lga", chairman.lga);

            if (sgError) throw sgError;

            // Calculate ward performance
            const wardStats = Array.from(uniqueWards).map((ward) => {
                const wardPUs = (pollingUnits as any[] | undefined)?.filter((pu) => pu.ward_name === ward) || [];
                return {
                    ward,
                    pollingUnits: wardPUs.length,
                    members: memberCountByWard[ward] || 0,
                    performance: 0, // Could be calculated based on a target if available
                };
            });

            return {
                totalWards,
                totalPollingUnits,
                totalRegisteredVoters,
                totalMembers,
                verifiedMembers,
                pendingVerification,
                totalCouncillors: councillorCount || 0,
                totalSupportGroups: sgCount || 0,
                wardPerformance: wardStats,
            } as ChairmanDashboardStats;
        },
        enabled: !!chairman,
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
