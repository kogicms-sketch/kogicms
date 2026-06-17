import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { SupportGroupWithStats } from '@/hooks/useSupportGroups';
import { 
  MapPin, 
  Search, 
  AlertCircle, 
  Activity, 
  Users, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  Compass
} from 'lucide-react';

// Fix for default marker icons in React Leaflet
if (typeof window !== 'undefined' && L) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Map center controller to dynamically move the map when an LGA is selected
const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
};

// All 34 LGAs of Katsina State coordinates
const lgaCoordinates: Record<string, [number, number]> = {
  "Katsina": [12.9894, 7.6006],
  "Daura": [13.0333, 8.3167],
  "Funtua": [11.5233, 7.3081],
  "Dutsin-Ma": [12.4539, 7.4986],
  "Malumfashi": [11.7867, 7.6186],
  "Mani": [12.8550, 7.8814],
  "Kankia": [12.5481, 7.8242],
  "Bakori": [11.5519, 7.4206],
  "Jibia": [13.0931, 7.2289],
  "Batagarawa": [12.9094, 7.6178],
  "Safana": [12.4167, 7.2333],
  "Kurfi": [12.6372, 7.4697],
  "Bindawa": [12.6667, 7.9833],
  "Baure": [12.8500, 8.6167],
  "Zango": [13.0500, 8.5333],
  "Sandamu": [12.9500, 8.3667],
  "Mai'Adua": [13.1833, 8.2167],
  "Mashi": [12.9833, 7.9500],
  "Kaita": [13.1000, 7.7333],
  "Ingawa": [12.6333, 8.1667],
  "Kusada": [12.4500, 8.0833],
  "Matazu": [12.2333, 7.6833],
  "Musawa": [12.1333, 7.6667],
  "Dan Musa": [12.1500, 7.3167],
  "Batsari": [12.7500, 7.2500],
  "Kankara": [11.9333, 7.4167],
  "Faskari": [11.7167, 7.0333],
  "Sabuwa": [11.1667, 7.1167],
  "Dandume": [11.3667, 7.1667],
  "Kafur": [11.6500, 7.6667],
  "Danja": [11.3833, 7.5500],
  "Charanchi": [12.6667, 7.7333],
  "Rimi": [12.8528, 7.7125],
  "Dutsi": [13.0167, 8.1667],
  "default": [12.5139, 7.6114]
};

interface SupportGroupsMapProps {
  groups: SupportGroupWithStats[];
}

type CoverageStatus = 'high' | 'moderate' | 'inactive' | 'blind_spot';

interface LGAReport {
  name: string;
  count: number;
  members: number;
  activities: number;
  status: CoverageStatus;
  coords: [number, number];
}

