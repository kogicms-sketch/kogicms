"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Navigation } from "lucide-react";

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
  katsinaCenter: [number, number];
}

const MapBoundsFitter = ({ coords }: { coords: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = new L.LatLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);

  return null;
};

export default function ReportsMap({
  selectedAgentPath,
  selectedAgentLogs,
  selectedAgentId,
  selectedAgentData,
  katsinaCenter,
}: ReportsMapProps) {
  return (
    <div className="relative w-full h-full min-h-[500px]">
      <MapContainer
        center={katsinaCenter}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
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

        {/* Polyline movement tracks */}
        {selectedAgentPath.length > 1 && (
          <Polyline
            positions={selectedAgentPath}
            color="#f97316"
            weight={5}
            opacity={0.9}
            dashArray="8, 12"
          />
        )}

        {/* Markers for logged positions */}
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
