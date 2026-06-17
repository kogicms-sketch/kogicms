import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
// Results live in the Lovable Cloud backend (not the legacy campaign backend).
import { supabase as cloud } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PARTY_LIST } from "@/config/parties";
import type { RaceType } from "@/config/races";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = cloud as any;

export interface ElectionResult {
  id: string;
  race_type: RaceType;
  lga: string;
  ward: string | null;
  polling_unit_code: string | null;
  polling_unit_name: string;
  votes: Record<string, number>;
  registered_voters: number;
  accredited_voters: number;
  invalid_votes: number;
  result_sheet_url: string | null;
  agent_user_id: string | null;
  agent_name: string | null;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_note: string | null;
  created_at: string;
  updated_at: string;
}

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface ResultFilters {
  raceType?: RaceType;
  lgaList?: string[]; // restrict to these LGAs (jurisdiction scope)
  pollingUnitName?: string; // a single PU (agent view)
  agentUserId?: string;
}

// Live-updating results query, filtered client-side by jurisdiction.
export const useElectionResults = (filters?: ResultFilters) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = cloud
      .channel("election-results-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "election_results" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["election-results"] });
        },
      )
      .subscribe();

    return () => {
      cloud.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["election-results", filters?.raceType ?? "all"],
    staleTime: 0,
    queryFn: async () => {
      let query = db
        .from("election_results")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.raceType) query = query.eq("race_type", filters.raceType);
      if (filters?.agentUserId) query = query.eq("agent_user_id", filters.agentUserId);

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data || []) as ElectionResult[];

      // Client-side jurisdiction filtering
      if (filters?.lgaList && filters.lgaList.length && !filters.lgaList.includes("ALL")) {
        const set = new Set(filters.lgaList.map((l) => l.toLowerCase()));
        rows = rows.filter((r) => set.has((r.lga || "").toLowerCase()));
      }
      if (filters?.pollingUnitName) {
        rows = rows.filter(
          (r) =>
            (r.polling_unit_name || "").toLowerCase() ===
            filters.pollingUnitName!.toLowerCase(),
        );
      }

      return rows;
    },
  });
};

export interface SubmitResultInput {
  race_type: RaceType;
  lga: string;
  ward?: string | null;
  polling_unit_code?: string | null;
  polling_unit_name: string;
  votes: Record<string, number>;
  registered_voters: number;
  accredited_voters: number;
  invalid_votes?: number;
  agent_user_id?: string | null;
  agent_name?: string | null;
  photoFile?: File | null;
}

// Shared validation mirroring the server-side trigger so users get
// immediate, clear feedback before the request is sent.
export interface ResultFigures {
  votes: Record<string, number>;
  registered_voters: number;
  accredited_voters: number;
  invalid_votes?: number;
}

export const validateResultFigures = (input: ResultFigures): string | null => {
  const { registered_voters, accredited_voters, votes, invalid_votes } = input;

  if (registered_voters < 0) return "Registered voters cannot be negative.";
  if (accredited_voters < 0) return "Accredited voters cannot be negative.";
  if ((invalid_votes ?? 0) < 0) return "Invalid/spoilt votes cannot be negative.";

  let partyTotal = 0;
  for (const [party, raw] of Object.entries(votes || {})) {
    const v = Number(raw) || 0;
    if (v < 0) return `Votes for ${party} cannot be negative.`;
    partyTotal += v;
  }

  const total = partyTotal + (invalid_votes ?? 0);

  if (registered_voters > 0 && accredited_voters > registered_voters) {
    return `Accredited voters (${accredited_voters}) cannot exceed registered voters (${registered_voters}).`;
  }

  if (accredited_voters > 0 && total > accredited_voters) {
    return `Total votes cast including invalid (${total}) cannot exceed accredited voters (${accredited_voters}).`;
  }

  return null;
};

