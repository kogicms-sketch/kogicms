import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { playMessageSound } from "@/utils/notificationSound";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type MessageType = "image" | "file" | "voice" | "meeting" | null;

export interface Message {
    id: string;
    user_id: string;
    channel_id: string;
    content: string | null;
    attachment_url: string | null;
    attachment_type: MessageType;
    created_at: string;
    meeting_id?: string | null;
    sender?: {
        full_name: string | null;
        avatar_url: string | null;
    };
}

export interface Channel {
    id: string;
    name: string;
    type: 'general' | 'group' | 'dm';
    description?: string | null;
}

export interface UserProfile {
    id: string;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
    lga: string | null;
}

// ─── Hook: useMyChannels ─────────────────────────────────────────────────────
// Fetches all channels the current user is a member of
export const useMyChannels = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: channels = [], isLoading } = useQuery({
        queryKey: ["my-channels", user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from("channel_members")
                .select(`
                    channel_id,
                    channels (
                        id,
                        name,
                        type,
                        description
                    )
                `)
                .eq("user_id", user.id);

            if (error) {
                console.error("Error fetching channels:", error);
                return [];
            }

            return (data || [])
                .map((row: any) => row.channels)
                .filter(Boolean) as Channel[];
        },
        enabled: !!user,
    });

    // Realtime: refresh when channel_members changes
    useEffect(() => {
        if (!user) return;

        const sub = supabase
            .channel("my-channels-realtime")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "channel_members",
                filter: `user_id=eq.${user.id}`,
            }, () => {
                queryClient.invalidateQueries({ queryKey: ["my-channels", user.id] });
            })
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [user, queryClient]);

    return { channels, isLoading };
};

// ─── Hook: useAllUsers ───────────────────────────────────────────────────────
// Fetches all users for the DM picker
export const useAllUsers = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["all-users-for-dm"],
        queryFn: async () => {
            const { data, error } = await db.rpc("get_all_users_for_dm");
            if (error) {
                console.error("Error fetching users:", error);
                return [];
            }
            return (data || []) as UserProfile[];
        },
        enabled: !!user,
    });
};

