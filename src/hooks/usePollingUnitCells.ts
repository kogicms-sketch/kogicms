import { ALL_POLLING_UNITS } from "@/data/aggregated_lga_data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
// Voter registry (with real INEC registered-voter data) lives on the Lovable Cloud backend.
import { supabase as registrySupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "./useSettings";
import { localRepository } from "@/services/LocalRepository";
import { syncManager } from "@/services/SyncManager";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const normKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// In-memory indexing of ALL 3,512 Kogi Polling Units by Ward and LGA for sub-millisecond retrieval
const PU_BY_WARD_INDEX = new Map<string, typeof ALL_POLLING_UNITS>();
const PU_BY_LGA_INDEX = new Map<string, typeof ALL_POLLING_UNITS>();

ALL_POLLING_UNITS.forEach((pu) => {
  const wKey = normKey(pu.wardName);
  if (!PU_BY_WARD_INDEX.has(wKey)) PU_BY_WARD_INDEX.set(wKey, []);
  PU_BY_WARD_INDEX.get(wKey)!.push(pu);

  const lKey = normKey(pu.lga);
  if (!PU_BY_LGA_INDEX.has(lKey)) PU_BY_LGA_INDEX.set(lKey, []);
  PU_BY_LGA_INDEX.get(lKey)!.push(pu);
});

export const getIndexedPollingUnits = (lga?: string, ward?: string) => {
  if (ward && ward !== "all" && ward !== "ALL") {
    const key = normKey(ward);
    const direct = PU_BY_WARD_INDEX.get(key);
    if (direct && direct.length > 0) return direct;
    for (const [k, units] of PU_BY_WARD_INDEX.entries()) {
      if (k.includes(key) || key.includes(k)) return units;
    }
  }
  if (lga && lga !== "all" && lga !== "ALL") {
    const key = normKey(lga);
    const direct = PU_BY_LGA_INDEX.get(key);
    if (direct && direct.length > 0) return direct;
  }
  return ALL_POLLING_UNITS;
};

// Normalise a ward + polling-unit identifier into a stable key
const puMatchKey = (ward?: string | null, code?: string | null): string | null => {
  if (!ward || !code) return null;
  const segments = String(code).split(/[-/]/).filter(Boolean);
  const last = segments[segments.length - 1];
  const seq = parseInt(String(last).replace(/\D/g, ""), 10);
  if (Number.isNaN(seq)) return null;
  return `${ward.trim().toUpperCase()}|${seq}`;
};

export type PollingUnitCell = any;
export type PollingUnitCellInsert = any;
export type PollingUnitCellUpdate = any;
export type CellMember = any;
export type CellMemberInsert = any;

export type CellStatus = "forming" | "active" | "mobilizing" | "ready" | "complete";

export const CELL_STATUS_LABELS: Record<CellStatus, { label: string; color: string; bgColor: string }> = {
  forming: { label: "Forming", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  active: { label: "Active", color: "text-blue-600", bgColor: "bg-blue-100" },
  mobilizing: { label: "Mobilizing", color: "text-orange-600", bgColor: "bg-orange-100" },
  ready: { label: "Ready", color: "text-green-600", bgColor: "bg-green-100" },
  complete: { label: "Complete", color: "text-purple-600", bgColor: "bg-purple-100" },
};

export const usePollingUnitCells = (filters?: {
  lga?: string;
  ward?: string;
  status?: string;
  canvasserId?: string;
}) => {
  const { data: profile } = useProfile();

  const targetLga =
    filters?.lga ||
    (typeof window !== "undefined" ? localStorage.getItem("councillor_lga") : null) ||
    profile?.lga ||
    undefined;

  const targetWard =
    filters?.ward ||
    (typeof window !== "undefined" ? localStorage.getItem("councillor_ward") : null) ||
    profile?.ward ||
    undefined;

  return useQuery({
    queryKey: ["polling-unit-cells", targetLga, targetWard, filters?.status, profile?.id],
    staleTime: 1000 * 60 * 10,
    // Immediate synchronous data on mount (< 1ms)
    initialData: () => {
      const units = getIndexedPollingUnits(targetLga, targetWard);
      return units.map((pu) => ({
        id: pu.id,
        polling_unit_name: pu.name,
        ward: pu.wardName,
        lga: pu.lga,
        pu_code: pu.code,
        registered_voters: pu.registeredVoters || 0,
        target_voters: 50,
        app_members_count: 0,
        status: "forming" as CellStatus,
        polling_unit_agent_name: null,
      }));
    },
    initialDataUpdatedAt: Date.now(),
    queryFn: async () => {
      // 1. Base polling units from in-memory indexed register
      let baseUnits = getIndexedPollingUnits(targetLga, targetWard);

      // 2. Fetch campaign members from fast local cache with 400ms background race
      let members: any[] = [];
      try {
        members = await localRepository.getMembers();
      } catch (e) {
        members = [];
      }

      try {
        let query = supabase.from("members").select("id, lga, ward, polling_unit, polling_unit_id, voters_card_id");
        if (targetLga && targetLga !== "all") {
          query = query.in("lga", [targetLga, targetLga.toUpperCase(), targetLga.toLowerCase()]);
        }
        const { data: dbMembers } = await Promise.race([
          query,
          new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 500)),
        ]);
        if (dbMembers && dbMembers.length > 0) {
          members = dbMembers as any[];
        }
      } catch (e) {
        // offline fallback
      }

      // 3. Map members per polling unit
      const memberCountMap = new Map<string, number>();
      (members || []).forEach((m) => {
        const lga = (m.lga || "").toLowerCase().trim();
        const ward = (m.ward || "").toLowerCase().trim();
        const pu = (m.polling_unit || "").toLowerCase().trim();
        const puId = (m.polling_unit_id || "").toLowerCase().trim();

        if (pu) {
          memberCountMap.set(`${lga}|${ward}|${pu}`, (memberCountMap.get(`${lga}|${ward}|${pu}`) || 0) + 1);
          memberCountMap.set(pu, (memberCountMap.get(pu) || 0) + 1);
        }
        if (puId) {
          memberCountMap.set(puId, (memberCountMap.get(puId) || 0) + 1);
        }
      });

      // 4. Load custom modifications (targets, assigned canvassers) from localRepository
      let cachedCustomCells: any[] = [];
      try {
        cachedCustomCells = await localRepository.getPollingUnitCells();
      } catch (e) {
        cachedCustomCells = [];
      }
      const customCellMap = new Map<string, any>();
      cachedCustomCells.forEach((c: any) => {
        if (c.id) customCellMap.set(c.id, c);
        if (c.pu_code) customCellMap.set(c.pu_code, c);
        const key = `${(c.lga || "").toLowerCase()}|${(c.ward || "").toLowerCase()}|${(c.polling_unit_name || "").toLowerCase()}`;
        customCellMap.set(key, c);
      });

      // 5. Build full enriched polling unit cell list
      let cells = baseUnits.map((pu) => {
        const fullKey = `${pu.lga.toLowerCase()}|${pu.wardName.toLowerCase()}|${pu.name.toLowerCase()}`;
        const custom = customCellMap.get(pu.id) || customCellMap.get(pu.code) || customCellMap.get(fullKey);
        const count =
          memberCountMap.get(fullKey) ||
          memberCountMap.get(pu.code.toLowerCase()) ||
          memberCountMap.get(pu.name.toLowerCase().trim()) ||
          0;
        const target = custom?.target_voters || 50;
        const status = custom?.status || (count >= target ? "ready" : count > 0 ? "active" : "forming");

        return {
          id: pu.id,
          polling_unit_name: pu.name,
          ward: pu.wardName,
          lga: pu.lga,
          pu_code: pu.code,
          status: status as CellStatus,
          target_voters: target,
          registered_voters: pu.registeredVoters || 0,
          reliable_voters: custom?.reliable_voters || 0,
          app_members_count: count,
          polling_unit_agent_name: custom?.polling_unit_agent_name || custom?.canvasser_name || null,
          polling_unit_agent_phone: custom?.polling_unit_agent_phone || custom?.canvasser_phone || null,
        };
      });

      if (filters?.status && filters.status !== "all") {
        cells = cells.filter((c) => c.status === filters.status);
      }

      return cells;
    },
  });
};

