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

    // 2. Prepare payload for DB update on members table
    const roleValue = isStarred ? "polling_unit_agent" : "member";
    
    const { error: memError } = await supabase
      .from("members")
      .update({
        role: roleValue,
        social_media_handle: isStarred ? `DESIGNATION:${designation}` : null,
      })
      .eq("id", memberId);

    if (memError) {
      console.warn("Non-blocking DB update warning for agent star:", memError.message);
    }

    // 3. Upsert into polling_unit_agents table so it persists globally for all users
    if (isStarred) {
      try {
        const { data: member } = await supabase.from("members").select("*").eq("id", memberId).maybeSingle();
        if (member) {
          await supabase.from("polling_unit_agents").upsert(
            {
              user_id: member.id,
              agent_name: member.full_name,
              phone: member.phone,
              email: member.email,
              polling_unit_name: pollingUnitName || member.polling_unit || "Unassigned PU",
              ward: member.ward || "Central Ward",
              lga: member.lga || "Katsina",
              is_active: true,
            },
            { onConflict: "phone" }
          );
        }
      } catch (puaErr) {
        console.warn("Could not sync to polling_unit_agents table:", puaErr);
      }
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
 * Combines both `polling_unit_agents` table and `members` table to ensure 100% visibility.
 */
export const fetchStarredAgentsPaymentRoster = async (
  lga?: string | null,
  ward?: string | null
): Promise<StarredAgentMember[]> => {
  try {
    const localStore = getLocalStarredAgents();
    const rosterMap = new Map<string, StarredAgentMember>();

    // Normalization helper for flexible Ward and LGA string matching
    const norm = (s?: string | null) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
    const matchesWard = (itemWard?: string | null, targetWard?: string | null) => {
      if (!targetWard) return true;
      const w1 = norm(itemWard);
      const w2 = norm(targetWard);
      if (!w1 || !w2) return true;
      if (w1 === w2) return true;
      const w1Norm = w1.replace(/\bi\b/g, "1").replace(/\bii\b/g, "2").replace(/\biii\b/g, "3");
      const w2Norm = w2.replace(/\bi\b/g, "1").replace(/\bii\b/g, "2").replace(/\biii\b/g, "3");
      return w1Norm === w2Norm || w1.includes(w2) || w2.includes(w1);
    };

    const matchesLga = (itemLga?: string | null, targetLga?: string | null) => {
      if (!targetLga) return true;
      const l1 = norm(itemLga);
      const l2 = norm(targetLga);
      if (!l1 || !l2) return true;
      return l1 === l2 || l1.includes(l2) || l2.includes(l1);
    };

    // 1. QUERY polling_unit_agents TABLE (Primary store for designated PU agents)
    const { data: puaData, error: puaError } = await supabase.from("polling_unit_agents").select("*");
    if (!puaError && puaData) {
      for (const pua of puaData) {
        if (matchesLga(pua.lga, lga) && matchesWard(pua.ward, ward)) {
          const phoneKey = pua.phone?.trim();
          const key = phoneKey || pua.id;
          rosterMap.set(key, {
            id: pua.id,
            membership_id: `KAT-PUA-${(pua.phone || pua.id).slice(-6)}`,
            full_name: pua.agent_name || "Designated Agent",
            phone: pua.phone || null,
            email: pua.email || null,
            lga: pua.lga || lga || "Katsina",
            ward: pua.ward || ward || "Central Ward",
            polling_unit: pua.polling_unit_name || "Unassigned Polling Unit",
            polling_unit_id: pua.polling_unit_id || null,
            bank_name: null,
            account_number: null,
            agent_designation: "lead_agent",
            is_starred: true,
            created_at: pua.created_at,
          });
        }
      }
    }

    // 2. QUERY members TABLE (To enrich with bank details and capture members starred in DB/local)
    const { data: dbMembers, error: memError } = await supabase.from("members").select("*");
    if (!memError && dbMembers) {
      for (const m of dbMembers) {
        if (!matchesLga(m.lga, lga) || !matchesWard(m.ward, ward)) continue;

        const localRecord = localStore[m.id];
        const isRoleAgent =
          m.role === "polling_unit_agent" ||
          m.role === "agent" ||
          m.role === "pu_agent" ||
          (m.social_media_handle && m.social_media_handle.startsWith("DESIGNATION:"));

        let designation: AgentDesignation = "lead_agent";
        if (localRecord?.designation) {
          designation = localRecord.designation;
        } else if (m.social_media_handle && m.social_media_handle.startsWith("DESIGNATION:")) {
          designation = m.social_media_handle.replace("DESIGNATION:", "") as AgentDesignation;
        }

        const isStarred = localRecord?.is_starred || isRoleAgent || false;
        const phoneKey = m.phone?.trim();
        const existingAgent = phoneKey ? rosterMap.get(phoneKey) : null;

        if (existingAgent) {
          // Enrich polling_unit_agents record with bank details and profile info from members
          if (m.bank_name) existingAgent.bank_name = m.bank_name;
          if (m.account_number) existingAgent.account_number = m.account_number;
          if (m.full_name) existingAgent.full_name = m.full_name;
          if (m.membership_id) existingAgent.membership_id = m.membership_id;
          if (isStarred && designation) existingAgent.agent_designation = designation;
        } else if (isStarred) {
          rosterMap.set(m.id, {
            id: m.id,
            membership_id: m.membership_id || `KAT-PUA-${m.id.slice(0, 6)}`,
            full_name: m.full_name,
            phone: m.phone || null,
            email: m.email || null,
            lga: m.lga || lga || "Katsina",
            ward: m.ward || ward || "Central Ward",
            polling_unit: m.polling_unit || "Unassigned Polling Unit",
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
    }

    return Array.from(rosterMap.values());
  } catch (err) {
    console.error("Exception fetching starred agents payment roster:", err);
    return [];
  }
};
