import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

export interface Activity {
    id: string;
    title: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    location: string;
    organization_id: string;
    status: string;
    description: string;
    expected_attendance: number;
    attendance_count?: number;
}

export const useActivities = (organizationId?: string) => {
    return useQuery({
        queryKey: ["activities", organizationId],
        queryFn: async () => {
            let query = supabase
                .from("activities")
                .select(`
                    *,
                    activity_attendance (count)
                `)
                .order("scheduled_date", { ascending: false });

            if (organizationId) {
                query = query.eq("organization_id", organizationId);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching activities:", error);
                throw error;
            }

            return data.map((activity: any) => ({
                ...activity,
                attendance_count: activity.activity_attendance?.[0]?.count || 0,
            })) as Activity[];
        },
        enabled: !!organizationId,
    });
};

export const useCheckIn = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            activityId,
            memberId,
        }: {
            activityId: string;
            memberId: string; // This is the membership_id (e.g., "00234"), not UUID
        }) => {
            // 1. Find the member by membership_id
            const { data: member, error: memberError } = await supabase
                .from("members")
                .select("id, full_name")
                .eq("membership_id", memberId)
                .single();

            if (memberError || !member) {
                throw new Error("Member not found with this ID.");
            }

            // 2. Check if already checked in
            const { data: existing } = await supabase
                .from("activity_attendance")
                .select("id")
                .eq("activity_id", activityId)
                .eq("member_id", member.id)
                .single();

            if (existing) {
                throw new Error("Member is already checked in.");
            }

            // 3. Record attendance
            const { error: checkInError } = await supabase
                .from("activity_attendance")
                .insert({
                    activity_id: activityId,
                    member_id: member.id,
                    check_in_method: "manual",
                });

            if (checkInError) throw checkInError;

            return member;
        },
        onSuccess: (data) => {
            toast.success(`Checked in: ${data.full_name}`);
            queryClient.invalidateQueries({ queryKey: ["activities"] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
