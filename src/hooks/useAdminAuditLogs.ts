import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

export interface AdminAuditLog {
    id: string;
    admin_id: string;
    action_type: string;
    details: any;
    performed_by: string | null;
    created_at: string;
    performer_name?: string;
}

export const useAdminAuditLogs = (adminId: string | null) => {
    return useQuery({
        queryKey: ["admin-audit-logs", adminId],
        queryFn: async () => {
            if (!adminId) return [];

            // 1. Fetch logs (using 'as any' since table may not be in generated types yet)
            const { data: logs, error: logsError } = await (supabase
                .from("admin_audit_logs" as any)
                .select("*")
                .eq("admin_id", adminId)
                .order("created_at", { ascending: false })) as any;

            if (logsError) {
                console.error("Error fetching admin logs:", logsError);
                throw logsError;
            }

            if (!logs || logs.length === 0) return [];

            // 2. Extract performer IDs
            const performerIds = Array.from(new Set(logs
                .map(l => l.performed_by)
                .filter(Boolean)
            )) as string[];

            // 3. Fetch performer profiles
            let performerMap = new Map<string, string>();

            if (performerIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from("profiles")
                    .select("id, full_name")
                    .in("id", performerIds);

                if (profilesError) {
                    console.error("Error fetching performers:", profilesError);
                    // Continue without names if this fails
                } else {
                    profiles?.forEach(p => {
                        performerMap.set(p.id, p.full_name || "Unknown");
                    });
                }
            }

            // 4. Join
            return logs.map((log: any) => ({
                ...log,
                performer_name: log.performed_by ? (performerMap.get(log.performed_by) || "System/Self") : "System"
            })) as AdminAuditLog[];
        },
        enabled: !!adminId,
    });
};