// ─── Hook: useChat ───────────────────────────────────────────────────────────
// Fetches messages for a specific channel and handles sending
export const useChat = (channelId: string | null) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch messages with sender info
    const { data: messages = [], isLoading } = useQuery({
        queryKey: ["chat-messages", channelId],
        queryFn: async () => {
            if (!channelId) return [];

            const { data, error } = await db
                .from("messages")
                .select(`
                    id,
                    user_id,
                    channel_id,
                    content,
                    attachment_url,
                    attachment_type,
                    created_at,
                    meeting_id
                `)
                .eq('channel_id', channelId)
                .order("created_at", { ascending: true })
                .limit(100);

            if (error) {
                console.error("Error fetching messages:", error);
                throw error;
            }

            // Fetch sender profiles separately
            const userIds = [...new Set(data.map(m => m.user_id))].filter(Boolean) as string[];
            if (userIds.length === 0) return data as Message[];

            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .in("id", userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

            return data.map(msg => ({
                ...msg,
                attachment_type: msg.attachment_type as MessageType,
                sender: profileMap.get(msg.user_id!) || { full_name: 'Unknown', avatar_url: null }
            })) as Message[];
        },
        enabled: !!user && !!channelId,
    });

    // ── Real-time subscription: instantly append new messages ──────────────────
    // We keep a ref to the profile cache so we can enrich incoming messages
    const profileCacheRef = useRef<Map<string, { full_name: string | null; avatar_url: string | null }>>(new Map());

    // Populate profile cache whenever messages load
    useEffect(() => {
        messages.forEach(m => {
            if (m.user_id && m.sender) {
                profileCacheRef.current.set(m.user_id, m.sender);
            }
        });
    }, [messages]);

    useEffect(() => {
        if (!user || !channelId) return;

        const realtimeChannel = supabase
            .channel(`chat-messages-${channelId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `channel_id=eq.${channelId}`,
                },
                async (payload: RealtimePostgresChangesPayload<any>) => {
                    const newMsg = payload.new as any;
                    if (!newMsg?.id) return;

                    // Fetch sender profile if not cached
                    let sender = profileCacheRef.current.get(newMsg.user_id);
                    if (!sender && newMsg.user_id) {
                        const { data: p } = await supabase
                            .from("profiles")
                            .select("id, full_name, avatar_url")
                            .eq("id", newMsg.user_id)
                            .single();
                        if (p) {
                            sender = { full_name: p.full_name, avatar_url: p.avatar_url };
                            profileCacheRef.current.set(newMsg.user_id, sender);
                        }
                    }

                    const enrichedMsg: Message = {
                        ...newMsg,
                        attachment_type: newMsg.attachment_type as MessageType,
                        sender: sender || { full_name: "Unknown", avatar_url: null },
                    };

                    // Instantly append to cache — no refetch needed
                    queryClient.setQueryData<Message[]>(
                        ["chat-messages", channelId],
                        (old = []) => {
                            // Avoid duplicates
                            if (old.some(m => m.id === enrichedMsg.id)) return old;
                            return [...old, enrichedMsg];
                        }
                    );

                    // Play sound and refresh unread counts for messages from others
                    if (newMsg.user_id !== user.id) {
                        playMessageSound();
                        queryClient.invalidateQueries({ queryKey: ["unread-counts", user.id] });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(realtimeChannel);
        };
    }, [user, channelId, queryClient]);

    // Send message mutation
    const sendMessage = useMutation({
        mutationFn: async ({
            content,
            file,
            type,
        }: {
            content?: string;
            file?: File | Blob;
            type?: MessageType;
        }) => {
            if (!user || !channelId) throw new Error("Not authenticated or no channel selected");

            let attachment_url: string | null = null;
            let attachment_type: MessageType = null;

            // Upload file if provided
            if (file && type) {
                const fileExt = type === "voice" ? "webm" : (file instanceof File ? file.name.split(".").pop() : "bin");
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;

                const bucket = type === "voice" ? "voice-messages" : "chat-attachments";

                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(fileName);

                attachment_url = urlData.publicUrl;
                attachment_type = type;
            }

            // Insert message
            const { error } = await supabase.from("messages").insert({
                channel_id: channelId,
                user_id: user.id,
                content: content || null,
                attachment_url,
                attachment_type,
            });

            if (error) throw error;
        },
        onError: (error) => {
            console.error("Send message error:", error);
            toast.error("Failed to send message");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chat-messages", channelId] });
        }
    });

    return {
        messages,
        isLoading,
        sendMessage,
    };
};

// ─── Hook: useUnreadCounts ───────────────────────────────────────────────────
// Returns a map of channelId → unread message count for the current user
export const useUnreadCounts = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: counts = {} } = useQuery({
        queryKey: ["unread-counts", user?.id],
        queryFn: async () => {
            if (!user) return {};
            const { data, error } = await db.rpc("get_unread_counts");
            if (error) {
                console.error("Error fetching unread counts:", error);
                return {};
            }
            const map: Record<string, number> = {};
            (data || []).forEach((row: { channel_id: string; unread_count: number }) => {
                map[row.channel_id] = Number(row.unread_count);
            });
            return map;
        },
        enabled: !!user,
        refetchInterval: 30_000, // fallback polling every 30s
    });

    // Real-time: refresh counts + play sound when a message arrives in any channel
    useEffect(() => {
        if (!user) return;

        const sub = supabase
            .channel("unread-counts-realtime")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "messages",
            }, (payload: RealtimePostgresChangesPayload<any>) => {
                const newMsg = payload.new as any;
                // Play sound for messages from other users in background channels
                if (newMsg?.user_id && newMsg.user_id !== user.id) {
                    playMessageSound();
                }
                queryClient.invalidateQueries({ queryKey: ["unread-counts", user.id] });
            })
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [user, queryClient]);

    return counts;
};

// ─── Helper: markChannelRead ─────────────────────────────────────────────────
// Call this when a user opens a channel to reset its unread count
export const markChannelRead = async (channelId: string) => {
    await db.rpc("mark_channel_read", { channel_id_param: channelId });
};