export const usePollingUnitCell = (id: string) => {
  return useQuery({
    queryKey: ["polling-unit-cell", id],
    queryFn: async () => {
      if (!id) return null;
      const targetId = id.replace(/^(virtual-|static-)/, "");
      const pu = ALL_POLLING_UNITS.find(
        (u) =>
          u.id === targetId ||
          u.code === targetId ||
          u.id === id ||
          u.code === id ||
          u.name.toLowerCase() === targetId.toLowerCase()
      );

      if (pu) {
        let count = 0;
        try {
          const members = await localRepository.getMembers();
          const matchPu = pu.name.toLowerCase().trim();
          count = members.filter(
            (m) =>
              (m.polling_unit && m.polling_unit.toLowerCase().trim() === matchPu) ||
              (m.polling_unit_id && (m.polling_unit_id === pu.id || m.polling_unit_id === pu.code))
          ).length;
        } catch (e) {
          // ignore
        }

        return {
          id: pu.id,
          polling_unit_name: pu.name,
          ward: pu.wardName,
          lga: pu.lga,
          pu_code: pu.code,
          status: (count >= 50 ? "ready" : count > 0 ? "active" : "forming") as CellStatus,
          target_voters: 50,
          registered_voters: pu.registeredVoters || 0,
          reliable_voters: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          members: [],
          canvasser: null,
          canvasser_id: null,
          app_members_count: count,
          polling_unit_agent_name: null,
          polling_unit_agent_phone: null,
        };
      }

      return null;
    },
  });
};

