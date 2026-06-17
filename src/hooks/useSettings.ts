import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const useProfile = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    const { user, role } = useAuth();

    return useMutation({
        mutationFn: async (updatedData: {
            full_name?: string;
            phone_number?: string;
            avatar_url?: string;
        }) => {
            if (!user) throw new Error("Not authenticated");

            // 1. Update profiles table
            const { data, error } = await supabase
                .from("profiles")
                .update(updatedData)
                .eq("id", user.id)
                .select()
                .single();

            if (error) throw error;

            // 2. Update Auth metadata to ensure UI updates immediately
            const metadata: any = {};
            if (updatedData.full_name) metadata.full_name = updatedData.full_name;
            if (updatedData.avatar_url) metadata.avatar_url = updatedData.avatar_url;

            if (Object.keys(metadata).length > 0) {
                const { error: authError } = await supabase.auth.updateUser({
                    data: metadata
                });
                if (authError) console.error("Error updating auth metadata:", authError);
            }

            // 3. Update role-specific tables if necessary
            if (role === 'councillor' && (updatedData.full_name || updatedData.avatar_url)) {
                const councillorUpdate: any = {};
                if (updatedData.full_name) councillorUpdate.councillor_name = updatedData.full_name;
                if (updatedData.avatar_url) councillorUpdate.photo_url = updatedData.avatar_url;

                await db
                    .from("councillors")
                    .update(councillorUpdate)
                    .eq("user_id", user.id);
            } else if (role === 'lga_chairman' && (updatedData.full_name || updatedData.avatar_url)) {
                const chairmanUpdate: any = {};
                if (updatedData.full_name) chairmanUpdate.chairman_name = updatedData.full_name;
                if (updatedData.avatar_url) chairmanUpdate.photo_url = updatedData.avatar_url;

                await db
                    .from("lga_chairmen")
                    .update(chairmanUpdate)
                    .eq("user_id", user.id);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["councillor-profile"] });
            queryClient.invalidateQueries({ queryKey: ["chairman-profile"] });
            toast.success("Profile updated successfully");
        },
        onError: (error: Error) => {
            console.error("Update profile error:", error);
            toast.error(error.message || "Failed to update profile");
        },
    });
};

export const useUploadAvatar = () => {
    const { user } = useAuth();
    const updateProfile = useUpdateProfile();

    return useMutation({
        mutationFn: async (file: File) => {
            if (!user) throw new Error("Not authenticated");

            const fileExt = file.name.split(".").pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("profile-images")
                .upload(filePath, file, {
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("profile-images")
                .getPublicUrl(filePath);

            // Update profile with new avatar URL
            await updateProfile.mutateAsync({ avatar_url: publicUrl });

            return publicUrl;
        },
        onSuccess: () => {
            toast.success("Profile image updated");
        },
        onError: (error: Error) => {
            console.error("Avatar upload error:", error);
            toast.error(error.message || "Failed to upload image");
        },
    });
};

export const useUpdatePassword = () => {
    return useMutation({
        mutationFn: async (password: string) => {
            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Password updated successfully");
        },
        onError: (error: Error) => {
            console.error("Password update error:", error);
            toast.error(error.message || "Failed to update password");
        },
    });
};
