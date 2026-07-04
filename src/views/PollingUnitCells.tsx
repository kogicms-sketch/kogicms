"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Users,
  Target,
  Plus,
  Search,
  Filter,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Map,
  List,
  BarChart3,
  X
} from "lucide-react";
import {
  usePollingUnitCells,
  usePollingUnitStats,
  CELL_STATUS_LABELS,
} from "@/hooks/usePollingUnitCells";
import { useAuthorizedLgas } from "@/hooks/useAuthorizedLgas";
import { useProfile } from "@/hooks/useSettings";
import { KATSINA_LGAS, ALL_WARDS } from "@/data/aggregated_lga_data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { WardTargets } from "@/components/analytics/WardTargets";
import dynamic from "next/dynamic";
const PollingUnitMap = dynamic(
  () => import("@/components/maps/PollingUnitMap").then((mod) => mod.PollingUnitMap),
  { ssr: false }
);

const PollingUnitCells = () => {
  const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
  const [activeTab, setActiveTab] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    lga: "",
    ward: "",
    status: "",
  });

  const { data: profile } = useProfile();

  useEffect(() => {
    if (profile) {
      setFilters(f => ({
        ...f,
        lga: f.lga || profile.lga || "",
        ward: f.ward || (profile.role === "councillor" ? (profile.ward || "") : "") || "",
      }));
    }
  }, [profile]);

  const { data: authorizedLgas, isLoading: jurisdictionLoading } = useAuthorizedLgas();
  const { data: cells, isLoading: cellsLoading } = usePollingUnitCells({
    lga: filters.lga || undefined,
    ward: filters.ward || undefined,
    status: filters.status || undefined,
  });

  const { data: stats, isLoading: statsLoading } = usePollingUnitStats({
    lga: filters.lga || undefined,
    ward: filters.ward || undefined,
  });

  const isSuperAdmin = authorizedLgas?.includes("ALL");
  const filteredLgas = isSuperAdmin ? KATSINA_LGAS : (authorizedLgas || []);

  const isLoading = cellsLoading || statsLoading || jurisdictionLoading;

  const filteredCells = cells?.filter(cell => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    return (
      cell.polling_unit_name?.toLowerCase().includes(query) ||
      cell.ward?.toLowerCase().includes(query) ||
      cell.lga?.toLowerCase().includes(query) ||
      cell.polling_unit_agent_name?.toLowerCase().includes(query) ||
      cell.pu_code?.toLowerCase().includes(query)
    );
  });

  const progress = stats ? Math.min(Math.round(((stats as any).totalAppMembers / stats.totalTarget) * 100), 100) : 0;

  return (
    <DashboardLayout
      title="Polling Unit Cells"
      subtitle="PU-level voter mobilization and cell formation"
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="kpi-card-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/70 text-sm">Total Cells</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.totalCells || 0}</div>
            <p className="text-xs text-white/60">PU units covered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Members Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[hsl(var(--apc-green))]">{progress}%</div>
            <Progress value={progress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalAppMembers?.toLocaleString() || 0} / {stats?.totalTarget?.toLocaleString()} target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Members Added</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalAppMembers?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered through app
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">PUs Meeting Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.meetingTarget || 0}</div>
            <p className="text-xs text-muted-foreground">
              Of {stats?.totalCells || 0} polling units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <TabsList>
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="map">
              <Map className="w-4 h-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="targets">
              <BarChart3 className="w-4 h-4 mr-2" />
              Targets & Analytics
            </TabsTrigger>
          </TabsList>

          {/* Filters - Only show for List View */}
          {activeTab === "list" && (
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search polling units, wards, LGAs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <span className="text-sm text-muted-foreground">
                  {filteredCells?.length || 0} results
                </span>
              )}

              <Select value={filters.lga || "all"} onValueChange={(v) => setFilters(f => ({ ...f, lga: v === "all" ? "" : v, ward: "" }))}>
                <SelectTrigger className="w-[150px]">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="LGA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LGAs</SelectItem>
                  {filteredLgas.map(lga => (
                    <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.ward || "all"}
                onValueChange={(v) => setFilters(f => ({ ...f, ward: v === "all" ? "" : v }))}
                disabled={!filters.lga || profile?.role === "councillor"}
              >
                <SelectTrigger className="w-[150px]">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {filters.lga && ALL_WARDS
                    .filter(w => w.lga === filters.lga)
                    .map(ward => (
                      <SelectItem key={ward.id} value={ward.name}>{ward.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>

              <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({ ...f, status: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(CELL_STATUS_LABELS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button className="btn-action">
                <Plus className="w-4 h-4 mr-2" />
                Create Cell
              </Button>
            </div>
          )}

          {/* Filters - Show for Map View */}
          {activeTab === "map" && (
            <div className="flex gap-2">
              <Select value={filters.lga || "all"} onValueChange={(v) => setFilters(f => ({ ...f, lga: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-[200px]">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by LGA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LGAs</SelectItem>
                  {filteredLgas.map(lga => (
                    <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* List View Tab */}
        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">Loading polling unit cells...</div>
          ) : filteredCells?.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No Results Found" : "No Cells Found"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? `No polling units match "${searchQuery}". Try searching for a different polling unit name, ward, or LGA.`
                  : "Start forming polling unit cells to mobilize voters."
                }
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCells?.map((cell, index) => {
                const statusConfig = CELL_STATUS_LABELS[cell.status as keyof typeof CELL_STATUS_LABELS];
                const appMembers = (cell as any).app_members_count || 0;
                const target = cell.target_voters || 50;
                const cellProgress = Math.min(Math.round((appMembers / target) * 100), 100);
                const progressColor = cellProgress >= 100 ? 'text-green-600' : cellProgress >= 50 ? 'text-yellow-600' : cellProgress > 0 ? 'text-blue-600' : 'text-muted-foreground';
                // Create unique key that changes when search changes
                const uniqueKey = `${searchQuery}-${cell.lga}-${cell.ward}-${cell.polling_unit_name}-${index}`;

                return (
                  <Card
                    key={uniqueKey}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/polling-units/detail?id=${cell.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{cell.polling_unit_name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs font-normal">
                              {cell.lga}
                            </Badge>
                            <CardDescription className="flex items-center gap-1 m-0">
                              <MapPin className="w-3 h-3" />
                              {cell.ward}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={statusConfig?.bgColor}>
                          <span className={statusConfig?.color}>{statusConfig?.label}</span>
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Members Progress</span>
                          <span className={`font-semibold ${progressColor}`}>{cellProgress}%</span>
                        </div>
                        <Progress value={cellProgress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{appMembers} members added</span>
                          <span>{target} target</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-muted p-2 rounded text-center">
                          <div className="text-lg font-bold">{cell.registered_voters || 0}</div>
                          <div className="text-xs text-muted-foreground">INEC Voters</div>
                        </div>
                        <div className="bg-muted p-2 rounded text-center">
                          <div className={`text-lg font-bold ${appMembers > 0 ? 'text-blue-600' : ''}`}>{appMembers}</div>
                          <div className="text-xs text-muted-foreground">Members</div>
                        </div>
                        <div className="bg-muted p-2 rounded text-center">
                          <div className={`text-lg font-bold ${progressColor}`}>{cellProgress}%</div>
                          <div className="text-xs text-muted-foreground">Performance</div>
                        </div>
                      </div>

                      {/* Polling Unit Agent */}
                      {cell.polling_unit_agent_name ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            Agent: <span className="font-medium">{cell.polling_unit_agent_name}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-muted-foreground">No polling unit agent assigned</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Map View Tab */}
        <TabsContent value="map">
          <PollingUnitMap
            units={filteredCells}
            lgaFilter={filters.lga || undefined}
            wardFilter={filters.ward || undefined}
            height="600px"
          />
        </TabsContent>

        {/* Targets & Analytics Tab */}
        <TabsContent value="targets">
          <WardTargets lgaFilter={filters.lga || undefined} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default PollingUnitCells;
