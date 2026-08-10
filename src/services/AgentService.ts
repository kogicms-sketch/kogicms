"use client";
import { supabase } from "@/integrations/supabase/loose-client";
import { localRepository } from "@/services/LocalRepository";
import { toast } from "sonner";

export type AgentDesignation = "lead_agent" | "assistant_agent_1" | "assistant_agent_2" | "unassigned";

export interface StarredAgentMember {
  id: string;
  membership_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  lga: string;
  ward: string;
  polling_unit: string;
  polling_unit_id?: string | null;
  bank_name: string | null;
  account_number: string | null;
  agent_designation: AgentDesignation;
  is_starred: boolean;
  voters_card_id?: string | null;
  created_at?: string;
}

const STORAGE_KEY_PREFIX = "pu_starred_agents_v1_";

// Helper to get local storage starred state
export const getLocalStarredAgents = (): Record<string, { is_starred: boolean; designation: AgentDesignation }> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("pu_starred_agents_store");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

export const setLocalStarredAgent = (memberId: string, isStarred: boolean, designation: AgentDesignation = "lead_agent") => {
  if (typeof window === "undefined") return;
  try {
    const store = getLocalStarredAgents();
    if (isStarred) {
      store[memberId] = { is_starred: true, designation };
    } else {
      delete store[memberId];
    }
    localStorage.setItem("pu_starred_agents_store", JSON.stringify(store));
  } catch (e) {
    console.error("Error writing starred agent to localStorage:", e);
  }
};

/**
 * Toggle or set agent designation for a member
 */
export const toggleStarMemberAgent = async (
  memberId: string,
  designation: AgentDesignation = "lead_agent",
  isStarred: boolean = true
): Promise<boolean> => {
  try {
    // 1. Update localStorage instantly
    setLocalStarredAgent(memberId, isStarred, designation);

    // 2. Prepare payload for DB
    const roleValue = isStarred ? "polling_unit_agent" : "member";
    
    // Attempt update to Supabase members table
    const { error } = await supabase
      .from("members")
      .update({
        role: roleValue,
        social_media_handle: isStarred ? `DESIGNATION:${designation}` : null,
      })
      .eq("id", memberId);

    if (error) {
      console.warn("Non-blocking DB update warning for agent star:", error.message);
    }

    toast.success(
      isStarred
        ? `⭐ Tagged as ${designation === "lead_agent" ? "Lead Agent" : designation === "assistant_agent_1" ? "Assistant Agent 1" : "Assistant Agent 2"}`
        : "Agent tag removed"
    );

    return true;
  } catch (err: any) {
    console.error("Error toggling member agent star:", err);
    toast.error("Failed to update agent tag");
    return false;
  }
};

/**
 * Fetch all starred/designated Polling Unit Agents for a given LGA and/or Ward
 */
export const fetchStarredAgentsPaymentRoster = async (
  lga?: string | null,
  ward?: string | null
): Promise<StarredAgentMember[]> => {
  try {
    const localStore = getLocalStarredAgents();

    // Query members table
    let query = supabase.from("members").select("*");

    if (lga) query = query.eq("lga", lga);
    if (ward) query = query.eq("ward", ward);

    const { data: dbMembers, error } = await query;

    if (error) {
      console.error("Error fetching members for agent roster:", error);
    }

    const membersList = dbMembers || [];
    const roster: StarredAgentMember[] = [];

    for (const m of membersList) {
      const localRecord = localStore[m.id];
      const isDbAgent = m.role === "polling_unit_agent" || (m.social_media_handle && m.social_media_handle.startsWith("DESIGNATION:"));
      
      let designation: AgentDesignation = "lead_agent";
      if (localRecord?.designation) {
        designation = localRecord.designation;
      } else if (m.social_media_handle && m.social_media_handle.startsWith("DESIGNATION:")) {
        designation = m.social_media_handle.replace("DESIGNATION:", "") as AgentDesignation;
      }

      const isStarred = localRecord?.is_starred || isDbAgent || false;

      if (isStarred) {
        roster.push({
          id: m.id,
          membership_id: m.membership_id || `DR-AGT-${m.id.slice(0, 6)}`,
          full_name: m.full_name,
          phone: m.phone || null,
          email: m.email || null,
          lga: m.lga || lga || "Katsina",
          ward: m.ward || ward || "Central Ward",
          polling_unit: m.polling_unit || "Unassigned PU",
          polling_unit_id: m.polling_unit_id || null,
          bank_name: m.bank_name || null,
          account_number: m.account_number || null,
          agent_designation: designation,
          is_starred: true,
          voters_card_id: m.voters_card_id || null,
          created_at: m.created_at,
        });
      }
    }

    return roster;
  } catch (err) {
    console.error("Exception fetching starred agents payment roster:", err);
    return [];
  }
};
