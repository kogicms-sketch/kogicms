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

// Normalise a ward + polling-unit identifier into a stable key so we can match
// the real voter-registry counts (codes like "20-21-07-041") to the polling
// unit cells (codes like "W07-041"). Both share the trailing PU sequence number.
const puMatchKey = (ward?: string | null, code?: string | null): string | null => {
  if (!ward || !code) return null;
  const segments = String(code).split(/[-/]/).filter(Boolean);
  const last = segments[segments.length - 1];
  const seq = parseInt(String(last).replace(/\D/g, ""), 10);
  if (Number.isNaN(seq)) return null;
  return `${ward.trim().toUpperCase()}|${seq}`;
};

// Fetch the real registered-voter counts per polling unit from the voter registry.
// Returns a Map keyed by `${WARD}|${seq}` -> registered_count.
const fetchRegisteredVoterCounts = async (ward?: string): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  try {
    let query = registrySupabase
      .from("voter_pu_counts")
      .select("ward, polling_unit_code, registered_count")
      .limit(2000);
    
    if (ward) {
      query = query.eq("ward", ward);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching voter registry counts:", error);
      return map;
    }
    (data || []).forEach((row: any) => {
      const key = puMatchKey(row.ward, row.polling_unit_code);
      if (key) map.set(key, row.registered_count || 0);
    });
  } catch (e) {
    console.error("Error fetching voter registry counts:", e);
  }
  return map;
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

  return useQuery({
    queryKey: ["polling-unit-cells", filters, profile?.id],
    staleTime: 1000 * 60 * 5, // 5 mins cache
    gcTime: 1000 * 60 * 30,
    enabled: !!profile,
    queryFn: async () => {
      let targetLga = filters?.lga;
      let targetWard = filters?.ward;

      if (profile) {
        if (profile.role === "councillor") {
          targetLga = profile.lga || undefined;
          targetWard = profile.ward || undefined;
        } else if (profile.role === "lga_chairman" || profile.role === "house_assembly_member") {
          targetLga = profile.lga || undefined;
        }
      }

      // 1. Check local cache first
      let cached = await localRepository.getPollingUnitCells();
      
      // Apply filters locally
      if (targetLga) {
        cached = cached.filter(c => c.lga === targetLga);
      }
      if (targetWard) {
        cached = cached.filter(c => c.ward === targetWard);
      }
      if (filters?.status) {
        cached = cached.filter(c => c.status === filters.status);
      }
      if (filters?.canvasserId) {
        cached = cached.filter(c => c.canvasser_id === filters.canvasserId);
      }

      if (cached.length > 0) {
        console.log(`📦 Loaded ${cached.length} polling unit cells from IndexedDB local cache.`);
        
        // Enrich cached cells with pu_code from polling_units table
        try {
          let puQuery = supabase
            .from("polling_units")
            .select("name, code");
            
          if (targetLga) {
            puQuery = puQuery.eq("lga_name", targetLga);
          }
          if (targetWard) {
            puQuery = puQuery.eq("ward_name", targetWard);
          }
          
          const { data: puData } = await puQuery;
            
          if (puData && puData.length > 0) {
            const codeMap = new Map();
            puData.forEach(pu => {
              codeMap.set(pu.name.toLowerCase().trim(), pu.code);
            });
            cached = cached.map(c => ({
              ...c,
              pu_code: c.pu_code || codeMap.get(c.polling_unit_name?.toLowerCase().trim()) || null
            }));
          }
        } catch (e) {
          console.warn("Failed to enrich cached cells with pu_code:", e);
        }

        return cached;
      }

      // 2. Fallback to Supabase
      console.log("🌐 IndexedDB cache empty. Querying polling units from database...");
      let query = db
        .from("polling_unit_cells")
        .select(`
          *,
          members:cell_members(count),
          canvasser:members(id, full_name, phone, membership_id)
        `)
        .order("created_at", { ascending: false });

      if (targetLga) {
        query = query.eq("lga", targetLga);
      }
      if (targetWard) {
        query = query.eq("ward", targetWard);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.canvasserId) {
        query = query.eq("canvasser_id", filters.canvasserId);
      }

      const { data: dbCells, error } = await query;

      if (error) throw error;

      // Query polling_units table - fetch ALL in batches of 1000 to bypass API limit
      const PAGE_SIZE = 1000;
      let pollingUnits: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("polling_units")
          .select("*")
          .order("lga_name", { ascending: true })
          .order("ward_name", { ascending: true })
          .order("name", { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (targetLga) {
          query = query.eq("lga_name", targetLga);
        }
        if (targetWard) {
          query = query.eq("ward_name", targetWard);
        }

        const { data, error: puError } = await query;
        if (puError) throw puError;

        pollingUnits = pollingUnits.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        page++;
      }

      // Fetch polling unit agents
      const { data: agentsData, error: agentsError } = await db
        .from("polling_unit_agents")
        .select("polling_unit_id, user_id, agent_name, phone");

      if (agentsError) {
        console.error("Error fetching polling unit agents:", agentsError);
      }

      // Create a map of polling unit agents by polling_unit_id
      const agentsMap = new Map();
      (agentsData || []).forEach(agent => {
        if (agent.polling_unit_id) {
          agentsMap.set(agent.polling_unit_id, {
            name: agent.agent_name || 'Unknown',
            phone: agent.phone || ''
          });
        }
      });

      // Fetch actual member counts from the members table grouped by lga/ward/polling_unit
      let memberCountsQuery = supabase
        .from("members")
        .select("lga, ward, polling_unit");

      if (targetLga) {
        memberCountsQuery = memberCountsQuery.eq("lga", targetLga);
      }
      if (targetWard) {
        memberCountsQuery = memberCountsQuery.eq("ward", targetWard);
      }

      const { data: allMembers, error: membersError } = await memberCountsQuery;
      if (membersError) console.error("Error fetching member counts:", membersError);

      // Build a member count map: key -> count
      const memberCountMap = new Map<string, number>();
      (allMembers || []).forEach(m => {
        if (m.lga && m.polling_unit) {
          const key = `${m.lga}-${m.ward || ''}-${m.polling_unit}`.toLowerCase();
          memberCountMap.set(key, (memberCountMap.get(key) || 0) + 1);
        }
      });

      // Real registered-voter counts from the INEC voter registry
      const voterCountMap = await fetchRegisteredVoterCounts(targetWard);

      // Create a map of existing cells for O(1) lookup
      const dbCellMap = new Map();
      dbCells?.forEach(cell => {
        // Create a composite key: "LGA-WARD-NAME" (normalized)
        const key = `${cell.lga}-${cell.ward}-${cell.polling_unit_name}`.toLowerCase();
        dbCellMap.set(key, cell);
      });

      // Map polling units to the Cell format, merging with DB cells where they exist
      const mergedCells = (pollingUnits || []).map(pollingUnit => {
        const key = `${pollingUnit.lga_name}-${pollingUnit.ward_name}-${pollingUnit.name}`.toLowerCase();
        const existingCell = dbCellMap.get(key);
        const appMembersCount = memberCountMap.get(key) || 0;
        const agent = agentsMap.get(pollingUnit.id);

        // Real registered voters from the INEC voter registry (when available)
        const realCount = voterCountMap.get(
          puMatchKey(pollingUnit.ward_name, pollingUnit.code) || ""
        );

        if (existingCell) {
          // Return the DB version with full data + actual member count + agent info
          return {
            ...existingCell,
            pu_code: pollingUnit.code,
            registered_voters: realCount ?? existingCell.registered_voters ?? 0,
            app_members_count: appMembersCount,
            polling_unit_agent_name: agent?.name || null,
            polling_unit_agent_phone: agent?.phone || null
          };
        }

        // Return a "virtual" cell from polling unit data
        const uniqueId = `virtual-${pollingUnit.id}`;

        return {
          id: uniqueId,
          polling_unit_name: pollingUnit.name,
          ward: pollingUnit.ward_name,
          lga: pollingUnit.lga_name,
          pu_code: pollingUnit.code,
          status: "forming" as CellStatus, // Default status
          target_voters: pollingUnit.target_voters || 50, // Use target from DB or default
          registered_voters: realCount ?? pollingUnit.registered_voters ?? 0,
          reliable_voters: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          members: [],
          canvasser: null,
          app_members_count: appMembersCount,
          polling_unit_agent_name: agent?.name || null,
          polling_unit_agent_phone: agent?.phone || null
        };
      });

      // Save to local cache
      if (mergedCells && mergedCells.length > 0) {
        await localRepository.savePollingUnitCells(mergedCells);
      }

      // If we have status filter, filter AFTER merging
      if (filters?.status) {
        return mergedCells.filter(cell => cell.status === filters.status);
      }

      return mergedCells as (PollingUnitCell & {
        members: { count: number }[];
        canvasser: { id: string; full_name: string; phone: string; membership_id: string } | null;
        app_members_count: number;
        polling_unit_agent_name: string | null;
        polling_unit_agent_phone: string | null;
      })[];
    },
  });
};

