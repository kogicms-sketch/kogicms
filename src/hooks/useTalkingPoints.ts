import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type TalkingPoint = any;
export type TalkingPointInsert = any;

export type TalkingPointCategory = 
  | "daily_message" 
  | "achievement" 
  | "policy" 
  | "response" 
  | "mobilization"
  | "prayer";

export const CATEGORY_LABELS: Record<TalkingPointCategory, { label: string; color: string; icon: string }> = {
  daily_message: { label: "Daily Message", color: "bg-blue-500", icon: "MessageSquare" },
  achievement: { label: "Achievement", color: "bg-green-500", icon: "Trophy" },
  policy: { label: "Policy", color: "bg-purple-500", icon: "FileText" },
  response: { label: "Response", color: "bg-orange-500", icon: "Reply" },
  mobilization: { label: "Mobilization", color: "bg-red-500", icon: "Users" },
  prayer: { label: "Prayer", color: "bg-indigo-500", icon: "Praying" },
};

export const useTalkingPoints = (filters?: {
  category?: string;
  active?: boolean;
  date?: string;
}) => {
  return useQuery({
    queryKey: ["talking-points", filters],
    queryFn: async () => {
      let query = db
        .from("talking_points")
        .select(`
          *,
          creator:profiles(full_name, avatar_url)
        `)
        .order("publish_date", { ascending: false })
        .order("priority", { ascending: false });

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.active !== undefined) {
        query = query.eq("is_active", filters.active);
      }
      if (filters?.date) {
        query = query.eq("publish_date", filters.date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (TalkingPoint & { creator: { full_name: string; avatar_url: string } })[];
    },
  });
};

export const useDailyTalkingPoints = () => {
  return useQuery({
    queryKey: ["talking-points", "daily"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await db
        .from("talking_points")
        .select("*")
        .eq("is_active", true)
        .lte("publish_date", today)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`)
        .order("priority", { ascending: false })
        .order("publish_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
};

export const useTalkingPoint = (id: string) => {
  return useQuery({
    queryKey: ["talking-points", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("talking_points")
        .select(`
          *,
          creator:profiles(full_name, avatar_url)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as TalkingPoint & { creator: { full_name: string; avatar_url: string } } | null;
    },
    enabled: !!id,
  });
};

export const useCreateTalkingPoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (talkingPoint: TalkingPointInsert) => {
      const { data, error } = await db
        .from("talking_points")
        .insert(talkingPoint)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talking-points"] });
      toast.success("Talking point published!");
    },
    onError: (error) => {
      console.error("Error creating talking point:", error);
      toast.error("Failed to publish talking point");
    },
  });
};

export const useUpdateTalkingPoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TalkingPoint> & { id: string }) => {
      const { data, error } = await db
        .from("talking_points")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talking-points"] });
      toast.success("Talking point updated!");
    },
    onError: (error) => {
      console.error("Error updating talking point:", error);
      toast.error("Failed to update talking point");
    },
  });
};

export const useDeleteTalkingPoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("talking_points")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talking-points"] });
      toast.success("Talking point deleted");
    },
    onError: (error) => {
      console.error("Error deleting talking point:", error);
      toast.error("Failed to delete talking point");
    },
  });
};

export const useShareTalkingPoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      talkingPointId,
      platform,
      recipientCount = 1,
    }: {
      talkingPointId: string;
      platform: string;
      recipientCount?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await db
        .from("talking_point_shares")
        .insert({
          talking_point_id: talkingPointId,
          platform,
          recipient_count: recipientCount,
          user_id: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talking-points"] });
    },
    onError: (error) => {
      console.error("Error recording share:", error);
    },
  });
};

export const useTalkingPointStats = () => {
  return useQuery({
    queryKey: ["talking-points", "stats"],
    queryFn: async () => {
      const { data, error } = await db
        .from("talking_points")
        .select("category, share_count, view_count");

      if (error) throw error;

      const stats = {
        total: data.length,
        totalShares: data.reduce((acc, tp) => acc + (tp.share_count || 0), 0),
        totalViews: data.reduce((acc, tp) => acc + (tp.view_count || 0), 0),
        byCategory: {} as Record<string, number>,
        topShared: [] as { title: string; shares: number }[],
      };

      data.forEach((tp) => {
        stats.byCategory[tp.category] = (stats.byCategory[tp.category] || 0) + 1;
      });

      return stats;
    },
  });
};

// Helper to format talking point content for sharing
export const formatTalkingPointForShare = (talkingPoint: TalkingPoint): string => {
  let content = "";
  
  if (talkingPoint.title) {
    content += `📢 *${talkingPoint.title}*\n\n`;
  }
  
  if (talkingPoint.summary) {
    content += `${talkingPoint.summary}\n\n`;
  } else if (talkingPoint.content) {
    content += `${talkingPoint.content}\n\n`;
  }
  
  if (talkingPoint.hashtags && talkingPoint.hashtags.length > 0) {
    content += talkingPoint.hashtags.join(" ") + "\n\n";
  }
  
  content += "🇳🇬 #DR2027 #DikkoRadda #KatsinaFirst";
  
  return content;
};

// Share to different platforms
export const shareToWhatsApp = (text: string) => {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
};

export const shareToTwitter = (text: string) => {
  const encoded = encodeURIComponent(text);
  window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");
};

export const shareToFacebook = (text: string) => {
  const encoded = encodeURIComponent(text);
  window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}`, "_blank");
};

export const shareToTelegram = (text: string) => {
  const encoded = encodeURIComponent(text);
  window.open(`https://t.me/share/url?text=${encoded}`, "_blank");
};
