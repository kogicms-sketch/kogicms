import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

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
export const useCouncillor = () => {
    return useQuery({
        queryKey: ["councillor-profile"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await db
                .from("councillors")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            return data as unknown as Councillor;
        },
    });
};

// Get ward-specific data for councillor
export const useCouncillorWardData = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-ward-data", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            if (!councillor) throw new Error("Councillor not loaded");

            // Get polling units in ward
            const { data: pollingUnits, error: puError } = await supabase
                .from("polling_units")
                .select("*")
                .eq("lga_name", councillor.lga)
                .eq("ward_name", councillor.ward)
                .order("name");

            if (puError) throw puError;

            // Get total members and verification stats in ward using any casting to avoid lint errors
            const { data: memberStats, error: memberError } = await (supabase
                .from("members")
                .select("is_verified")
                .eq("lga", councillor.lga)
                .eq("ward", councillor.ward) as any);

            if (memberError) throw memberError;

            const totalMembers = memberStats?.length || 0;
            const verifiedMembers = memberStats?.filter(m => m.is_verified === true).length || 0;
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
                totalPollingUnits: pollingUnits?.length || 0,
                totalMembers,
                verifiedMembers,
                pendingVerification,
                totalActivities: activityCount || 0,
                pollingUnits: pollingUnits || [],
            } as CouncillorWardData;
        },
        enabled: !!councillor,
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

            // Note: We'll need to add lga/ward columns to organizations table
            // or filter based on member locations
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