export const useSubmitResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitResultInput) => {
      const validationError = validateResultFigures(input);
      if (validationError) throw new Error(validationError);

      let result_sheet_url: string | null = null;


      if (input.photoFile) {
        const ext = input.photoFile.name.split(".").pop() || "jpg";
        const path = `${input.race_type}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const { error: upErr } = await cloud.storage
          .from("result-sheets")
          .upload(path, input.photoFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = cloud.storage.from("result-sheets").getPublicUrl(path);
        result_sheet_url = pub.publicUrl;
      }

      const payload = {
        race_type: input.race_type,
        lga: input.lga,
        ward: input.ward ?? null,
        polling_unit_code: input.polling_unit_code ?? null,
        polling_unit_name: input.polling_unit_name,
        votes: input.votes,
        registered_voters: input.registered_voters,
        accredited_voters: input.accredited_voters,
        invalid_votes: input.invalid_votes ?? 0,
        result_sheet_url,
        agent_user_id: input.agent_user_id ?? null,
        agent_name: input.agent_name ?? null,
        status: "pending",
      };

      const { data, error } = await db
        .from("election_results")
        .upsert(payload, { onConflict: "polling_unit_name,lga,race_type" })
        .select()
        .single();

      if (error) throw error;
      return data as ElectionResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election-results"] });
      toast.success("Result submitted to the Situation Room!");
    },
    onError: (error: any) => {
      console.error("Error submitting result:", error);
      toast.error(error?.message || "Failed to submit result");
    },
  });
};

// ---------- Verification (super admin) ----------

export interface VerifyResultInput {
  id: string;
  status: VerificationStatus;
  verified_by?: string | null;
  note?: string | null;
}

// Approve or reject a submitted result sheet.
export const useVerifyResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: VerifyResultInput) => {
      const { data, error } = await db
        .from("election_results")
        .update({
          status: input.status,
          verified_by: input.verified_by ?? null,
          verified_at: new Date().toISOString(),
          verification_note: input.note ?? null,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data as ElectionResult;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["election-results"] });
      toast.success(
        vars.status === "approved"
          ? "Result approved"
          : vars.status === "rejected"
          ? "Result rejected"
          : "Result updated",
      );
    },
    onError: (error: any) => {
      console.error("Error verifying result:", error);
      toast.error(error?.message || "Failed to update result");
    },
  });
};

export interface CorrectResultInput {
  id: string;
  votes: Record<string, number>;
  registered_voters: number;
  accredited_voters: number;
  invalid_votes?: number;
  verified_by?: string | null;
  note?: string | null;
}

// Correct the figures on a submitted result, marking it approved.
export const useCorrectResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CorrectResultInput) => {
      const validationError = validateResultFigures(input);
      if (validationError) throw new Error(validationError);

      const { data, error } = await db
        .from("election_results")
        .update({
          votes: input.votes,
          registered_voters: input.registered_voters,
          accredited_voters: input.accredited_voters,
          invalid_votes: input.invalid_votes ?? 0,
          status: "approved",
          verified_by: input.verified_by ?? null,
          verified_at: new Date().toISOString(),
          verification_note: input.note ?? null,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data as ElectionResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election-results"] });
      toast.success("Result corrected and approved");
    },
    onError: (error: any) => {
      console.error("Error correcting result:", error);
      toast.error(error?.message || "Failed to correct result");
    },
  });
};

// ---------- Aggregation helpers ----------

export interface PartyTally {
  code: string;
  name: string;
  votes: number;
  pct: number;
}

export const tallyVotes = (results: ElectionResult[]): PartyTally[] => {
  const totals: Record<string, number> = {};
  results.forEach((r) => {
    Object.entries(r.votes || {}).forEach(([party, v]) => {
      totals[party] = (totals[party] || 0) + (Number(v) || 0);
    });
  });

  const grand = Object.values(totals).reduce((s, v) => s + v, 0);

  // Build from known party registry first, then any extras present in data.
  const known = PARTY_LIST.filter((p) => p.id !== "neutral").map((p) => p.shortName);
  const codes = Array.from(new Set([...known, ...Object.keys(totals)]));

  return codes
    .map((code) => {
      const party = PARTY_LIST.find((p) => p.shortName === code);
      const votes = totals[code] || 0;
      return {
        code,
        name: party?.fullName || code,
        votes,
        pct: grand > 0 ? (votes / grand) * 100 : 0,
      };
    })
    .filter((t) => t.votes > 0 || known.includes(t.code))
    .sort((a, b) => b.votes - a.votes);
};

export interface ResultsSummary {
  totalVotes: number;
  totalAccredited: number;
  totalInvalidVotes: number;
  reportedUnits: number;
  leader: PartyTally | null;
  tallies: PartyTally[];
}

export const summarize = (results: ElectionResult[]): ResultsSummary => {
  const tallies = tallyVotes(results);
  const totalVotes = tallies.reduce((s, t) => s + t.votes, 0);
  const totalAccredited = results.reduce((s, r) => s + (r.accredited_voters || 0), 0);
  const totalInvalidVotes = results.reduce((s, r) => s + (r.invalid_votes || 0), 0);
  return {
    totalVotes,
    totalAccredited,
    totalInvalidVotes,
    reportedUnits: results.length,
    leader: tallies.length ? tallies[0] : null,
    tallies,
  };
};

export interface LgaBreakdownRow {
  lga: string;
  reportedUnits: number;
  totalVotes: number;
  leader: string;
  tallies: Record<string, number>;
}

export const breakdownByLga = (results: ElectionResult[]): LgaBreakdownRow[] => {
  const map = new Map<string, ElectionResult[]>();
  results.forEach((r) => {
    const key = r.lga || "Unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  });

  return Array.from(map.entries())
    .map(([lga, rows]) => {
      const t = tallyVotes(rows);
      const tallies: Record<string, number> = {};
      t.forEach((x) => (tallies[x.code] = x.votes));
      return {
        lga,
        reportedUnits: rows.length,
        totalVotes: t.reduce((s, x) => s + x.votes, 0),
        leader: t.length ? t[0].code : "—",
        tallies,
      };
    })
    .sort((a, b) => b.totalVotes - a.totalVotes);
};
