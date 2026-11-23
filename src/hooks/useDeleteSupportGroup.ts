"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import { deleteLocalSupportGroup } from "./useSupportGroups";

export const useDeleteSupportGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // 1. Delete from local storage
            deleteLocalSupportGroup(id);

            // 2. Attempt Supabase delete in background
            try {
                await supabase
                    .from("organizations")
                    .delete()
                    .eq("id", id);
            } catch (err) {
                console.warn("Supabase organizations delete skipped:", err);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["support-groups"] });
            toast.success("Support group deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting support group:", error);
            toast.error("Failed to delete support group");
        },
    });
};
