"use client";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Activity } from "@/hooks/useActivities";

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
                    tag: "activity-update",
                },
            },
        });
    } catch (error) {
        console.error("Failed to send push notification:", error);
    }
};

export const ActivityNotifications = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel("global-activity-notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "activities",
                },
                async (payload) => {
                    const newActivity = payload.new as Activity;

                    // Show in-app toast
                    toast.info("New Activity Created", {
                        description: newActivity.title,
                        action: {
                            label: "View",
                            onClick: () => window.location.href = "/activities"
                        },
                        duration: 5000,
                    });

                    // Trigger push notification for all users
                    sendPushNotification(
                        user.id,
                        "New Activity",
                        newActivity.title,
                        "/activities"
                    );
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "activities",
                },
                async (payload) => {
                    const updatedActivity = payload.new as Activity;
                    const oldActivity = payload.old as Partial<Activity>;

                    // Only notify on status changes
                    if (oldActivity.status !== updatedActivity.status) {
                        const statusMessages: Record<string, string> = {
                            ongoing: "has started",
                            completed: "has been completed",
                            cancelled: "has been cancelled",
                        };

                        const message = statusMessages[updatedActivity.status || ""] || "has been updated";

                        toast.info(`Activity ${message}`, {
                            description: updatedActivity.title,
                            action: {
                                label: "View",
                                onClick: () => window.location.href = "/activities"
                            },
                            duration: 5000,
                        });

                        // Trigger push notification
                        sendPushNotification(
                            user.id,
                            `Activity ${message}`,
                            updatedActivity.title,
                            "/activities"
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return null;
};