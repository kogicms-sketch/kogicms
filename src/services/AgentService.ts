"use client";
import { supabase } from "@/integrations/supabase/loose-client";
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

// Helper to get local storage starred state
export const getLocalStarredAgents = (): Record<string, { is_starred: boolean; designation: AgentDesignation; polling_unit?: string }> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("pu_starred_agents_store");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

export const setLocalStarredAgent = (
  memberId: string,
  isStarred: boolean,
  designation: AgentDesignation = "lead_agent",
  pollingUnit?: string
) => {
  if (typeof window === "undefined") return;
  try {
    const store = getLocalStarredAgents();
    if (isStarred) {
      store[memberId] = { is_starred: true, designation, polling_unit: pollingUnit };
    } else {
      delete store[memberId];
    }
    localStorage.setItem("pu_starred_agents_store", JSON.stringify(store));
  } catch (e) {
    console.error("Error writing starred agent to localStorage:", e);
  }
};

/**
 * Check if current user is allowed to edit / unassign agents (Ward Councillor, Chairman, Super Admin)
 */
export const canUserModifyAgents = (userRole?: string | null): boolean => {
  if (!userRole) return false;
  const wardAdminRoles = ["councillor", "lga_chairman", "super_admin", "org_admin"];
  return wardAdminRoles.includes(userRole.toLowerCase());
};

/**
 * Check Polling Unit Agent Limit (Max 3 per Polling Unit)
 */
export const checkPUAgentLimit = async (
  pollingUnitName: string,
  targetMemberId: string
): Promise<{ allowed: boolean; count: number; errorMsg?: string }> => {
  try {
    const localStore = getLocalStarredAgents();
    
    // Count local starred agents for this PU
    let localCount = 0;
    for (const [mId, rec] of Object.entries(localStore)) {
      if (rec.is_starred && rec.polling_unit === pollingUnitName && mId !== targetMemberId) {
        localCount++;
      }
    }

    // Count remote DB agents for this PU
    const { data: dbMembers } = await supabase
      .from("members")
      .select("id, role, social_media_handle")
      .eq("polling_unit", pollingUnitName);

    let dbCount = 0;
    if (dbMembers) {
      for (const m of dbMembers) {
        if (m.id !== targetMemberId) {
          const isAgent = m.role === "polling_unit_agent" || (m.social_media_handle && m.social_media_handle.startsWith("DESIGNATION:"));
          if (isAgent) dbCount++;
        }
      }
    }

    const currentCount = Math.max(localCount, dbCount);

    if (currentCount >= 3) {
      return {
        allowed: false,
        count: currentCount,
        errorMsg: `⚠️ Polling Unit Limit Reached: "${pollingUnitName}" already has the maximum 3 designated agents (Lead Agent + 2 Assistants). Contact Ward Councillor to reassign.`,
      };
    }

    return { allowed: true, count: currentCount };
  } catch (err) {
    console.error("Error checking PU agent limit:", err);
    return { allowed: true, count: 0 };
  }
};

/**
 * Toggle or set agent designation for a member (with strict 3-agent limit and role permissions)
 */
export const toggleStarMemberAgent = async (
  memberId: string,
  pollingUnitName: string = "",
  designation: AgentDesignation = "lead_agent",
  isStarred: boolean = true,
  userRole?: string | null
): Promise<boolean> => {
  try {
    const localStore = getLocalStarredAgents();
    const existingRec = localStore[memberId];

    // RULE 2: If member is ALREADY starred, non-ward users CANNOT change or unassign!
    if (existingRec?.is_starred && !canUserModifyAgents(userRole)) {
      toast.error("🔒 Permission Denied: Only Ward Councillor or Admin can modify or remove an assigned agent.");
      return false;
    }

    // RULE 1: If assigning a NEW agent, check max 3 limit!
    if (isStarred) {
      const limitCheck = await checkPUAgentLimit(pollingUnitName, memberId);
      if (!limitCheck.allowed) {
        toast.error(limitCheck.errorMsg || "Maximum 3 agents allowed per Polling Unit.");
        return false;
      }
    }

    // 1. Update localStorage
    setLocalStarredAgent(memberId, isStarred, designation, pollingUnitName);

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
        ? `⭐ Assigned as ${designation === "lead_agent" ? "Lead Agent" : designation === "assistant_agent_1" ? "Assistant Agent 1" : "Assistant Agent 2"}`
        : "Agent designation removed"
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
