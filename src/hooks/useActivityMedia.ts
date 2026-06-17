import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ActivityMedia {
    id: string;
    activity_id: string;
    url: string;
    type: "image" | "video";
    uploaded_by: string | null;
    created_at: string;
}

export const useActivityMedia = (activityId?: string) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch media for an activity
    const { data: media = [], isLoading } = useQuery({
        queryKey: ["activity-media", activityId],
        queryFn: async () => {
            if (!activityId) return [];

            const { data, error } = await supabase
                .from("activity_media")
                .select("*")
                .eq("activity_id", activityId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as ActivityMedia[];
        },
        enabled: !!activityId,
    });

    // Upload media mutation
    const uploadMedia = useMutation({
        mutationFn: async ({
            file,
            type,
        }: {
            file: File;
            type: "image" | "video";
        }) => {
            if (!user) throw new Error("Not authenticated");
            if (!activityId) throw new Error("No activity ID provided");

            const fileExt = file.name.split(".").pop();
            const fileName = `${activityId}/${Date.now()}.${fileExt}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from("activity-media")
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("activity-media")
                .getPublicUrl(fileName);

            // Insert metadata into database
            const { error: insertError } = await supabase
                .from("activity_media")
                .insert({
                    activity_id: activityId,
                    url: urlData.publicUrl,
                    type,
                    uploaded_by: user.id,
                });

            if (insertError) throw insertError;

            return urlData.publicUrl;
        },
        onSuccess: () => {
            toast.success("Media uploaded successfully");
            queryClient.invalidateQueries({ queryKey: ["activity-media", activityId] });
        },
        onError: (error) => {
            console.error("Upload error:", error);
            toast.error("Failed to upload media");
        },
    });

    return {
        media,
        isLoading,
        uploadMedia,
    };
};
