import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase as cloud } from "@/integrations/supabase/client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

export type IncidentStatus = "pending" | "resolved" | "critical";
export type IncidentType =
  | "violence"
  | "ballot_snatching"
  | "late_materials"
  | "bvas_malfunction"
  | "intimidation"
  | "underage_voting"
  | "multiple_voting"
  | "other";

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  violence: "Violence / Thuggery",
  ballot_snatching: "Ballot Snatching",
  late_materials: "Late Arrival of Materials",
  bvas_malfunction: "BVAS / Card Reader Malfunction",
  intimidation: "Voter Intimidation",
  underage_voting: "Underage Voting",
  multiple_voting: "Multiple Voting",
  other: "Other",
};

export const INCIDENT_STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "#d97706", bg: "#fef3c7" },
  critical: { label: "Critical", color: "#dc2626", bg: "#fee2e2" },
  resolved: { label: "Resolved", color: "#16a34a", bg: "#dcfce7" },
};

export interface ElectionIncident {
  id: string;
  race_type: string | null;
  incident_type: IncidentType;
  polling_unit: string | null;
  lga: string | null;
  ward: string | null;
  incident_time: string | null;
  status: IncidentStatus;
  description: string | null;
  photo_url: string | null;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitIncidentInput {
  race_type?: string | null;
  incident_type: IncidentType;
  polling_unit?: string;
  lga?: string;
  ward?: string;
  incident_time?: string;
  status: IncidentStatus;
  description?: string;
  photoFile?: File | null;
  reported_by?: string | null;
}

// Live-updating incidents
export const useIncidents = (lga?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = cloud
      .channel("election-incidents-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "election_incidents" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["election-incidents"] });
        },
      )
      .subscribe();

    return () => {
      cloud.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["election-incidents", lga ?? "all"],
    staleTime: 0,
    queryFn: async () => {
      let query = db
        .from("election_incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (lga && lga !== "ALL") query = query.eq("lga", lga);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ElectionIncident[];
    },
  });
};

// Submit a new incident
export const useSubmitIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitIncidentInput) => {
      let photo_url: string | null = null;

      if (input.photoFile) {
        const ext = input.photoFile.name.split(".").pop() || "jpg";
        const path = `incidents/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const { error: upErr } = await cloud.storage
          .from("incident-photos")
          .upload(path, input.photoFile, { upsert: false });
        if (!upErr) {
          const { data: pub } = cloud.storage
            .from("incident-photos")
            .getPublicUrl(path);
          photo_url = pub.publicUrl;
        }
      }

      const payload = {
        race_type: input.race_type ?? null,
        incident_type: input.incident_type,
        polling_unit: input.polling_unit ?? null,
        lga: input.lga ?? null,
        ward: input.ward ?? null,
        incident_time: input.incident_time
          ? new Date(input.incident_time).toISOString()
          : null,
        status: input.status,
        description: input.description ?? null,
        photo_url,
        reported_by: input.reported_by ?? null,
      };

      const { data, error } = await db
        .from("election_incidents")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as ElectionIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election-incidents"] });
      toast.success("Incident reported successfully!");
    },
    onError: (error: any) => {
      console.error("Error reporting incident:", error);
      toast.error(error?.message || "Failed to report incident");
    },
  });
};

// Update incident status
export const useUpdateIncidentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: IncidentStatus;
    }) => {
      const { data, error } = await db
        .from("election_incidents")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ElectionIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election-incidents"] });
      toast.success("Incident status updated");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update incident");
    },
  });
};
