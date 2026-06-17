import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface TargetPollingUnit {
  id: string;
  name: string;
  code: string;
  lga_name: string;
  ward_name: string;
  registered_voters: number;
  target_voters: number;
}

export const useTargetManagement = (filters?: { lga?: string; ward?: string }) => {
  return useQuery({
    queryKey: ["target-management", filters],
    queryFn: async () => {
      let query = db
        .from("polling_units")
        .select("id, name, code, lga_name, ward_name, registered_voters, target_voters")
        .order("lga_name", { ascending: true })
        .order("ward_name", { ascending: true })
        .order("name", { ascending: true });

      if (filters?.lga && filters.lga !== "all" && filters.lga !== "All LGAs") {
        query = query.eq("lga_name", filters.lga);
      }
      if (filters?.ward && filters.ward !== "all" && filters.ward !== "All Wards") {
        query = query.eq("ward_name", filters.ward);
      }

      // If no filters are provided, we should ideally paginate to prevent loading all 4,900+ rows instantly.
      // But given the need for full overview, we fetch a large batch or all.
      // Since Supabase limits to 1000 by default, let's fetch in batches.
      const PAGE_SIZE = 1000;
      let allUnits: TargetPollingUnit[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) throw error;
        allUnits = allUnits.concat((data as TargetPollingUnit[]) || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        page++;
      }

      return allUnits;
    },
  });
};

export const useUpdateTargetVoters = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, puName, target }: { id: string; puName: string; target: number }) => {
      // 1. Update the static base table
      const { error: puError } = await db
        .from("polling_units")
        .update({ target_voters: target })
        .eq("id", id);

      if (puError) throw puError;

      // 2. Also update the polling_unit_cells table if it exists
      const { error: cellError } = await db
        .from("polling_unit_cells")
        .update({ target_voters: target })
        .eq("polling_unit_name", puName);

      if (cellError) console.error("Error updating cell target:", cellError);

      return { id, target };
    },
    onSuccess: (data) => {
      toast.success("Target successfully updated!");
      queryClient.invalidateQueries({ queryKey: ["target-management"] });
      // Invalidate dashboard stats to reflect the new target immediately
      queryClient.invalidateQueries({ queryKey: ["polling-unit-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (error) => {
      console.error("Error saving target:", error);
      toast.error("Failed to update target. Please try again.");
    },
  });
};

export const useBulkUpdateTargets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // We expect an array of units mapped to their new target
    mutationFn: async (updates: { id: string; puName: string; target: number }[]) => {
      // Chunk updates into groups of 50 to avoid overloading the DB
      const chunkSize = 50;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);

        const promises = chunk.map(async (update) => {
          // Update polling_units
          await db
            .from("polling_units")
            .update({ target_voters: update.target })
            .eq("id", update.id);

          // Update polling_unit_cells
          await db
            .from("polling_unit_cells")
            .update({ target_voters: update.target })
            .eq("polling_unit_name", update.puName);
        });

        await Promise.all(promises);
      }
      return true;
    },
    onSuccess: () => {
      toast.success("All targets successfully updated!");
      queryClient.invalidateQueries({ queryKey: ["target-management"] });
      queryClient.invalidateQueries({ queryKey: ["polling-unit-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["polling-unit-cells"] });
    },
    onError: (error) => {
      console.error("Error applying bulk update:", error);
      toast.error("Failed to bulk update targets.");
    },
  });
};
