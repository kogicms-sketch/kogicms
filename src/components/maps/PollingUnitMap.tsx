"use client";
import { useEffect, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
} from "lucide-react";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { PollingUnitCell, CELL_STATUS_LABELS } from "@/hooks/usePollingUnitCells";
import { LGA_COORDINATES } from "@/data/lga_coordinates";

// Dynamically required on client side to avoid window is not defined
let MapContainer: any = () => null;
let TileLayer: any = () => null;
let Marker: any = () => null;
let Popup: any = () => null;
let useMap: any = () => null;
let L: any = null;

if (typeof window !== "undefined") {
  const RL = require("react-leaflet");
  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  Marker = RL.Marker;
  Popup = RL.Popup;
  useMap = RL.useMap;
  L = require("leaflet");
}

let DefaultIcon: any = null;
if (typeof window !== "undefined" && L) {
  DefaultIcon = new L.Icon({
    iconUrl: icon.src || icon,
    shadowUrl: iconShadow.src || iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
}

interface PollingUnitMapProps {
  units?: PollingUnitCell[]; // Changed to accept units prop
  lgaFilter?: string;
  wardFilter?: string;
  height?: string;
  onUnitSelect?: (unit: PollingUnitCell) => void;
}

// Map bounds fitter component
const MapBoundsFitter = ({ units }: { units: (PollingUnitCell & { lat: number; lng: number })[] }) => {
  const map = useMap();

  useEffect(() => {
    if (units.length > 0 && typeof window !== "undefined" && L) {
      const bounds = new L.LatLngBounds(
        units.map(u => [u.lat, u.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [units, map]);

  return null;
};

// Deterministic pseudo-random number generator
const pseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
};

export const PollingUnitMap = ({
  units = [],
  lgaFilter,
  wardFilter,
  height = "600px",
  onUnitSelect
}: PollingUnitMapProps) => {
  const [selectedUnit, setSelectedUnit] = useState<PollingUnitCell | null>(null);

  // Kogi State approximate center
  const katsinaCenter: [number, number] = [7.8023, 6.7430];

  // Process units to add coordinates if missing
  const mappedUnits = useMemo(() => {
    return units.map(unit => {
      // Use existing coordinates if available (checking generic object access for safety)
      const lat = (unit as any).latitude;
      const lng = (unit as any).longitude;

      if (lat && lng) {
        return { ...unit, lat, lng, isSimulated: false };
      }

      // Simulate coordinates based on LGA
      const lgaCenter = LGA_COORDINATES[unit.lga] || katsinaCenter;

      // Generate deterministic random offset
      // Use polling_unit_name and ward for seed to keep it consistent
      const seed1 = `${unit.polling_unit_name}-${unit.ward}-lat`;
      const seed2 = `${unit.polling_unit_name}-${unit.ward}-lng`;

      // Spread: +/- 0.05 degrees (approx 5-6km radius)
      const spread = 0.05;
      const latOffset = (pseudoRandom(seed1) - 0.5) * spread;
      const lngOffset = (pseudoRandom(seed2) - 0.5) * spread;

      return {
        ...unit,
        lat: lgaCenter[0] + latOffset,
        lng: lgaCenter[1] + lngOffset,
        isSimulated: true
      };
    });
  }, [units]);

  // Filter mapped units based on props (though normally passed filtered)
  const displayedUnits = useMemo(() => {
    let result = mappedUnits;
    if (lgaFilter) result = result.filter(u => u.lga === lgaFilter);
    if (wardFilter) result = result.filter(u => u.ward === wardFilter);
    return result;
  }, [mappedUnits, lgaFilter, wardFilter]);

  const getStatusColor = (status: string) => {
    const config = CELL_STATUS_LABELS[status as keyof typeof CELL_STATUS_LABELS];
    return config ? config.bgColor.replace("bg-", "bg-") : "bg-gray-500"; // Simplified for now
  };

  const statusConfig = (status: string) => CELL_STATUS_LABELS[status as keyof typeof CELL_STATUS_LABELS] || { label: "Unknown", color: "text-gray-500", bgColor: "bg-gray-100" };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{displayedUnits.length}</div>
            <p className="text-xs text-muted-foreground">Polling Units</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {displayedUnits.reduce((acc, u) => acc + (u.target_voters || 50), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Target</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {displayedUnits.reduce((acc, u) => acc + (u.registered_voters || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[hsl(var(--apc-green))]">
              {displayedUnits.length > 0
                ? Math.round((displayedUnits.reduce((acc, u) => acc + (u.reliable_voters || 0), 0) /
                  displayedUnits.reduce((acc, u) => acc + (u.target_voters || 50), 0)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Coverage</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Polling Unit Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              style={{ height }} 
              className="rounded-lg overflow-hidden relative"
            >
              <MapContainer
                center={katsinaCenter}
                zoom={10}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {displayedUnits.slice(0, 500).map((unit) => (
                  <Marker
                    key={unit.id}
                    position={[unit.lat, unit.lng]}
                    icon={DefaultIcon}
                    eventHandlers={{
                      click: () => {
                        setSelectedUnit(unit);
                        onUnitSelect?.(unit);
                      },
                    }}
                  >
                    <Popup>
                      <div className="space-y-2 min-w-[200px]">
                        <h3 className="font-bold">{unit.polling_unit_name}</h3>
                        <p className="text-sm text-muted-foreground">{unit.pu_code}</p>
                        {unit.isSimulated && (
                          <Badge variant="outline" className="text-[10px] h-5">Approx. Location</Badge>
                        )}

                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Target:</span>
                            <span className="font-medium">{unit.target_voters || 50}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Registered:</span>
                            <span className="font-medium">{unit.registered_voters || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Reliable:</span>
                            <span className="font-medium">{unit.reliable_voters || 0}</span>
                          </div>
                        </div>

                        <Badge className={`${statusConfig(unit.status || 'forming').bgColor} ${statusConfig(unit.status || 'forming').color}`}>
                          {statusConfig(unit.status || 'forming').label}
                        </Badge>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                <MapBoundsFitter units={displayedUnits} />
              </MapContainer>
              {displayedUnits.length > 500 && (
                <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 text-xs rounded shadow z-[1000]">
                  Showing 500 of {displayedUnits.length}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Unit Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Unit Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUnit ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg">{selectedUnit.polling_unit_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUnit.pu_code}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUnit.ward}, {selectedUnit.lga}
                  </p>
                  {(selectedUnit as any).isSimulated && (
                    <p className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> Location is approximate
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Target Voters</span>
                    <span className="font-bold">{selectedUnit.target_voters || 50}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Registered</span>
                    <span className="font-bold">{selectedUnit.registered_voters || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Reliable</span>
                    <span className="font-bold">{selectedUnit.reliable_voters || 0}</span>
                  </div>
                </div>

                <Badge className={`${statusConfig(selectedUnit.status || 'forming').bgColor} ${statusConfig(selectedUnit.status || 'forming').color}`}>
                  {statusConfig(selectedUnit.status || 'forming').label}
                </Badge>

                {selectedUnit.canvasser_name ? (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">Polling Unit Agent Active</p>
                    <p className="text-sm">{selectedUnit.canvasser_name}</p>
                    {selectedUnit.canvasser_phone && (
                      <p className="text-sm text-muted-foreground">{selectedUnit.canvasser_phone}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-700">No canvasser assigned</p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Assign Canvasser
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Click on a marker to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
