import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

export const useDeleteSupportGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("organizations")
                .delete()
                .eq("id", id);

            if (error) throw error;
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
