import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { supabase as registrySupabase } from "@/integrations/supabase/client";
import { localRepository } from "@/services/LocalRepository";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// Helper to wrap promises in a timeout to prevent hanging states
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Promise timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise
  ]);
}

// Types
export interface Councillor {
    id: string;
    user_id: string;
    chairman_id: string;
    lga: string;
    ward: string;
    councillor_name: string;
    phone: string | null;
    email: string;
    must_change_password: boolean;
    last_password_change: string | null;
    is_active: boolean;
    photo_url: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CouncillorWardData {
    ward: string;
    lga: string;
    totalPollingUnits: number;
    totalMembers: number;
    verifiedMembers: number;
    pendingVerification: number;
    totalActivities: number;
    pollingUnits: any[];
}

// Get current councillor profile
export const useCouncillor = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ["councillor-profile"],
        queryFn: async () => {
            // 1. Check local storage cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("councillor_profile");
                if (cached) {
                    console.log("📦 Loaded councillor profile from local storage cache.");
                    // Background refresh
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            db.from("councillors").select("*").eq("user_id", user.id).maybeSingle()
                                .then(({ data, error }: any) => {
                                    if (data && !error) {
                                        localStorage.setItem("councillor_profile", JSON.stringify(data));
                                    }
                                });
                        }
                    });
                    return JSON.parse(cached) as Councillor;
                }
            }

            // 2. Fallback to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await db
                .from("councillors")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) throw error;
            if (typeof window !== "undefined") {
                localStorage.setItem("councillor_profile", JSON.stringify(data));
            }
            return data as unknown as Councillor;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        ...options
    });
};

// Helper function to load ward dashboard details from database or IndexedDB
const fetchFreshWardData = async (councillor: Councillor): Promise<CouncillorWardData> => {
    // 1. Try to fetch fresh ward members from Supabase to keep cache up to date
    try {
        console.log("🌐 Fetching latest ward members from Supabase for dashboard...");
        const networkResult = await withTimeout(
            supabase
                .from("members")
                .select("id, full_name, email, phone, role, organization_id, state, lga, ward, polling_unit, polling_unit_id, gender, date_of_birth, voters_card_id, voters_card_image_url, is_verified, created_at, updated_at")
                .eq("lga", councillor.lga)
                .eq("ward", councillor.ward),
            4000,
            { data: null, error: new Error("Network query timed out") }
        );

        const { data: memberRows, error: memberError } = networkResult as any;
        if (!memberError && memberRows && memberRows.length > 0) {
            for (const m of memberRows) {
                await localRepository.saveMember(m as any);
            }
        }
    } catch (e) {
        console.warn("Failed to fetch fresh ward members for dashboard:", e);
    }

    // Load from local cache (IndexedDB)
    let wardMembers = await localRepository.getMembersByWard(councillor.lga, councillor.ward);

    // 2. Fetch master polling units of this ward
    let rawPollingUnits: any[] = [];
    try {
        const { data: puData, error: puError } = await supabase
            .from("polling_units")
            .select("*")
            .eq("lga_name", councillor.lga)
            .eq("ward_name", councillor.ward)
            .order("name");
        
        if (!puError && puData) {
            rawPollingUnits = puData;
        } else {
            const cachedPUs = await localRepository.getPollingUnitCells();
            rawPollingUnits = cachedPUs.filter(c => c.lga === councillor.lga && c.ward === councillor.ward);
        }
    } catch (err) {
        const cachedPUs = await localRepository.getPollingUnitCells();
        rawPollingUnits = cachedPUs.filter(c => c.lga === councillor.lga && c.ward === councillor.ward);
    }

    // Fetch polling unit agents in this ward
    let agents: any[] = [];
    try {
        const { data: agentData, error: agentError } = await supabase
            .from("polling_unit_agents")
            .select("id, user_id, agent_name, phone, email, password, polling_unit_id")
            .eq("lga", councillor.lga)
            .eq("ward", councillor.ward);
        if (!agentError && agentData) {
            agents = agentData;
        }
    } catch (err) {
        console.error("Error fetching ward agents:", err);
    }

    // 3. Fetch registered voter counts from the INEC voter registry view
    const voterCountMap = new Map<string, number>();
    try {
        console.log("🌐 Fetching INEC registered voter counts per PU...");
        const countsResult = await withTimeout(
            registrySupabase
                .from("voter_pu_counts")
                .select("polling_unit_code, registered_count")
                .eq("ward", councillor.ward),
            4000,
            { data: null, error: new Error("Registry query timed out") }
        );

        const { data: countsData, error: countsError } = countsResult as any;
        if (!countsError && countsData) {
            countsData.forEach((row: any) => {
                const code = row.polling_unit_code;
                const segments = String(code).split(/[-/]/).filter(Boolean);
                const last = segments[segments.length - 1];
                const seq = parseInt(String(last).replace(/\D/g, ""), 10);
                if (!Number.isNaN(seq)) {
                    voterCountMap.set(`${councillor.ward.trim().toUpperCase()}|${seq}`, row.registered_count || 0);
                }
            });
        }
    } catch (e) {
        console.error("Error fetching voter_pu_counts in useCouncillors:", e);
    }

    // 4. Count total and verified members per polling unit using the ward members list
    const memberCountMap = new Map<string, number>();
    const verifiedCountMap = new Map<string, number>();
    
    let totalMembers = wardMembers.length;
    let verifiedMembers = 0;

    wardMembers.forEach((m) => {
        if (m.is_verified) verifiedMembers++;
        
        // Group by polling unit name (normalized)
        const puNameKey = (m.polling_unit || "").toLowerCase().trim();
        if (puNameKey) {
            memberCountMap.set(puNameKey, (memberCountMap.get(puNameKey) || 0) + 1);
            if (m.is_verified) {
                verifiedCountMap.set(puNameKey, (verifiedCountMap.get(puNameKey) || 0) + 1);
            }
        }
    });

    // 5. Map the polling units to standard format expected by CouncillorDashboard UI
    const pollingUnits = rawPollingUnits.map((pu: any) => {
        const name = pu.name || pu.polling_unit_name || "";
        const code = pu.code || pu.pu_code || "—";
        const key = name.toLowerCase().trim();
        
        // Match with the voter registry count
        let registered = pu.registered_voters || 0;
        const segments = String(code).split(/[-/]/).filter(Boolean);
        const last = segments[segments.length - 1];
        const seq = parseInt(String(last).replace(/\D/g, ""), 10);
        if (!Number.isNaN(seq)) {
            const matchKey = `${councillor.ward.trim().toUpperCase()}|${seq}`;
            if (voterCountMap.has(matchKey)) {
                registered = voterCountMap.get(matchKey) || 0;
            }
        }

        const verified = verifiedCountMap.get(key) || 0;
        const total = memberCountMap.get(key) || 0;

        let status = pu.status || "forming";
        if (verified >= registered && registered > 0) {
            status = "complete";
        } else if (verified > 0) {
            status = "active";
        }

        const agent = agents.find(a => a.polling_unit_id === pu.id);

        return {
            id: pu.id,
            name,
            code,
            registered_voters: registered,
            verified_members: verified,
            total_members: total,
            status,
            agent: agent ? {
                id: agent.id,
                name: agent.agent_name,
                email: agent.email,
                phone: agent.phone,
                password: agent.password,
            } : null,
        };
    });

    const pendingVerification = totalMembers - verifiedMembers;

    // Get activities count
    let activityCount = 0;
    try {
        const { count, error: activityError } = await supabase
            .from("support_group_activities")
            .select("*", { count: "exact", head: true })
            .eq("lga", councillor.lga)
            .eq("ward", councillor.ward);
        if (!activityError) {
            activityCount = count || 0;
        }
    } catch (e) {
        console.error("Error fetching activity count:", e);
    }

    return {
        ward: councillor.ward,
        lga: councillor.lga,
        totalPollingUnits: pollingUnits.length,
        totalMembers,
        verifiedMembers,
        pendingVerification,
        totalActivities: activityCount,
        pollingUnits,
    };
};