export function SupportGroupsMap({ groups }: SupportGroupsMapProps) {
  const [mounted, setMounted] = useState(false);
  const [mapKey, setMapKey] = useState("map-initial");
  const [activeTab, setActiveTab] = useState<'all' | CoverageStatus>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLga, setSelectedLga] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.5139, 7.6114]);
  const [mapZoom, setMapZoom] = useState(8);

  useEffect(() => {
    setMounted(true);
    setMapKey(`map-${Date.now()}`);
  }, []);

  // Process data for all 34 LGAs
  const lgaDataList = useMemo(() => {
    const lgaMap: Record<string, Omit<LGAReport, 'name' | 'status' | 'coords'>> = {};
    
    // Pre-populate all known LGAs
    Object.keys(lgaCoordinates).forEach(lga => {
      if (lga !== 'default') {
        lgaMap[lga] = { count: 0, members: 0, activities: 0 };
      }
    });

    // Populate counts from registered groups
    groups.forEach(group => {
      const lga = group.lga;
      if (lga) {
        // Normalize the group LGA name for lookup (lowercase, alphanumeric only)
        const normalizedLga = lga.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Find matching key in lgaCoordinates
        const matchedKey = Object.keys(lgaCoordinates).find(key => 
          key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedLga
        );

        if (matchedKey && lgaMap[matchedKey] !== undefined) {
          lgaMap[matchedKey].count += 1;
          lgaMap[matchedKey].members += (group.member_count || 0);
          lgaMap[matchedKey].activities += (group.activities_count || 0);
        }
      }
    });

    // Map to final array with status categorization
    return Object.entries(lgaMap).map(([name, stats]) => {
      let status: CoverageStatus = 'blind_spot';
      if (stats.count > 0) {
        if (stats.activities >= 5) {
          status = 'high';
        } else if (stats.activities >= 1) {
          status = 'moderate';
        } else {
          status = 'inactive';
        }
      }

      return {
        name,
        ...stats,
        status,
        coords: lgaCoordinates[name] || lgaCoordinates["default"]
      } as LGAReport;
    }).sort((a, b) => b.activities - a.activities || b.count - a.count || a.name.localeCompare(b.name));
  }, [groups]);

  // Statistics counters
  const statsCounts = useMemo(() => {
    const counts = { high: 0, moderate: 0, inactive: 0, blind_spot: 0 };
    lgaDataList.forEach(item => {
      counts[item.status]++;
    });
    return counts;
  }, [lgaDataList]);

  // Filtered lists for rendering
  const filteredLgas = useMemo(() => {
    return lgaDataList.filter(item => {
      const matchesTab = activeTab === 'all' || item.status === activeTab;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [lgaDataList, activeTab, searchQuery]);

  const handleLgaClick = (item: LGAReport) => {
    setSelectedLga(item.name);
    setMapCenter(item.coords);
    setMapZoom(11); // Zoom in on selection
  };

  const resetMap = () => {
    setSelectedLga(null);
    setMapCenter([12.5139, 7.6114]);
    setMapZoom(8);
  };

  if (!mounted) {
    return <div className="h-[550px] bg-muted animate-pulse rounded-lg w-full" />;
  }

  // Get status details for UI badges / mapping styling
  const getStatusDetails = (status: CoverageStatus) => {
    switch (status) {
      case 'high':
        return { 
          label: 'Active (High)', 
          color: 'text-green-600 bg-green-50 border-green-200',
          badgeColor: 'bg-green-500 hover:bg-green-600 text-white',
          fillColor: '#22c55e', 
          borderColor: '#15803d' 
        };
      case 'moderate':
        return { 
          label: 'Active (Moderate)', 
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          badgeColor: 'bg-amber-500 hover:bg-amber-600 text-white',
          fillColor: '#f59e0b', 
          borderColor: '#b45309' 
        };
      case 'inactive':
        return { 
          label: 'Inactive Groups', 
          color: 'text-orange-500 bg-orange-50 border-orange-200',
          badgeColor: 'bg-orange-400 hover:bg-orange-500 text-white',
          fillColor: '#fb923c', 
          borderColor: '#ea580c' 
        };
      case 'blind_spot':
      default:
        return { 
          label: 'Blind Spot (No Groups)', 
          color: 'text-red-600 bg-red-50 border-red-200',
          badgeColor: 'bg-red-500 hover:bg-red-600 text-white',
          fillColor: '#ef4444', 
          borderColor: '#b91c1c' 
        };
    }
  };

  return (
    <Card className="col-span-full mb-6 overflow-hidden border border-border/50 shadow-md">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-card to-muted/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
              <Compass className="w-5.5 h-5.5 text-[hsl(var(--apc-green))]" />
              Geographical Coverage Map
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Campaign intelligence map showing LGA mobilization & activity statuses across Katsina State
            </CardDescription>
          </div>
          {statsCounts.blind_spot > 0 && (
            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shrink-0 self-start md:self-auto">
              <AlertCircle className="w-3.5 h-3.5" />
              {statsCounts.blind_spot} Blind Spots Detected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 relative flex flex-col lg:flex-row h-[520px]">
        {/* Leaflet Map Frame */}
        <div className="flex-1 h-[320px] lg:h-full relative border-r">
          <MapContainer 
            key={mapKey}
            center={mapCenter} 
            zoom={mapZoom} 
            scrollWheelZoom={false}
            zoomControl={false}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Render LGA circles */}
            {lgaDataList.map((item) => {
              const details = getStatusDetails(item.status);
              
              // Size circle based on activity levels + group counts
              // High/mod active: larger circles, inactive: medium, blind spot: small constant dot
              let radius = 8;
              if (item.status === 'high') radius = Math.min(12 + item.activities * 2.5, 30);
              else if (item.status === 'moderate') radius = Math.min(10 + item.activities * 2, 22);
              else if (item.status === 'inactive') radius = 10;

              return (
                <CircleMarker
                  key={item.name}
                  center={item.coords}
                  radius={radius}
                  pathOptions={{ 
                    fillColor: details.fillColor, 
                    color: details.borderColor,
                    weight: item.name === selectedLga ? 4 : 1.5,
                    fillOpacity: item.status === 'blind_spot' ? 0.35 : 0.65,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedLga(item.name);
                    },
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[200px] text-foreground">
                      <div className="flex justify-between items-center border-b pb-1.5 mb-2">
                        <h4 className="font-bold text-sm text-primary">{item.name} LGA</h4>
                        <Badge className={`text-[9px] px-1.5 py-0.5 font-bold ${details.badgeColor}`}>
                          {item.status === 'blind_spot' ? 'Blind Spot' : item.status === 'inactive' ? 'Inactive' : 'Active'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Support Groups:</span>
                          <span className="font-semibold">{item.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-500" /> Total Members:</span>
                          <span className="font-semibold">{item.members.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1.5">
                          <span className="text-muted-foreground flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-blue-500" /> Logged Activities:</span>
                          <span className="font-semibold text-blue-600">{item.activities}</span>
                        </div>
                      </div>

                      {item.status === 'blind_spot' && (
                        <p className="text-[10px] text-red-500 mt-2 font-medium flex items-center gap-1 bg-red-50 p-1.5 rounded border border-red-100">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          Zero campaign presence logged. Target for recruitment.
                        </p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            <MapController center={mapCenter} zoom={mapZoom} />
          </MapContainer>

          {/* Floating Controls */}
          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-1.5">
            {selectedLga && (
              <button 
                onClick={resetMap} 
                className="bg-background hover:bg-muted text-xs font-semibold px-3 py-1.5 rounded-md shadow-md border flex items-center gap-1 text-foreground"
              >
                Reset Map View
              </button>
            )}
          </div>

          {/* Map Color Legend */}
          <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur border p-2.5 rounded-lg shadow-lg z-[1000] text-[10px] space-y-1.5 min-w-[170px]">
            <p className="font-bold text-foreground border-b pb-1 mb-1 text-[11px]">Presence Legend</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 border border-green-700 shrink-0" />
              <span className="font-medium">High Presence (5+ events)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-700 shrink-0" />
              <span className="font-medium">Moderate Presence (1-4 events)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-400 border border-orange-600 shrink-0" />
              <span className="font-medium">Registered (0 events logged)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 bg-opacity-40 border border-red-700 shrink-0" />
              <span className="font-medium text-red-600">Blind Spot (No Groups)</span>
            </div>
          </div>
        </div>

        {/* Campaign Analytics Panel */}
        <div className="w-full lg:w-80 h-[200px] lg:h-full bg-card flex flex-col">
          {/* Header Panel */}
          <div className="p-3 border-b space-y-2 shrink-0 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search LGA coverage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Quick Filter Badges */}
            <div className="flex flex-wrap gap-1">
              <button 
                onClick={() => setActiveTab('all')} 
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${activeTab === 'all' ? 'bg-primary text-white border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
              >
                All ({lgaDataList.length})
              </button>
              <button 
                onClick={() => setActiveTab('high')} 
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${activeTab === 'high' ? 'bg-green-600 text-white border-green-600' : 'bg-background hover:bg-muted text-muted-foreground'}`}
              >
                High ({statsCounts.high})
              </button>
              <button 
                onClick={() => setActiveTab('moderate')} 
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${activeTab === 'moderate' ? 'bg-amber-500 text-white border-amber-500' : 'bg-background hover:bg-muted text-muted-foreground'}`}
              >
                Mod ({statsCounts.moderate})
              </button>
              <button 
                onClick={() => setActiveTab('inactive')} 
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${activeTab === 'inactive' ? 'bg-orange-400 text-white border-orange-400' : 'bg-background hover:bg-muted text-muted-foreground'}`}
              >
                Inact ({statsCounts.inactive})
              </button>
              <button 
                onClick={() => setActiveTab('blind_spot')} 
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${activeTab === 'blind_spot' ? 'bg-red-500 text-white border-red-500' : 'bg-background hover:bg-muted text-muted-foreground'}`}
              >
                Blind ({statsCounts.blind_spot})
              </button>
            </div>
          </div>

          {/* List panel */}
          <div className="flex-1 overflow-y-auto divide-y">
            {filteredLgas.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                No matching regions found.
              </div>
            ) : (
              filteredLgas.map((item) => {
                const details = getStatusDetails(item.status);
                const isSelected = item.name === selectedLga;
                
                return (
                  <div 
                    key={item.name}
                    onClick={() => handleLgaClick(item)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors text-xs ${isSelected ? 'bg-primary/5 border-l-2 border-primary font-medium' : ''}`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> {item.count} groups</span>
                        <span className="flex items-center gap-0.5"><Activity className="w-2.5 h-2.5" /> {item.activities} events</span>
                      </div>
                    </div>
                    
                    <Badge className={`text-[9px] px-1.5 py-0.5 font-bold ${details.badgeColor} shrink-0`}>
                      {item.status === 'blind_spot' ? 'Blind Spot' : item.status === 'inactive' ? 'Inactive' : `${item.activities} Events`}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