export const usePollingUnitCell = (id: string) => {
  return useQuery({
    queryKey: ["polling-unit-cells", id],
    queryFn: async () => {
      // 1. Check local cache
      const cached = await localRepository.getPollingUnitCells();
      const cell = cached.find((c: any) => c.id === id);
      if (cell) {
        console.log(`📦 Loaded polling unit cell detail for ${id} from IndexedDB.`);
        return cell;
      }

      // 2. Fallback to Supabase
      const { data, error } = await db
        .from("polling_unit_cells")
        .select(`
          *,
          members:cell_members(*),
          canvasser:members(id, full_name, phone, membership_id, political_position)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as PollingUnitCell & {
        members: CellMember[];
        canvasser: {
          id: string;
          full_name: string;
          phone: string;
          membership_id: string;
          political_position: string;
        } | null;
      } | null;
    },
    enabled: !!id,
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
        updated_at: new Date().toISOString()
      };

      // 1. Optimistic write to IndexedDB
      const cached = await localRepository.getPollingUnitCells();
      cached.unshift(newCell);
      await localRepository.savePollingUnitCells(cached);

      // 2. Queue mutation
      await localRepository.enqueueAction("polling_unit_cells", "INSERT", id, newCell);

      // 3. Trigger sync
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
      // 1. Optimistic write to IndexedDB
      const cached = await localRepository.getPollingUnitCells();
      const updated = cached.map((c: any) => {
        if (c.id === id) {
          return { ...c, ...updates, updated_at: new Date().toISOString() };
        }
        return c;
      });
      await localRepository.savePollingUnitCells(updated);

      // 2. Queue mutation
      await localRepository.enqueueAction("polling_unit_cells", "UPDATE", id, updates);

      // 3. Trigger sync
      syncManager.sync();

      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polling-unit-cells"] });
      toast.success("Cell updated successfully!");
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
        updated_at: new Date().toISOString()
      };

      // 1. Optimistic write to IndexedDB
      const cached = await localRepository.getPollingUnitCells();
      const updated = cached.map((c: any) => {
        if (c.id === cellId) {
          return { ...c, ...updates };
        }
        return c;
      });
      await localRepository.savePollingUnitCells(updated);

      // 2. Queue mutation
      await localRepository.enqueueAction("polling_unit_cells", "UPDATE", cellId, updates);

      // 3. Trigger sync
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

// Cell Members
export const useCellMembers = (cellId?: string) => {
  return useQuery({
    queryKey: ["cell-members", cellId],
    queryFn: async () => {
      let query = db
        .from("cell_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (cellId) {
        query = query.eq("cell_id", cellId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !cellId || !!cellId,
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

// Stats
export const usePollingUnitStats = (filters?: {
  lga?: string;
  ward?: string;
}) => {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["polling-unit-stats", filters, profile?.id],
    staleTime: 1000 * 60 * 5, // 5 mins cache
    gcTime: 1000 * 60 * 30,
    enabled: !!profile,
    queryFn: async () => {
      let targetLga = filters?.lga;
      let targetWard = filters?.ward;

      if (profile) {
        if (profile.role === "councillor") {
          targetLga = profile.lga || undefined;
          targetWard = profile.ward || undefined;
        } else if (profile.role === "lga_chairman" || profile.role === "house_assembly_member") {
          targetLga = profile.lga || undefined;
        }
      }

      let cellsQuery = db
        .from("polling_unit_cells")
        .select("status, target_voters, registered_voters, reliable_voters, lga, ward, polling_unit_name");

      if (targetLga) {
        cellsQuery = cellsQuery.eq("lga", targetLga);
      }
      if (targetWard) {
        cellsQuery = cellsQuery.eq("ward", targetWard);
      }

      const { data: dbCells, error } = await cellsQuery;

      if (error) throw error;

      // Query polling_units table - fetch ALL in batches of 1000
      const PAGE_SIZE = 1000;
      let pollingUnits: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("polling_units")
          .select("lga_name, ward_name, name, code, target_voters, registered_voters")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (targetLga) {
          query = query.eq("lga_name", targetLga);
        }
        if (targetWard) {
          query = query.eq("ward_name", targetWard);
        }

        const { data, error: puError } = await query;
        if (puError) throw puError;

        pollingUnits = pollingUnits.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        page++;
      }

      // Fetch all members to count per polling unit
      let memberCountsQuery = supabase
        .from("members")
        .select("lga, ward, polling_unit");

      if (targetLga) {
        memberCountsQuery = memberCountsQuery.eq("lga", targetLga);
      }
      if (targetWard) {
        memberCountsQuery = memberCountsQuery.eq("ward", targetWard);
      }

      const { data: allMembers, error: membersError } = await memberCountsQuery;

      if (membersError) console.error("Error fetching members for stats:", membersError);

      // Build member count map by polling unit key
      const memberCountMap = new Map<string, number>();
      let totalAppMembers = 0;
      (allMembers || []).forEach(m => {
        if (m.lga && m.polling_unit) {
          totalAppMembers++;
          const key = `${m.lga}-${m.ward || ''}-${m.polling_unit}`.toLowerCase();
          memberCountMap.set(key, (memberCountMap.get(key) || 0) + 1);
        }
      });

      // Real registered-voter counts from the INEC voter registry
      const voterCountMap = await fetchRegisteredVoterCounts(targetWard);

      // Create Map of DB cells for quick lookup
      const dbCellMap = new Map();
      dbCells?.forEach(cell => {
        const key = `${cell.lga}-${cell.ward}-${cell.polling_unit_name}`.toLowerCase();
        dbCellMap.set(key, cell);
      });

      // Initialize stats
      let totalCells = 0;
      let totalTarget = 0;
      let totalRegistered = 0;
      let totalReliable = 0;
      let meetingTarget = 0;

      // Initialize status counts with all possible statuses
      const byStatus: Record<string, number> = {
        forming: 0,
        active: 0,
        mobilizing: 0,
        ready: 0,
        complete: 0
      };

      // Loop through polling units (already filtered by RLS)
      (pollingUnits || []).forEach(pollingUnit => {
        totalCells++;
        const key = `${pollingUnit.lga_name}-${pollingUnit.ward_name}-${pollingUnit.name}`.toLowerCase();
        const dbCell = dbCellMap.get(key);
        const puMembers = memberCountMap.get(key) || 0;
        const target = dbCell?.target_voters || pollingUnit.target_voters || 50;
        const realCount = voterCountMap.get(
          puMatchKey(pollingUnit.ward_name, pollingUnit.code) || ""
        );

        if (dbCell) {
          const registered = realCount ?? dbCell.registered_voters ?? 0;
          const reliable = dbCell.reliable_voters || 0;
          const status = (dbCell.status as string) || 'forming';

          totalTarget += target;
          totalRegistered += registered;
          totalReliable += reliable;

          if (byStatus[status] !== undefined) {
            byStatus[status]++;
          } else {
            byStatus['forming']++;
          }
        } else {
          totalTarget += target;
          totalRegistered += realCount ?? pollingUnit.registered_voters ?? 0;
          byStatus['forming']++;
        }

        // Count PUs where app members meet the target
        if (puMembers >= target) meetingTarget++;
      });

      return {
        totalCells,
        byStatus,
        totalTarget,
        totalRegistered,
        totalReliable,
        totalAppMembers,
        meetingTarget
      };
    },
  });
};

// Age groups for voter analysis
export const AGE_GROUPS = [
  { value: "18-25", label: "18-25 (Youth)" },
  { value: "26-35", label: "26-35 (Young Adults)" },
  { value: "36-45", label: "36-45 (Adults)" },
  { value: "46-55", label: "46-55 (Mature)" },
  { value: "56-65", label: "56-65 (Seniors)" },
  { value: "65+", label: "65+ (Elderly)" },
];

export const COMMITMENT_LEVELS = [
  { value: "interested", label: "Interested", color: "bg-gray-500" },
  { value: "supportive", label: "Supportive", color: "bg-blue-500" },
  { value: "committed", label: "Committed", color: "bg-orange-500" },
  { value: "champion", label: "Champion", color: "bg-green-500" },
];