export const useCreatePollingUnitCell = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cell: PollingUnitCellInsert) => {
      const id = cell.id || localRepository.generateUUID();
      const newCell = {
        ...cell,
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const cached = await localRepository.getPollingUnitCells();
      cached.unshift(newCell);
      await localRepository.savePollingUnitCells(cached);

      await localRepository.enqueueAction("polling_unit_cells", "INSERT", id, newCell);
      syncManager.sync();

      return newCell;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polling-unit-cells"] });
      toast.success("Polling unit cell created!");
    },
    onError: (error) => {
      console.error("Error creating cell:", error);
      toast.error("Failed to create cell");
    },
  });
};

export const useUpdatePollingUnitCell = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PollingUnitCellUpdate & { id: string }) => {
      const cached = await localRepository.getPollingUnitCells();
      const updated = cached.map((c: any) => {
        if (c.id === id) {
          return { ...c, ...updates, updated_at: new Date().toISOString() };
        }
        return c;
      });
      await localRepository.savePollingUnitCells(updated);
      await localRepository.enqueueAction("polling_unit_cells", "UPDATE", id, updates);
      syncManager.sync();

      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polling-unit-cells"] });
      toast.success("Polling unit cell updated!");
    },
    onError: (error) => {
      console.error("Error updating cell:", error);
      toast.error("Failed to update cell");
    },
  });
};

export const useAssignCanvasser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cellId,
      canvasserId,
      canvasserName,
      canvasserPhone,
    }: {
      cellId: string;
      canvasserId: string;
      canvasserName: string;
      canvasserPhone: string;
    }) => {
      const updates = {
        canvasser_id: canvasserId,
        canvasser_name: canvasserName,
        canvasser_phone: canvasserPhone,
        status: "active",
        updated_at: new Date().toISOString(),
      };

      const cached = await localRepository.getPollingUnitCells();
      const updated = cached.map((c: any) => {
        if (c.id === cellId) {
          return { ...c, ...updates };
        }
        return c;
      });
      await localRepository.savePollingUnitCells(updated);

      await localRepository.enqueueAction("polling_unit_cells", "UPDATE", cellId, updates);
      syncManager.sync();

      return { id: cellId, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polling-unit-cells"] });
      toast.success("Polling unit agent assigned successfully!");
    },
    onError: (error) => {
      console.error("Error assigning polling unit agent:", error);
      toast.error("Failed to assign polling unit agent");
    },
  });
};

