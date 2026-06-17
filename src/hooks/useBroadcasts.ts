import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type BroadcastNotification = any;
export type BroadcastNotificationInsert = any;

export type BroadcastType = "general" | "event" | "mobilization" | "urgent" | "celebration" | "prayer";

export const BROADCAST_TYPE_CONFIG: Record<BroadcastType, { 
  label: string; 
  color: string; 
  icon: string;
  bgColor: string;
}> = {
  general: { 
    label: "General", 
    color: "text-blue-600", 
    icon: "Info",
    bgColor: "bg-blue-100",
  },
  event: { 
    label: "Event", 
    color: "text-purple-600", 
    icon: "Calendar",
    bgColor: "bg-purple-100",
  },
  mobilization: { 
    label: "Mobilization", 
    color: "text-orange-600", 
    icon: "Users",
    bgColor: "bg-orange-100",
  },
  urgent: { 
    label: "Urgent", 
    color: "text-red-600", 
    icon: "AlertTriangle",
    bgColor: "bg-red-100",
  },
  celebration: { 
    label: "Celebration", 
    color: "text-green-600", 
    icon: "PartyPopper",
    bgColor: "bg-green-100",
  },
  prayer: { 
    label: "Prayer", 
    color: "text-indigo-600", 
    icon: "Praying",
    bgColor: "bg-indigo-100",
  },
};

export const useBroadcasts = (filters?: {
  type?: string;
  sent?: boolean;
  scheduled?: boolean;
}) => {
  return useQuery({
    queryKey: ["broadcasts", filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from("broadcast_notifications")
        .select(`
          *,
          sender:profiles(full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.sent !== undefined) {
        query = query.eq("is_sent", filters.sent);
      }
      if (filters?.scheduled) {
        query = query.not("scheduled_for", "is", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (BroadcastNotification & { 
        sender: { full_name: string; avatar_url: string } | null;
      })[];
    },
  });
};

export const useMyNotifications = () => {
  return useQuery({
    queryKey: ["my-notifications"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await db
        .from("notification_recipients")
        .select(`
          *,
          notification:broadcast_notifications(*)
        `)
        .eq("user_id", userData.user.id)
        .order("delivered_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
};

export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ["unread-notifications-count"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return 0;

      const { count, error } = await (supabase as any)
        .from("notification_recipients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useCreateBroadcast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (broadcast: BroadcastNotificationInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await (supabase as any)
        .from("broadcast_notifications")
        .insert({
          ...broadcast,
          sent_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Broadcast created!");
    },
    onError: (error) => {
      console.error("Error creating broadcast:", error);
      toast.error("Failed to create broadcast");
    },
  });
};

export const useSendBroadcast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (broadcastId: string) => {
      // Get broadcast details
      const { data: broadcast, error: fetchError } = await (supabase as any)
        .from("broadcast_notifications")
        .select("*")
        .eq("id", broadcastId)
        .single();

      if (fetchError) throw fetchError;

      // Determine target recipients
      let recipientQuery = db.from("members").select("id, phone");

      if (broadcast.target_lgas && broadcast.target_lgas.length > 0) {
        recipientQuery = recipientQuery.in("lga", broadcast.target_lgas);
      }
      if (broadcast.target_wards && broadcast.target_wards.length > 0) {
        recipientQuery = recipientQuery.in("ward", broadcast.target_wards);
      }

      const { data: recipients, error: recipientsError } = await recipientQuery;
      if (recipientsError) throw recipientsError;

      // Mark broadcast as sent
      const { data, error: updateError } = await (supabase as any)
        .from("broadcast_notifications")
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
          recipient_count: recipients?.length || 0,
        })
        .eq("id", broadcastId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create notification recipients records
      if (recipients && recipients.length > 0) {
        const recipientRecords = recipients.map((r) => ({
          notification_id: broadcastId,
          member_id: r.id,
        }));

        await (supabase as any)
          .from("notification_recipients")
          .insert(recipientRecords);
      }

      return { ...data, recipientCount: recipients?.length || 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success(`Broadcast sent to ${result.recipientCount} recipients!`);
    },
    onError: (error) => {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast");
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipientId: string) => {
      const { data, error } = await db
        .from("notification_recipients")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", recipientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await db
        .from("notification_recipients")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", userData.user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      toast.success("All notifications marked as read");
    },
  });
};

export const useDeleteBroadcast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("broadcast_notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Broadcast deleted");
    },
    onError: (error) => {
      console.error("Error deleting broadcast:", error);
      toast.error("Failed to delete broadcast");
    },
  });
};

// Helper to get target audience description
export const getTargetDescription = (broadcast: BroadcastNotification): string => {
  const parts: string[] = [];
  
  if (broadcast.target_lgas && broadcast.target_lgas.length > 0) {
    if (broadcast.target_lgas.length === 1) {
      parts.push(broadcast.target_lgas[0]);
    } else {
      parts.push(`${broadcast.target_lgas.length} LGAs`);
    }
  }
  
  if (broadcast.target_wards && broadcast.target_wards.length > 0) {
    parts.push(`${broadcast.target_wards.length} wards`);
  }
  
  if (parts.length === 0) {
    return "All members";
  }
  
  return parts.join(", ");
};

// Push notification helpers
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const showLocalNotification = (title: string, options?: NotificationOptions) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      ...options,
    });
  }
};
