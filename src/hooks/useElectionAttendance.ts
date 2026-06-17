import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const CURRENT_YEAR = new Date().getFullYear();

function generateLoyaltyCardNumber(): string {
  const prefix = "LC";
  const year = CURRENT_YEAR.toString().slice(-2);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 8);
  return `${prefix}${year}-${rand}`;
}

export interface MemberAttendanceRow {
  // From members table
  id: string;
  full_name: string;
  membership_id: string | null;
  phone: string | null;
  lga: string | null;
  ward: string | null;
  polling_unit: string | null;
  gender: string | null;
  loyalty_tier: string | null;
  loyalty_card_number: string | null;
  loyalty_enrolled_at: string | null;
  // From election_day_attendance (joined)
  attendance_id: string | null;
  arrived: boolean;
  arrived_at: string | null;
  voted_our_party: boolean;
  voted_at: string | null;
  loyalty_enrolled: boolean;
  enrolled_at: string | null;
}

export interface AttendanceFilters {
  lga?: string;
  ward?: string;
  pollingUnit?: string;
  search?: string;
}

// Fetch members with their attendance records joined
export const useElectionAttendance = (filters?: AttendanceFilters) => {
  return useQuery({
    queryKey: ["election-attendance", filters],
    queryFn: async () => {
      let query = db
        .from("members")
        .select(
          `id, full_name, membership_id, phone, lga, ward, polling_unit, gender,
           loyalty_tier, loyalty_card_number, loyalty_enrolled_at,
           election_day_attendance (
             id, arrived, arrived_at, voted_our_party, voted_at,
             loyalty_enrolled, enrolled_at
           )`
        )
        .order("full_name", { ascending: true })
        .limit(200);

      if (filters?.lga) query = query.eq("lga", filters.lga);
      if (filters?.ward) query = query.eq("ward", filters.ward);
      if (filters?.pollingUnit)
        query = query.eq("polling_unit", filters.pollingUnit);
      if (filters?.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,membership_id.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as any[]).map((m): MemberAttendanceRow => {
        const att = Array.isArray(m.election_day_attendance)
          ? m.election_day_attendance[0]
          : m.election_day_attendance;
        return {
          id: m.id,
          full_name: m.full_name,
          membership_id: m.membership_id,
          phone: m.phone,
          lga: m.lga,
          ward: m.ward,
          polling_unit: m.polling_unit,
          gender: m.gender,
          loyalty_tier: m.loyalty_tier,
          loyalty_card_number: m.loyalty_card_number,
          loyalty_enrolled_at: m.loyalty_enrolled_at,
          attendance_id: att?.id ?? null,
          arrived: att?.arrived ?? false,
          arrived_at: att?.arrived_at ?? null,
          voted_our_party: att?.voted_our_party ?? false,
          voted_at: att?.voted_at ?? null,
          loyalty_enrolled: att?.loyalty_enrolled ?? false,
          enrolled_at: att?.enrolled_at ?? null,
        };
      });
    },
  });
};

// Toggle arrived status — creates or updates the attendance record
export const useToggleArrived = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      arrived,
      lga,
      ward,
      pollingUnit,
      recordedBy,
    }: {
      memberId: string;
      arrived: boolean;
      lga?: string;
      ward?: string;
      pollingUnit?: string;
      recordedBy?: string | null;
    }) => {
      const { data: existing } = await db
        .from("election_day_attendance")
        .select("id, voted_our_party")
        .eq("member_id", memberId)
        .maybeSingle();

      const now = new Date().toISOString();

      if (existing) {
        const { error } = await db
          .from("election_day_attendance")
          .update({
            arrived,
            arrived_at: arrived ? now : null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("election_day_attendance").insert({
          member_id: memberId,
          arrived,
          arrived_at: arrived ? now : null,
          lga: lga ?? null,
          ward: ward ?? null,
          polling_unit: pollingUnit ?? null,
          recorded_by: recordedBy ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election-attendance"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update"),
  });
};

// Toggle voted — also triggers auto-enrollment when both arrived + voted are true
export const useToggleVoted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      voted,
      memberArrived,
    }: {
      memberId: string;
      voted: boolean;
      memberArrived: boolean;
    }) => {
      const { data: existing } = await db
        .from("election_day_attendance")
        .select("id, arrived")
        .eq("member_id", memberId)
        .maybeSingle();

      const now = new Date().toISOString();
      const shouldEnroll = voted && (existing?.arrived || memberArrived);

      if (existing) {
        const { error } = await db
          .from("election_day_attendance")
          .update({
            voted_our_party: voted,
            voted_at: voted ? now : null,
            loyalty_enrolled: shouldEnroll ? true : undefined,
            enrolled_at: shouldEnroll ? now : undefined,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("election_day_attendance").insert({
          member_id: memberId,
          voted_our_party: voted,
          voted_at: voted ? now : null,
          loyalty_enrolled: shouldEnroll,
          enrolled_at: shouldEnroll ? now : null,
        });
        if (error) throw error;
      }

      // Auto-enroll loyalty on members table
      if (shouldEnroll) {
        const cardNumber = generateLoyaltyCardNumber();
        const { error: mErr } = await db
          .from("members")
          .update({
            loyalty_tier: "gold",
            loyalty_card_number: cardNumber,
            loyalty_enrolled_at: now,
          })
          .eq("id", memberId);
        if (mErr) console.error("Loyalty enrollment error:", mErr);
      }

      return { enrolled: shouldEnroll };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["election-attendance"] });
      if (data.enrolled) {
        toast.success("✅ Loyalty card automatically enrolled — Gold tier!", {
          duration: 4000,
        });
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update"),
  });
};

// Attendance summary stats
export const useAttendanceSummary = (members: any[]) => {
  const total = members.length;
  const arrived = members.filter((m) => m.arrived).length;
  const voted = members.filter((m) => m.voted_our_party).length;
  const enrolled = members.filter((m) => m.loyalty_enrolled).length;
  const arrivedPct = total > 0 ? Math.round((arrived / total) * 100) : 0;
  const votedPct = total > 0 ? Math.round((voted / total) * 100) : 0;
  return { total, arrived, voted, enrolled, arrivedPct, votedPct };
};