export const useCellMembers = (cellId: string) => {
  return useQuery({
    queryKey: ["cell-members", cellId],
    queryFn: async () => {
      if (!cellId) return [];
      try {
        const { data, error } = await db
          .from("cell_members")
          .select(`
            *,
            member:member_id (
              id,
              full_name,
              phone,
              voters_card_id,
              lga,
              ward
            )
          `)
          .eq("cell_id", cellId)
          .order("created_at", { ascending: false });

        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!cellId,
  });
};

export const useAddCellMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: CellMemberInsert) => {
      const { data, error } = await db
        .from("cell_members")
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cell-members"] });
      queryClient.invalidateQueries({ queryKey: ["polling-unit-cells", variables.cell_id] });
      toast.success("Voter registered in cell!");
    },
    onError: (error) => {
      console.error("Error adding member:", error);
      toast.error("Failed to add member");
    },
  });
};

export const useUpdateCellMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cellId, ...updates }: Partial<CellMember> & { id: string; cellId: string }) => {
      const { data, error } = await db
        .from("cell_members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cell-members"] });
      queryClient.invalidateQueries({ queryKey: ["polling-unit-cells", variables.cellId] });
      toast.success("Member updated!");
    },
    onError: (error) => {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    },
  });
};

export const useRemoveCellMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cellId }: { id: string; cellId: string }) => {
      const { error } = await db
        .from("cell_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cell-members"] });
      queryClient.invalidateQueries({ queryKey: ["polling-unit-cells", variables.cellId] });
      toast.success("Member removed");
    },
    onError: (error) => {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    },
  });
};

// Fast Sub-Millisecond In-Memory Polling Unit Stats
export const usePollingUnitStats = (filters?: {
  lga?: string;
  ward?: string;
}) => {
  const { data: profile } = useProfile();

  const targetLga =
    filters?.lga ||
    (typeof window !== "undefined" ? localStorage.getItem("councillor_lga") : null) ||
    profile?.lga ||
    undefined;

  const targetWard =
    filters?.ward ||
    (typeof window !== "undefined" ? localStorage.getItem("councillor_ward") : null) ||
    profile?.ward ||
    undefined;

  return useQuery({
    queryKey: ["polling-unit-stats", targetLga, targetWard, profile?.id],
    staleTime: 1000 * 60 * 10,
    initialData: () => {
      const units = getIndexedPollingUnits(targetLga, targetWard);
      let totalRegistered = 0;
      units.forEach((pu) => {
        totalRegistered += pu.registeredVoters || 0;
      });
      return {
        totalCells: units.length,
        totalTarget: units.length * 50,
        totalRegistered,
        totalReliable: 0,
        totalAppMembers: 0,
        meetingTarget: 0,
        byStatus: {
          forming: units.length,
          active: 0,
          mobilizing: 0,
          ready: 0,
          complete: 0,
        },
      };
    },
    initialDataUpdatedAt: Date.now(),
    queryFn: async () => {
      const units = getIndexedPollingUnits(targetLga, targetWard);
      let totalRegistered = 0;
      units.forEach((pu) => {
        totalRegistered += pu.registeredVoters || 0;
      });

      let totalAppMembers = 0;
      try {
        const localMembers = await localRepository.getMembers();
        const wardNorm = normKey(targetWard || "");
        totalAppMembers = (localMembers || []).filter((m) => {
          if (!wardNorm) return true;
          return normKey(m.ward).includes(wardNorm) || wardNorm.includes(normKey(m.ward));
        }).length;
      } catch (e) {
        // ignore
      }

      return {
        totalCells: units.length,
        totalTarget: units.length * 50,
        totalRegistered,
        totalReliable: 0,
        totalAppMembers,
        meetingTarget: 0,
        byStatus: {
          forming: Math.max(0, units.length - (totalAppMembers > 0 ? 1 : 0)),
          active: totalAppMembers > 0 ? 1 : 0,
          mobilizing: 0,
          ready: 0,
          complete: 0,
        },
      };
    },
  });
};
