"use client";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/loose-client";
import { useCouncillor } from "@/hooks/useCouncillors";
import { useChairman } from "@/hooks/useChairmen";
import { Calendar, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentPerformanceReport } from "@/components/dashboard/AgentPerformanceReport";

const ReportsMap = dynamic(() => import("@/components/maps/ReportsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-muted/30 animate-pulse rounded-xl flex items-center justify-center text-xs text-muted-foreground">
      Loading interactive map...
    </div>
  ),
});

interface LocationLog {
  id: string;
  agent_user_id: string;
  agent_name: string;
  lga: string;
  ward: string;
  polling_unit_name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export const PollingUnitReports = () => {
  const { role } = useAuth();
  const { data: councillor } = useCouncillor();
  const { data: chairman } = useChairman();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LocationLog[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Kogi approximate center
  const kogiCenter: [number, number] = [7.8023, 6.7430];

  const fetchLocations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('agent_locations')
        .select('*')
        .order('created_at', { ascending: false });

      // Jurisdictional filter
      if (role === 'councillor' && councillor?.ward) {
        query = query.eq('ward', councillor.ward).eq('lga', councillor.lga);
      } else if (role === 'lga_chairman' && chairman?.lga) {
        query = query.eq('lga', chairman.lga);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching agent locations:", error);
      } else {
        setLogs((data || []) as LocationLog[]);
        // Default select the first agent in the list
        if (data && data.length > 0 && !selectedAgentId) {
          setSelectedAgentId(data[0].agent_user_id);
        }
      }
    } catch (err) {
      console.error("Exception fetching locations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [role, councillor, chairman]);

  // Group logs by agent
  const agentsMap = useMemo(() => {
    const map = new Map<string, { name: string; ward: string; pu: string; logs: LocationLog[] }>();
    logs.forEach((log) => {
      const existing = map.get(log.agent_user_id);
      if (existing) {
        existing.logs.push(log);
      } else {
        map.set(log.agent_user_id, {
          name: log.agent_name,
          ward: log.ward,
          pu: log.polling_unit_name,
          logs: [log]
        });
      }
    });
    return map;
  }, [logs]);

  const agentsList = useMemo(() => {
    return Array.from(agentsMap.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }, [agentsMap]);

  // Coordinates path of the selected agent (sorted oldest to newest for the line)
  const selectedAgentPath = useMemo(() => {
    if (!selectedAgentId) return [];
    const agentData = agentsMap.get(selectedAgentId);
    if (!agentData) return [];
    
    // Sort ascending by time to trace coordinates correctly
    const sorted = [...agentData.logs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    return sorted.map(log => [log.latitude, log.longitude] as [number, number]);
  }, [selectedAgentId, agentsMap]);

  const selectedAgentLogs = useMemo(() => {
    if (!selectedAgentId) return [];
    const agentData = agentsMap.get(selectedAgentId);
    return agentData ? agentData.logs : [];
  }, [selectedAgentId, agentsMap]);

  const selectedAgentData = selectedAgentId ? agentsMap.get(selectedAgentId) || null : null;

  return (
    <DashboardLayout title="Agent Location Reports" subtitle="Track live movements and reports of Polling Unit Agents">
      <div className="space-y-4">
        {/* Header toolbar */}
        <div className="flex justify-between items-center bg-card p-4 border rounded-xl shadow-sm">
          <div>
            <h2 className="text-lg font-bold">Field Geolocation Reports</h2>
            <p className="text-xs text-muted-foreground">Monitor agent check-in coordinates on the ground</p>
          </div>
          <Button size="sm" onClick={fetchLocations} variant="outline" className="gap-1.5 cursor-pointer">
            <RefreshCw className={loading ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Agent list selector */}
          <Card className="lg:col-span-1 border rounded-xl shadow-sm h-[600px] flex flex-col overflow-hidden">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Active Field Agents ({agentsList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 overflow-y-auto divide-y divide-border">
              {loading && agentsList.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">Loading agents...</div>
              ) : agentsList.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">No agent reports logged yet.</div>
              ) : (
                agentsList.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`w-full text-left p-3 flex flex-col gap-1 transition-all rounded-lg ${
                      selectedAgentId === agent.id ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="font-bold text-sm text-foreground">{agent.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{agent.ward} Ward · {agent.pu}</span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      Last logged: {new Date(agent.logs[0].created_at).toLocaleString()}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Interactive Map */}
          <Card className="lg:col-span-3 border rounded-xl shadow-sm h-[600px] flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 relative h-full">
              <ReportsMap
                selectedAgentPath={selectedAgentPath}
                selectedAgentLogs={selectedAgentLogs}
                selectedAgentId={selectedAgentId}
                selectedAgentData={selectedAgentData}
                kogiCenter={kogiCenter}
              />
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance Leaderboard Report & Export */}
        <AgentPerformanceReport
          lga={councillor?.lga || chairman?.lga || "Kogi"}
          ward={councillor?.ward || "Wakilin Kudu I"}
        />
      </div>
    </DashboardLayout>
  );
};

export default PollingUnitReports;
