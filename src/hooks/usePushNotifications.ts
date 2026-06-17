import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// VAPID public key - this should match your server's public key
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type NotificationPermissionStatus = "default" | "granted" | "denied" | "unsupported";

export interface UsePushNotificationsReturn {
  permission: NotificationPermissionStatus;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  isSupported: boolean;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionStatus>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isSupported = typeof window !== "undefined" && 
    "serviceWorker" in navigator && 
    "PushManager" in window &&
    "Notification" in window;

  // Check current permission and subscription status
  useEffect(() => {
    const checkStatus = async () => {
      if (!isSupported) {
        setPermission("unsupported");
        setIsLoading(false);
        return;
      }

      // Check Notification permission
      setPermission(Notification.permission as NotificationPermissionStatus);

      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if there's an existing subscription in the DB
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        setIsSubscribed(data && data.length > 0);
      } catch (error) {
        console.error("Error checking subscription status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [user, isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) {
      toast.error("Push notifications are not supported");
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push notifications not configured");
      return;
    }

    setIsLoading(true);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as NotificationPermissionStatus);

      if (permissionResult !== "granted") {
        toast.error("Notification permission denied");
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      if (!subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error("Invalid subscription keys");
      }

      // Save to database - use upsert to handle existing subscriptions
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        },
        {
          onConflict: "user_id,endpoint",
        }
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
    } catch (error) {
      console.error("Subscribe error:", error);
      toast.error("Failed to enable notifications");
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;

    setIsLoading(true);

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error("Unsubscribe error:", error);
      toast.error("Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isSupported,
  };
};