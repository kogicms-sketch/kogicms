import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface Meeting {
    id: string;
    channel_id: string;
    created_by: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    status: 'scheduled' | 'live' | 'ended';
    meeting_link: string | null;
    created_at: string;
}

export interface MeetingInvitation {
    id: string;
    meeting_id: string;
    user_id: string;
    status: 'pending' | 'accepted' | 'declined';
    updated_at: string;
}

export const useMeetings = (channelId?: string) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch meetings for a channel
    const { data: meetings = [], isLoading } = useQuery({
        queryKey: ["meetings", channelId],
        queryFn: async () => {
            if (!channelId) return [];
            const { data, error } = await db
                .from("meetings")
                .select("*")
                .eq("channel_id", channelId)
                .order("scheduled_at", { ascending: true });

            if (error) throw error;
            return data as Meeting[];
        },
        enabled: !!channelId,
    });

    // Create a meeting and invite channel members
    const createMeeting = useMutation({
        mutationFn: async (meetingData: Partial<Meeting>) => {
            if (!user || !channelId) throw new Error("Missing requirements");

            // 1. Create the meeting
            const { data: meeting, error: meetingError } = await db
                .from("meetings")
                .insert({
                    ...meetingData,
                    channel_id: channelId,
                    created_by: user.id,
                })
                .select()
                .single();

            if (meetingError) throw meetingError;

            // 2. Fetch all channel members to invite them
            const { data: members, error: membersError } = await db
                .from("channel_members")
                .select("user_id")
                .eq("channel_id", channelId);

            if (membersError) throw membersError;

            // 3. Create invitations
            const invitations = (members || []).map(m => ({
                meeting_id: meeting.id,
                user_id: m.user_id,
                status: m.user_id === user.id ? 'accepted' : 'pending' // Auto-accept for creator
            }));

            const { error: inviteError } = await db
                .from("meeting_invitations")
                .insert(invitations);

            if (inviteError) throw inviteError;

            // 4. Send a system message to the chat
            const { error: msgError } = await db
                .from("messages")
                .insert({
                    channel_id: channelId,
                    user_id: user.id,
                    content: `Scheduled a meeting: ${meetingData.title}`,
                    meeting_id: meeting.id,
                    attachment_type: 'meeting' as any
                });

            if (msgError) throw msgError;

            return meeting;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["meetings", channelId] });
            queryClient.invalidateQueries({ queryKey: ["chat-messages", channelId] });
            toast.success("Meeting scheduled successfully");
        },
        onError: (error) => {
            console.error("Create meeting error:", error);
            toast.error("Failed to schedule meeting");
        }
    });

    return {
        meetings,
        isLoading,
        createMeeting,
    };
};

export const useMeetingInvitation = (meetingId: string) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: invitation } = useQuery({
        queryKey: ["meeting-invitation", meetingId, user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await db
                .from("meeting_invitations")
                .select("*")
                .eq("meeting_id", meetingId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) throw error;
            return data as MeetingInvitation | null;
        },
        enabled: !!user && !!meetingId,
    });

    const { data: stats } = useQuery({
        queryKey: ["meeting-stats", meetingId],
        queryFn: async () => {
            const { data, error } = await db
                .from("meeting_invitations")
                .select("status")
                .eq("meeting_id", meetingId);

            if (error) throw error;

            return {
                accepted: data.filter(i => i.status === 'accepted').length,
                declined: data.filter(i => i.status === 'declined').length,
                pending: data.filter(i => i.status === 'pending').length,
                total: data.length
            };
        },
        enabled: !!meetingId,
    });

    const updateRSVP = useMutation({
        mutationFn: async (status: 'accepted' | 'declined') => {
            if (!user) throw new Error("Not authenticated");
            const { error } = await db
                .from("meeting_invitations")
                .update({ status })
                .eq("meeting_id", meetingId)
                .eq("user_id", user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["meeting-invitation", meetingId, user?.id] });
            queryClient.invalidateQueries({ queryKey: ["meeting-stats", meetingId] });
        }
    });

    return {
        invitation,
        stats,
        updateRSVP
    };
};