// Get ward-specific data for councillor
export const useCouncillorWardData = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-ward-data", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            if (!councillor) throw new Error("Councillor not loaded");

            const cacheKey = `ward_data_v3_${councillor.lga}_${councillor.ward}`;

            // 1. Check local cache first
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as CouncillorWardData;
                        const hasValidPUs = parsed.pollingUnits && 
                            parsed.pollingUnits.length > 0 && 
                            parsed.pollingUnits.every(pu => pu.name && pu.code && pu.code !== "—");

                        if (hasValidPUs) {
                            console.log("📦 Loaded ward dashboard data from local cache.");
                            // Background refresh
                            (async () => {
                                try {
                                    const freshData = await fetchFreshWardData(councillor);
                                    localStorage.setItem(cacheKey, JSON.stringify(freshData));
                                } catch (e) {
                                    console.error("Error refreshing ward data in background:", e);
                                }
                            })();
                            return parsed;
                        } else {
                            console.warn("⚠️ Cached ward data is invalid or lacks names/codes. Bypassing cache to force refetch.");
                            localStorage.removeItem(cacheKey);
                        }
                    } catch (e) {
                        localStorage.removeItem(cacheKey);
                    }
                }
            }

            const freshData = await fetchFreshWardData(councillor);
            if (typeof window !== "undefined") {
                localStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
            return freshData;
        },
        enabled: !!councillor,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

// Get activities in councillor's ward
export const useCouncillorActivities = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-activities", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            if (!councillor) throw new Error("Councillor not loaded");

            const { data, error } = await supabase
                .from("support_group_activities")
                .select(`
          *,
          support_group:organizations(id, name)
        `)
                .eq("lga", councillor.lga)
                .eq("ward", councillor.ward)
                .order("activity_date", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!councillor,
    });
};

// Get members in councillor's ward
export const useCouncillorMembers = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-members", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            if (!councillor) throw new Error("Councillor not loaded");

            const { data, error } = await supabase
                .from("members")
                .select("*")
                .eq("lga", councillor.lga)
                .eq("ward", councillor.ward)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!councillor,
    });
};

// Get support groups in councillor's ward
export const useCouncillorSupportGroups = () => {
    const { data: councillor } = useCouncillor();

    return useQuery({
        queryKey: ["councillor-support-groups", councillor?.lga, councillor?.ward],
        queryFn: async () => {
            if (!councillor) throw new Error("Councillor not loaded");

            const { data, error } = await supabase
                .from("organizations")
                .select("*")
                .eq("category", "support_group");

            if (error) throw error;
            return data;
        },
        enabled: !!councillor,
    });
};
