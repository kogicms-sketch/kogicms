import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Tables, TablesInsert } from "@/integrations/supabase/loose-types";
import { toast } from "sonner";

export type PoliticalExco = Tables<"political_excos">;
export type PoliticalExcoInsert = TablesInsert<"political_excos">;

export type ExcoHierarchy = {
  level: string;
  position: string;
  name: string;
  phone?: string;
  email?: string;
  children?: ExcoHierarchy[];
};

export const usePoliticalExcos = (filters?: {
  level?: string;
  lga?: string;
  ward?: string;
  state?: string;
}) => {
  return useQuery({
    queryKey: ["political-excos", filters],
    queryFn: async () => {
      let query = supabase
        .from("political_excos")
        .select(`
          *,
          member:members(id, full_name, phone, membership_id)
        `)
        .eq("is_active", true);

      if (filters?.level) {
        query = query.eq("level", filters.level);
      }
      if (filters?.lga) {
        query = query.eq("lga", filters.lga);
      }
      if (filters?.ward) {
        query = query.eq("ward", filters.ward);
      }
      if (filters?.state) {
        query = query.eq("state", filters.state);
      }

      const { data, error } = await query.order("level", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

export const useExcoHierarchy = (state: string = "Katsina") => {
  return useQuery({
    queryKey: ["exco-hierarchy", state],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("political_excos")
        .select("*")
        .eq("state", state)
        .eq("is_active", true)
        .order("level", { ascending: true });

      if (error) throw error;

      // Build hierarchy tree
      const buildHierarchy = (excos: PoliticalExco[]): ExcoHierarchy[] => {
        const map = new Map<string, ExcoHierarchy>();
        const roots: ExcoHierarchy[] = [];

        // First pass: create nodes
        excos.forEach(exco => {
          map.set(exco.id, {
            level: exco.level,
            position: exco.position,
            name: exco.name,
            phone: exco.phone || undefined,
            email: exco.email || undefined,
            children: [],
          });
        });

        // Second pass: build tree
        excos.forEach(exco => {
          const node = map.get(exco.id);
          if (exco.parent_exco_id && map.has(exco.parent_exco_id)) {
            const parent = map.get(exco.parent_exco_id);
            if (parent && parent.children) {
              parent.children.push(node!);
            }
          } else {
            roots.push(node!);
          }
        });

        return roots;
      };

      return buildHierarchy(data || []);
    },
  });
};

export const useCreatePoliticalExco = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exco: PoliticalExcoInsert) => {
      const { data, error } = await supabase
        .from("political_excos")
        .insert(exco)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["political-excos"] });
      queryClient.invalidateQueries({ queryKey: ["exco-hierarchy"] });
      toast.success("Exco added successfully!");
    },
    onError: (error) => {
      console.error("Error creating exco:", error);
      toast.error("Failed to add exco");
    },
  });
};

export const useRemovePoliticalExco = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("political_excos")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["political-excos"] });
      queryClient.invalidateQueries({ queryKey: ["exco-hierarchy"] });
      toast.success("Exco removed successfully");
    },
    onError: (error) => {
      console.error("Error removing exco:", error);
      toast.error("Failed to remove exco");
    },
  });
};

// Predefined positions for Nigerian political structure
export const EXCO_POSITIONS = {
  state: [
    { value: "state_governor", label: "State Governor" },
    { value: "state_deputy_governor", label: "State Deputy Governor" },
    { value: "state_party_chairman", label: "State Party Chairman" },
    { value: "state_party_secretary", label: "State Party Secretary" },
    { value: "state_woman_leader", label: "State Woman Leader" },
    { value: "state_youth_leader", label: "State Youth Leader" },
    { value: "state_organizing_secretary", label: "State Organizing Secretary" },
  ],
  senatorial: [
    { value: "senatorial_district_leader", label: "Senatorial District Leader" },
    { value: "senatorial_woman_leader", label: "Senatorial Woman Leader" },
    { value: "senatorial_youth_leader", label: "Senatorial Youth Leader" },
  ],
  federal: [
    { value: "federal_constituency_leader", label: "Federal Constituency Leader" },
    { value: "federal_rep_candidate", label: "House of Reps Candidate" },
  ],
  lga: [
    { value: "lga_chairman", label: "LGA Chairman" },
    { value: "lga_secretary", label: "LGA Secretary" },
    { value: "lga_woman_leader", label: "LGA Woman Leader" },
    { value: "lga_youth_leader", label: "LGA Youth Leader" },
    { value: "lga_organizing_secretary", label: "LGA Organizing Secretary" },
    { value: "lga_treasurer", label: "LGA Treasurer" },
    { value: "lga_publicity_secretary", label: "LGA Publicity Secretary" },
  ],
  ward: [
    { value: "ward_chairman", label: "Ward Chairman" },
    { value: "ward_secretary", label: "Ward Secretary" },
    { value: "ward_woman_leader", label: "Ward Woman Leader" },
    { value: "ward_youth_leader", label: "Ward Youth Leader" },
    { value: "ward_organizing_secretary", label: "Ward Organizing Secretary" },
    { value: "ward_canvasser", label: "Ward Canvasser" },
  ],
  polling_unit: [
    { value: "polling_unit_agent", label: "Polling Unit Agent" },
    { value: "polling_unit_canvasser", label: "Polling Unit Canvasser" },
  ],
};

export const EXCO_LEVELS = [
  { value: "state", label: "State Level" },
  { value: "senatorial", label: "Senatorial District" },
  { value: "federal", label: "Federal Constituency" },
  { value: "lga", label: "LGA Level" },
  { value: "ward", label: "Ward Level" },
  { value: "polling_unit", label: "Polling Unit" },
];
