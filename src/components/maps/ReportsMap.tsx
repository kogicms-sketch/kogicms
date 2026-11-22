"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Navigation } from "lucide-react";

export interface LocationLog {
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

interface ReportsMapProps {
  selectedAgentPath: [number, number][];
  selectedAgentLogs: LocationLog[];
  selectedAgentId: string | null;
  selectedAgentData?: { name: string; ward: string; pu: string; logs: LocationLog[] } | null;
  kogiCenter: [number, number];
}

export default function ReportsMap({
  selectedAgentPath,
  selectedAgentLogs,
  selectedAgentId,
  selectedAgentData,
  kogiCenter,
}: ReportsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Map once safely
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any stale map or container state left by HMR / StrictMode
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    if ((containerRef.current as any)._leaflet_id) {
      delete (containerRef.current as any)._leaflet_id;
      containerRef.current.innerHTML = "";
    }

    // Create fresh Leaflet map
    const map = L.map(containerRef.current, {
      center: kogiCenter,
      zoom: 11,
      scrollWheelZoom: true,
    });

    mapRef.current = map;

    // Add Tile Layers
    const streetsTile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    const satelliteTile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    });

    const darkTile = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });

    streetsTile.addTo(map);

    L.control.layers({
      "Modern Streets": streetsTile,
      "ESRI Satellite (World Imagery)": satelliteTile,
      "Dark Theme Mode": darkTile,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Update Map Layers (Polyline, Markers, Bounds) dynamically whenever props change
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear existing markers and paths
    layerGroup.clearLayers();

    const DefaultIcon = new L.Icon({
      iconUrl: typeof icon === "string" ? icon : (icon as any)?.src || "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: typeof iconShadow === "string" ? iconShadow : (iconShadow as any)?.src || "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    const ActiveIcon = new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
      shadowUrl: typeof iconShadow === "string" ? iconShadow : (iconShadow as any)?.src || "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    // Render polyline track
    if (selectedAgentPath.length > 1) {
      const polyline = L.polyline(selectedAgentPath, {
        color: "#f97316",
        weight: 5,
        opacity: 0.9,
        dashArray: "8, 12",
      });
      polyline.addTo(layerGroup);
    }

    // Render markers
    selectedAgentLogs.forEach((log, index) => {
      const isNewest = index === 0;
      const marker = L.marker([log.latitude, log.longitude], {
        icon: isNewest ? ActiveIcon : DefaultIcon,
      });

      marker.bindTooltip(
        `<span style="font-weight:bold; font-size:10px;">${isNewest ? "Active Spot" : `#${selectedAgentLogs.length - index}`}</span>`,
        { permanent: isNewest, direction: "top", offset: [0, -10] }
      );

      marker.bindPopup(`
        <div style="min-width: 150px;">
          <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 4px 0;">${log.agent_name}</h3>
          <p style="font-size: 12px; margin: 0; text-transform: uppercase; color: #666;">${log.polling_unit_name}</p>
          <p style="font-size: 10px; margin: 2px 0; color: #888;">${new Date(log.created_at).toLocaleString()}</p>
          <span style="font-size: 10px; font-weight: bold;">${isNewest ? "🟢 Current Active Spot" : `📍 History Log #${selectedAgentLogs.length - index}`}</span>
        </div>
      `);

      marker.addTo(layerGroup);
    });

    // Fit bounds if coords exist
    if (selectedAgentPath.length > 0) {
      const bounds = L.latLngBounds(selectedAgentPath);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedAgentPath, selectedAgentLogs]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-xl overflow-hidden" />

      {/* Float Overlay detailing selected agent status */}
      {selectedAgentId && selectedAgentData && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-card/95 border shadow-xl p-3 sm:p-4 rounded-xl max-w-sm backdrop-blur-md">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">
                {selectedAgentData.name}
              </h4>
              <p className="text-[10px] text-muted-foreground uppercase">
                {selectedAgentData.ward} Ward · {selectedAgentData.pu}
              </p>
              <p className="text-[10px] text-primary font-bold mt-0.5">
                📍 {selectedAgentLogs.length} Coordinates Reported
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
