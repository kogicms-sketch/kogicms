"use client";
import { useEffect, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/loose-client";
import { useCouncillor } from "@/hooks/useCouncillors";
import { useChairman } from "@/hooks/useChairmen";
import { MapPin, Calendar, Users, RefreshCw, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Dynamically required on client side to avoid window is not defined
let MapContainer: any = () => null;
let TileLayer: any = () => null;
let Marker: any = () => null;
let Popup: any = () => null;
let Polyline: any = () => null;
let LayersControl: any = () => null;
let Tooltip: any = () => null;
let useMap: any = () => null;
let L: any = null;

if (typeof window !== "undefined") {
  const RL = require("react-leaflet");
  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  Marker = RL.Marker;
  Popup = RL.Popup;
  Polyline = RL.Polyline;
  LayersControl = RL.LayersControl;
  Tooltip = RL.Tooltip;
  useMap = RL.useMap;
  L = require("leaflet");
}

let DefaultIcon: any = null;
let ActiveIcon: any = null;

if (typeof window !== "undefined" && L) {
  DefaultIcon = new L.Icon({
    iconUrl: icon.src || icon,
    shadowUrl: iconShadow.src || iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  ActiveIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: iconShadow.src || iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
}

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

// Map bound fitter
const MapBoundsFitter = ({ coords }: { coords: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (coords.length > 0 && typeof window !== "undefined" && L) {
      const bounds = new L.LatLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);

  return null;
};

export const PollingUnitReports = () => {
  const { role } = useAuth();
  const { data: councillor } = useCouncillor();
  const { data: chairman } = useChairman();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LocationLog[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState<string>("reports-map-init");

  useEffect(() => {
    setMapKey(`reports-map-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  }, [selectedAgentId, logs.length]);

  // Katsina approximate center
  const katsinaCenter: [number, number] = [12.9908, 7.5965];

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
            <CardContent className="p-0 flex-1 relative">
              <div 
                ref={(el) => {
                  if (el) {
                    const mapDiv = el.querySelector('.leaflet-container') || el;
                    if (mapDiv) {
                      delete (mapDiv as any)._leaflet_id;
                    }
                  }
                }}
                style={{ height: "100%", width: "100%" }} 
                className="absolute inset-0"
              >
                <MapContainer
                  key={mapKey}
                  center={katsinaCenter}
                  zoom={11}
                  style={{ height: "100%", width: "100%" }}
                >
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Modern Streets">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="ESRI Satellite (World Imagery)">
                      <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Dark Theme Mode">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>

                  {/* Render the polyline movement tracks */}
                  {selectedAgentPath.length > 1 && (
                    <Polyline
                      positions={selectedAgentPath}
                      color="#f97316"
                      weight={5}
                      opacity={0.9}
                      dashArray="8, 12"
                    />
                  )}

                  {/* Render markers for each logged position of the selected agent */}
                  {selectedAgentLogs.map((log, index) => {
                    const isNewest = index === 0;
                    return (
                      <Marker
                        key={log.id}
                        position={[log.latitude, log.longitude]}
                        icon={isNewest ? ActiveIcon : DefaultIcon}
                      >
                        <Tooltip permanent={isNewest} direction="top" offset={[0, -10]}>
                          <span className="font-bold text-[10px] px-1 py-0.5">
                            {isNewest ? "Active Spot" : `#${selectedAgentLogs.length - index}`}
                          </span>
                        </Tooltip>
                        <Popup>
                          <div className="space-y-1.5 min-w-[150px]">
                            <h3 className="font-bold text-sm">{log.agent_name}</h3>
                            <p className="text-xs text-muted-foreground uppercase">{log.polling_unit_name}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                            <span className="text-[10px] font-bold block">
                              {isNewest ? "🟢 Current Active Spot" : `📍 History Log #${selectedAgentLogs.length - index}`}
                            </span>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {selectedAgentPath.length > 0 && <MapBoundsFitter coords={selectedAgentPath} />}
                </MapContainer>
              </div>

              {/* Float Overlay detailing selected agent status */}
              {selectedAgentId && agentsMap.get(selectedAgentId) && (
                <div className="absolute bottom-4 left-4 z-[1000] bg-card/95 border shadow-xl p-3 sm:p-4 rounded-xl max-w-sm backdrop-blur-md">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                      <Navigation className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {agentsMap.get(selectedAgentId)?.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {agentsMap.get(selectedAgentId)?.pu}
                      </p>
                      <p className="text-xs text-foreground mt-2 font-medium">
                        Total coordinates captured: {selectedAgentLogs.length} logs
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PollingUnitReports;
