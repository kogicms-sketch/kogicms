"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  X,
  Lock,
  ArrowRight,
  ShieldCheck,
  Building2,
  ChevronLeft
} from "lucide-react";
import {
  usePollingUnitCells,
  usePollingUnitStats,
  getIndexedPollingUnits,
  CELL_STATUS_LABELS,
} from "@/hooks/usePollingUnitCells";
import { useAuthorizedLgas } from "@/hooks/useAuthorizedLgas";
import { useProfile } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useCouncillor } from "@/hooks/useCouncillors";
import { usePUAgent } from "@/hooks/usePUAgent";
import { KOGI_LGAS, ALL_WARDS, ALL_POLLING_UNITS } from "@/data/aggregated_lga_data";
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

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const PollingUnitCells = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigate = (path: string | number) => {
    if (path === -1) router.back();
    else router.push(path as string);
  };

  const [activeTab, setActiveTab] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");

  const { role, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: councillor } = useCouncillor();
  const { data: puAgent } = usePUAgent();

  // Check if current user is Polling Unit Agent
  const cachedRole = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null;
  const isPUAgent =
    role === "polling_unit_agent" ||
    role === "agent" ||
    role === "pu_agent" ||
    cachedRole === "polling_unit_agent" ||
    profile?.role === "polling_unit_agent" ||
    user?.user_metadata?.role === "polling_unit_agent";

  // Check if current user is in Ward / Councillor scope
  const cachedWard = typeof window !== "undefined" ? localStorage.getItem("councillor_ward") : null;
  const cachedLga = typeof window !== "undefined" ? localStorage.getItem("councillor_lga") : null;
  const queryWard = searchParams.get("ward");
  const queryLga = searchParams.get("lga");

  const isCouncillor =
    !isPUAgent && (
    role === "councillor" ||
    cachedRole === "councillor" ||
    profile?.role === "councillor" ||
    Boolean(queryWard) ||
    Boolean(cachedWard));

  // Determine active ward & LGA
  const activeWard = queryWard || cachedWard || councillor?.ward || profile?.ward || "Eggan";
  const activeLga = queryLga || cachedLga || councillor?.lga || profile?.lga || "Lokoja";

  const [filters, setFilters] = useState({
    lga: isCouncillor ? activeLga : (profile?.lga || ""),
    ward: isCouncillor ? activeWard : (profile?.ward || ""),
    status: "",
  });

  useEffect(() => {
    if (isCouncillor) {
      setFilters(f => ({
        ...f,
        lga: activeLga,
        ward: activeWard,
      }));
    } else if (profile) {
      setFilters(f => ({
        ...f,
        lga: f.lga || profile.lga || "",
        ward: f.ward || profile.ward || "",
      }));
    }
  }, [profile, isCouncillor, activeLga, activeWard]);

  const { data: authorizedLgas, isLoading: jurisdictionLoading } = useAuthorizedLgas();

  const effectiveLga = isCouncillor ? activeLga : (filters.lga || undefined);
  const effectiveWard = isCouncillor ? activeWard : (filters.ward || undefined);

  const { data: cells, isLoading: cellsLoading } = usePollingUnitCells({
    lga: effectiveLga,
    ward: effectiveWard,
    status: filters.status || undefined,
  });

  const { data: stats, isLoading: statsLoading } = usePollingUnitStats({
    lga: effectiveLga,
    ward: effectiveWard,
  });

  const isSuperAdmin = authorizedLgas?.includes("ALL");
  const filteredLgas = isSuperAdmin ? KOGI_LGAS : (authorizedLgas || []);

  const isLoading = cellsLoading || statsLoading || jurisdictionLoading;

  // Filter cells strictly for PU agent or ward councillor with instant synchronous indexed fallback
  const filteredCells = useMemo(() => {
    // 1. Strict filter for Polling Unit Field Agent - ONLY their assigned polling unit
    if (isPUAgent) {
      const puName = puAgent?.polling_unit_name || "Eggan Tifain Area LGEA Sch Eggan";
      const puId = puAgent?.polling_unit_id;
      const agentLga = puAgent?.lga || "Lokoja";
      const agentWard = puAgent?.ward || "Eggan";

      const matched = ALL_POLLING_UNITS.find((p) =>
        (puId && (p.id === puId || p.code === puId)) ||
        norm(p.name) === norm(puName) ||
        norm(p.name).includes(norm(puName)) ||
        norm(puName).includes(norm(p.name))
      );

      const cellItem = matched
        ? {
            id: matched.id,
            polling_unit_name: matched.name,
            ward: matched.wardName,
            lga: matched.lga,
            pu_code: matched.code,
            registered_voters: matched.registeredVoters || 505,
            target_voters: 50,
            app_members_count: 0,
            status: "active",
            polling_unit_agent_name: puAgent?.agent_name || "Assigned Officer",
          }
        : {
            id: puId || "LOKOJA-W10-PU001",
            polling_unit_name: puName,
            ward: agentWard,
            lga: agentLga,
            pu_code: puId || "22-12-10-001",
            registered_voters: 505,
            target_voters: 50,
            app_members_count: 0,
            status: "active",
            polling_unit_agent_name: puAgent?.agent_name || "Assigned Officer",
          };

      if (!searchQuery.trim()) return [cellItem];
      const q = searchQuery.toLowerCase().trim();
      if (
        cellItem.polling_unit_name.toLowerCase().includes(q) ||
        cellItem.pu_code.toLowerCase().includes(q) ||
        cellItem.ward.toLowerCase().includes(q)
      ) {
        return [cellItem];
      }
      return [];
    }
    let list = cells && cells.length > 0 ? cells : [];

    // Instant zero-millisecond fallback from front-end indexed data
    if (list.length === 0) {
      const synchronousUnits = getIndexedPollingUnits(effectiveLga, effectiveWard);
      list = synchronousUnits.map((pu) => ({
        id: pu.id,
        polling_unit_name: pu.name,
        ward: pu.wardName,
        lga: pu.lga,
        pu_code: pu.code,
        registered_voters: pu.registeredVoters || 0,
        target_voters: 50,
        app_members_count: 0,
        status: "forming",
        polling_unit_agent_name: null,
      }));
    }

    // Strict ward boundary check for ward councillors
    if (isCouncillor && activeWard) {
      const targetNeedle = norm(activeWard);
      list = list.filter((cell) => {
        const cellWard = norm(cell.ward);
        return cellWard === targetNeedle || cellWard.includes(targetNeedle) || targetNeedle.includes(cellWard);
      });
    }

    // Deduplicate cells by id and pu_code to ensure strictly unique items
    const seenPus = new Set<string>();
    list = list.filter((cell) => {
      const puKey = `${cell.id || ""}-${cell.pu_code || ""}`;
      if (seenPus.has(puKey)) return false;
      seenPus.add(puKey);
      return true;
    });

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((cell) => {
      return (
        cell.polling_unit_name?.toLowerCase().includes(query) ||
        cell.ward?.toLowerCase().includes(query) ||
        cell.lga?.toLowerCase().includes(query) ||
        cell.polling_unit_agent_name?.toLowerCase().includes(query) ||
        cell.pu_code?.toLowerCase().includes(query)
      );
    });
  }, [cells, effectiveLga, effectiveWard, isCouncillor, isPUAgent, puAgent, activeWard, searchQuery]);

  const totalTarget = stats?.totalTarget || (filteredCells.length * 50) || 50;
  const totalAppMembers = stats?.totalAppMembers || 0;
  const progress = totalTarget > 0 ? Math.min(Math.round((totalAppMembers / totalTarget) * 100), 100) : 0;

  return (
    <DashboardLayout
      title={
        isPUAgent
          ? (puAgent?.polling_unit_name || "My Polling Unit Cell")
          : isCouncillor
          ? `${activeWard} Ward Polling Unit Cells`
          : "Polling Unit Cells"
      }
      subtitle={
        isPUAgent
          ? `Official INEC Polling Unit Cell • ${puAgent?.ward || "Eggan"} Ward, ${puAgent?.lga || "Lokoja"} LGA • APM Field Agent`
          : isCouncillor
          ? `Official INEC Polling Units in ${activeWard} Ward (${activeLga} LGA) • APM Ward Command`
          : "PU-level voter mobilization and cell formation"
      }
    >
      {/* Polling Unit Field Agent Scope Banner */}
      {isPUAgent && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white shadow-lg border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide uppercase">
                  {puAgent?.polling_unit_name || "Assigned Polling Unit Cell"}
                </span>
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                  Assigned PU
                </Badge>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Strict Field Operations Scope: Showing only your assigned polling unit in {puAgent?.ward || "Eggan"} Ward ({puAgent?.lga || "Lokoja"} LGA).
              </p>
            </div>
          </div>

          <Link href="/dashboard">
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold shrink-0 gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              PU Dashboard
            </Button>
          </Link>
        </div>
      )}

      {/* Ward Councillor Scope Banner */}
      {isCouncillor && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-lg border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide uppercase">
                  {activeWard} Ward Polling Units
                </span>
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                  Ward Scoped
                </Badge>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Strict ward boundary active: Showing only {filteredCells.length} polling units registered under {activeWard} in {activeLga} LGA.
              </p>
            </div>
          </div>

          <Link href="/councillor/dashboard">
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold shrink-0 gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Ward Dashboard
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="kpi-card-accent border-0 shadow-md bg-gradient-to-br from-emerald-800 to-teal-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/80 text-xs uppercase tracking-wider font-semibold">
              {isCouncillor ? `${activeWard} Ward Cells` : "Total Cells"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{filteredCells.length}</div>
            <p className="text-xs text-emerald-200 mt-1">PU units in this ward</p>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              Members Mobilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-600">{progress}%</div>
            <Progress value={progress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {totalAppMembers.toLocaleString()} / {totalTarget.toLocaleString()} target
            </p>
          </CardContent>
        </Card>

        <Card className="border border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              APM Members Added
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-700">{totalAppMembers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered in this ward
            </p>
          </CardContent>
        </Card>

        <Card className="border border-purple-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              PUs Meeting Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-700">{stats?.meetingTarget || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Of {filteredCells.length} polling units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="list" className="text-xs font-bold">
              <List className="w-4 h-4 mr-2" />
              List View ({filteredCells.length})
            </TabsTrigger>
            <TabsTrigger value="map" className="text-xs font-bold">
              <Map className="w-4 h-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="targets" className="text-xs font-bold">
              <BarChart3 className="w-4 h-4 mr-2" />
              Targets & Analytics
            </TabsTrigger>
          </TabsList>

          {/* Filters - Only show for List View */}
          {activeTab === "list" && (
            <div className="flex gap-2 flex-wrap items-center w-full lg:w-auto">
              {/* Search Box */}
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search polling units or codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-9 text-xs"
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

              {/* Status Filter */}
              <Select
                value={filters.status || "all"}
                onValueChange={(v) => setFilters(f => ({ ...f, status: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(CELL_STATUS_LABELS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* When NOT in councillor mode, allow LGA and Ward filters */}
              {!isCouncillor && !isPUAgent && (
                <>
                  <Select
                    value={filters.lga || "all"}
                    onValueChange={(v) => setFilters(f => ({ ...f, lga: v === "all" ? "" : v, ward: "" }))}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
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
                    disabled={!filters.lga}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
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
                </>
              )}

              {/* Locked Badge for Polling Unit Agent */}
              {isPUAgent && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[200px]">{puAgent?.polling_unit_name || "My Polling Unit"}</span>
                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold ml-1">
                    Assigned
                  </Badge>
                </div>
              )}

              {/* Locked Badge for Councillor */}
              {isCouncillor && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{activeWard} ({activeLga})</span>
                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold ml-1">
                    Locked
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Filters - Show for Map View */}
          {activeTab === "map" && !isCouncillor && !isPUAgent && (
            <div className="flex gap-2">
              <Select
                value={filters.lga || "all"}
                onValueChange={(v) => setFilters(f => ({ ...f, lga: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-[200px] h-9 text-xs">
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
          {filteredCells.length === 0 && isLoading ? (
            <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-600">Loading {isCouncillor ? `${activeWard} Ward` : ""} polling units...</p>
            </div>
          ) : filteredCells?.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No Matching Polling Units" : "No Polling Units Found"}
              </h3>
              <p className="text-muted-foreground text-xs max-w-md mx-auto">
                {searchQuery
                  ? `No polling units match "${searchQuery}" in ${isCouncillor ? activeWard : "selected"} ward.`
                  : `No polling units registered under ${activeWard} Ward.`}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4 text-xs font-semibold"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search Filter
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCells.map((cell, index) => {
                const statusConfig = CELL_STATUS_LABELS[cell.status as keyof typeof CELL_STATUS_LABELS] || {
                  label: "Forming",
                  color: "text-amber-700",
                  bgColor: "bg-amber-100",
                };
                const appMembers = (cell as any).app_members_count || 0;
                const target = cell.target_voters || 50;
                const cellProgress = Math.min(Math.round((appMembers / target) * 100), 100);
                const progressColor =
                  cellProgress >= 100
                    ? "text-emerald-600"
                    : cellProgress >= 50
                    ? "text-blue-600"
                    : cellProgress > 0
                    ? "text-amber-600"
                    : "text-muted-foreground";

                const uniqueKey = `${cell.id || "pu"}-${cell.pu_code || "code"}-${index}`;

                return (
                  <Card
                    key={uniqueKey}
                    className="hover:shadow-lg transition-all duration-200 border border-gray-200 bg-white flex flex-col justify-between overflow-hidden"
                  >
                    <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-bold text-gray-900 truncate">
                            {cell.polling_unit_name}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[10px] font-semibold bg-gray-50">
                              {cell.lga}
                            </Badge>
                            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              {cell.ward}
                            </span>
                            {cell.pu_code && (
                              <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                                {cell.pu_code}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={`${statusConfig?.bgColor} shrink-0`}>
                          <span className={`text-[10px] font-bold ${statusConfig?.color}`}>{statusConfig?.label}</span>
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      {/* Mobilization Progress */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 font-medium">Voter Mobilization</span>
                          <span className={`font-bold ${progressColor}`}>{cellProgress}%</span>
                        </div>
                        <Progress value={cellProgress} className="h-1.5" />
                        <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                          <span>{appMembers} APM members</span>
                          <span>Target: {target}</span>
                        </div>
                      </div>

                      {/* Mini Stats Grid */}
                      <div className="grid grid-cols-3 gap-1.5 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="text-center">
                          <div className="text-sm font-extrabold text-gray-900">
                            {(cell.registered_voters || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">INEC Voters</div>
                        </div>
                        <div className="text-center border-x border-gray-200">
                          <div className={`text-sm font-extrabold ${appMembers > 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                            {appMembers}
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">Members</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-extrabold ${progressColor}`}>
                            {cellProgress}%
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">Coverage</div>
                        </div>
                      </div>

                      {/* Polling Unit Agent Status */}
                      {cell.polling_unit_agent_name ? (
                        <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs text-emerald-900 font-medium truncate">
                            Agent: <span className="font-bold">{cell.polling_unit_agent_name}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs text-amber-800 font-medium">No agent assigned</span>
                        </div>
                      )}

                      {/* View Polling Unit Dashboard Button */}
                      <Button
                        onClick={() => navigate(`/polling-units/detail?id=${cell.id}`)}
                        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>View PU Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
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
            lgaFilter={effectiveLga}
            wardFilter={effectiveWard}
            height="600px"
          />
        </TabsContent>

        {/* Targets & Analytics Tab */}
        <TabsContent value="targets">
          <WardTargets lgaFilter={effectiveLga} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default PollingUnitCells;
