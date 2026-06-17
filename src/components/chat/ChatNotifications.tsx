"use client";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Message } from "@/hooks/useChat";

// Helper to send push notification via edge function
const sendPushNotification = async (
    excludeUserId: string,
    title: string,
    body: string,
    url: string
) => {
    try {
        await supabase.functions.invoke("send-push-notification", {
            body: {
                exclude_user_id: excludeUserId,
                payload: {
                    title,
                    body,
                    url,
                    tag: "chat-message",
                },
            },
        });
    } catch (error) {
        console.error("Failed to send push notification:", error);
    }
};

export const ChatNotifications = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel("global-chat-notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                },
                async (payload) => {
                    const newMessage = payload.new as Message;

                    // Don't notify for own messages
                    if (newMessage.user_id === user.id) return;

                    // Fetch sender name for the toast
                    const { data: sender } = await supabase
                        .from("profiles")
                        .select("full_name")
                        .eq("id", newMessage.user_id)
                        .single();

                    const senderName = sender?.full_name || "Someone";
                    const messagePreview = newMessage.content
                        ? (newMessage.content.length > 30 ? newMessage.content.substring(0, 30) + "..." : newMessage.content)
                        : "Sent an attachment";

                    // Show in-app toast
                    toast.info(`New message from ${senderName}`, {
                        description: messagePreview,
                        action: {
                            label: "View",
                            onClick: () => window.location.href = "/chat"
                        },
                        duration: 5000,
                    });

                    // Trigger push notification for other users
                    sendPushNotification(
                        user.id,
                        `New message from ${senderName}`,
                        messagePreview,
                        "/chat"
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return null; // This component handles side effects only
};
