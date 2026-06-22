import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type CampaignEvent = Tables<"activities">;
export type CampaignEventInsert = TablesInsert<"activities">;
export type CampaignEventUpdate = TablesUpdate<"activities">;

export type EventType = 
  | "rally" 
  | "town_hall" 
  | "door_to_door" 
  | "market_campaign" 
  | "motor_park"
  | "religious_visit"
  | "youth_engagement"
  | "women_forum"
  | "strategy_meeting"
  | "other";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  rally: "Rally / Mega Event",
  town_hall: "Town Hall Meeting",
  door_to_door: "Door-to-Door Campaign",
  market_campaign: "Market Campaign",
  motor_park: "Motor Park Campaign",
  religious_visit: "Religious Visit",
  youth_engagement: "Youth Engagement",
  women_forum: "Women's Forum",
  strategy_meeting: "Strategy Meeting",
  other: "Other Event",
};

export const EVENT_IMPORTANCE_COLORS = {
  low: "bg-gray-500",
  normal: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export const useCampaignEvents = (filters?: {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  importance?: string;
  lga?: string;
  candidateAttending?: boolean;
}) => {
  return useQuery({
    queryKey: ["campaign-events", filters],
    queryFn: async () => {
      let query = db
        .from("activities")
        .select(`
          *,
          attendance:activity_attendance(count),
          registered:activity_attendance(count)
        `)
        .not("event_type", "is", null)
        .order("scheduled_date", { ascending: true });

      if (filters?.startDate) {
        query = query.gte("scheduled_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("scheduled_date", filters.endDate);
      }
      if (filters?.eventType) {
        query = query.eq("event_type", filters.eventType);
      }
      if (filters?.importance) {
        query = query.eq("importance", filters.importance);
      }
      if (filters?.lga) {
        query = query.eq("lga", filters.lga);
      }
      if (filters?.candidateAttending !== undefined) {
        query = query.eq("candidate_attending", filters.candidateAttending);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (CampaignEvent & { attendance: { count: number }[] })[];
    },
  });
};

export const useCampaignEvent = (id: string) => {
  return useQuery({
    queryKey: ["campaign-events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          attendance:activity_attendance(*, member:members(full_name, phone, membership_id, political_position)),
          media:activity_media(*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as CampaignEvent & {
        attendance: { 
          id: string;
          checked_in_at: string;
          check_in_method: string;
          member: {
            full_name: string;
            phone: string;
            membership_id: string;
            political_position: string;
          };
        }[];
        media: { id: string; url: string; type: string }[];
      } | null;
    },
    enabled: !!id,
  });
};

export const useCreateCampaignEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: CampaignEventInsert) => {
      const { data, error } = await supabase
        .from("activities")
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-events"] });
      toast.success("Event created successfully!");
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    },
  });
};

export const useUpdateCampaignEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CampaignEventUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("activities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-events"] });
      toast.success("Event updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    },
  });
};

export const useDeleteCampaignEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-events"] });
      toast.success("Event deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    },
  });
};

export const useSendEventBroadcast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await db
        .from("activities")
        .update({
          broadcast_sent: true,
          broadcast_sent_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-events"] });
      toast.success("Event broadcast sent to all members!");
    },
    onError: (error) => {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast");
    },
  });
};

export const useCampaignCalendar = (month?: string, year?: number) => {
  return useQuery({
    queryKey: ["campaign-calendar", month, year],
    queryFn: async () => {
      let query = db
        .from("campaign_calendar")
        .select("*")
        .order("date", { ascending: true });

      if (month) {
        query = query.ilike("date", `${year || new Date().getFullYear()}-${month}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

// Material Requests
export type MaterialRequest = any;
export type MaterialRequestInsert = any;

export const useMaterialRequests = (filters?: { status?: string; lga?: string }) => {
  return useQuery({
    queryKey: ["material-requests", filters],
    queryFn: async () => {
      let query = db
        .from("material_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.lga) {
        query = query.eq("lga", filters.lga);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MaterialRequestInsert) => {
      const { data, error } = await db
        .from("material_requests")
        .insert(request)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      toast.success("Material request submitted!");
    },
    onError: (error) => {
      console.error("Error creating request:", error);
      toast.error("Failed to submit request");
    },
  });
};

export const useApproveMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await db
        .from("material_requests")
        .update({
          status,
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      toast.success("Material request updated!");
    },
    onError: (error) => {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    },
  });
};

export const useReceiveMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("material_requests")
        .update({
          status: "received",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      toast.success("Delivery confirmed and materials marked as Received!");
    },
    onError: (error) => {
      console.error("Error receiving request:", error);
      toast.error("Failed to confirm delivery");
    },
  });
};
