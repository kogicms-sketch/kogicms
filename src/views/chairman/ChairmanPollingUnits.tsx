"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useChairman, useChairmanPollingUnits, useChairmanWards } from "@/hooks/useChairmen";
import { useState, useMemo } from "react";
import {
    Building2,
    MapPin,
    Users,
    TrendingUp,
    Search,
    Filter,
    CheckCircle2,
    AlertCircle,
    X,
    Shield,
    Star,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { APCFlag } from "@/components/branding/APCFlag";
import { useParty } from "@/contexts/PartyContext";

// Coverage colour helpers
const coverageColor = (pct: number) => {
    if (pct >= 80) return "text-apc-green";
    if (pct >= 50) return "text-blue-600";
    if (pct >= 30) return "text-amber-600";
    return "text-muted-foreground";
};
const coverageBarColor = (pct: number) => {
    if (pct >= 80) return "bg-apc-green";
    if (pct >= 50) return "bg-blue-500";
    if (pct >= 30) return "bg-amber-500";
    return "bg-red-400";
};

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    complete: { label: "Complete", bg: "bg-green-100", text: "text-green-800" },
    ready: { label: "Ready", bg: "bg-blue-100", text: "text-blue-800" },
    active: { label: "Active", bg: "bg-amber-100", text: "text-amber-800" },
    forming: { label: "Forming", bg: "bg-gray-100", text: "text-gray-700" },
};
const getStatus = (s?: string) => STATUS_CONFIG[s || ""] ?? STATUS_CONFIG.forming;

// ─────────────────────────────────────────────────────────────────
const ChairmanPollingUnits = () => {
    const { party } = useParty();
    const { data: chairman } = useChairman();
    const { data: wards } = useChairmanWards();
    const [selectedWard, setSelectedWard] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const { data: pollingUnits, isLoading } = useChairmanPollingUnits(
        selectedWard !== "all" ? { ward: selectedWard } : undefined
    );

    // Derived stats
    const totalRegistered = pollingUnits?.reduce((s, pu: any) => s + (pu.registered_voters || 0), 0) ?? 0;
    const totalReliable = pollingUnits?.reduce((s, pu) => s + (pu.verified_members || 0), 0) ?? 0;
    const overallCoverage = totalRegistered > 0 ? (totalReliable / totalRegistered) * 100 : 0;

    // Filtered list
    const filteredUnits = useMemo(() => {
        if (!pollingUnits) return [];
        return pollingUnits.filter((pu) => {
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                pu.name?.toLowerCase().includes(q) ||
                pu.ward_name?.toLowerCase().includes(q) ||
                (pu.code || "").toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === "all" || ((pu as any).status || "forming") === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [pollingUnits, searchQuery, statusFilter]);

    return (
        <DashboardLayout>
            <div className="space-y-4 sm:space-y-6 animate-fade-in">

                {/* ── APC HERO BANNER ── */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-xl">
                    <div className="flex h-2 sm:h-3">
                        <div className="flex-1 bg-apc-green" />
                        <div className="flex-1 bg-white border-y border-gray-200" />
                        <div className="flex-1 bg-apc-red" />
                    </div>
                    <div className="bg-gradient-to-br from-apc-green via-[#006600] to-[#004d00] p-5 sm:p-7 lg:p-10 relative">
                        <div
                            className="absolute inset-0 bg-center bg-no-repeat bg-contain opacity-5 pointer-events-none"
                            style={{ backgroundImage: "url('/apc-flag.svg')" }}
                        />
                        <div className="absolute -top-10 -right-10 w-48 h-48 sm:w-72 sm:h-72 rounded-full bg-white/5 pointer-events-none" />
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                            <div className="flex-shrink-0 hidden sm:block">
                                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border-2 border-white/20 shadow-lg">
                                    <Building2 className="h-7 w-7 text-white" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs sm:text-sm font-semibold text-white/70 uppercase tracking-widest mb-1">
                                    {party.shortName} — {party.fullName}
                                </div>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                                    Polling Units
                                </h1>
                                <p className="mt-1.5 text-white/85 text-sm sm:text-base font-medium">
                                    {chairman?.lga} LGA — Complete polling unit coverage
                                </p>
                            </div>
                            <div className="self-start sm:self-center flex-shrink-0">
                                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {pollingUnits?.length || 0} Units
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex h-2 sm:h-3">
                        <div className="flex-1 bg-apc-green" />
                        <div className="flex-1 bg-white border-y border-gray-200" />
                        <div className="flex-1 bg-apc-red" />
                    </div>
                </div>

                {/* ── STATS GRID ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* Total Units */}
                    <Card className="border-l-4 border-l-apc-green bg-gradient-to-br from-apc-green/10 to-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3 sm:p-4">
                            <CardTitle className="text-[11px] sm:text-xs font-semibold text-gray-600">Total Units</CardTitle>
                            <div className="rounded-full bg-apc-green/10 p-1.5 sm:p-2">
                                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-apc-green" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0">
                            <div className="text-2xl sm:text-3xl font-extrabold text-apc-green">{pollingUnits?.length || 0}</div>
                            <p className="text-[10px] sm:text-xs text-apc-green font-medium mt-0.5">Polling units</p>
                        </CardContent>
                    </Card>

                    {/* Registered Voters */}
                    <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3 sm:p-4">
                            <CardTitle className="text-[11px] sm:text-xs font-semibold text-gray-600">Registered Voters</CardTitle>
                            <div className="rounded-full bg-blue-100 p-1.5 sm:p-2">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0">
                            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700">{totalRegistered.toLocaleString()}</div>
                            <p className="text-[10px] sm:text-xs text-blue-600 font-medium mt-0.5">INEC registered</p>
                        </CardContent>
                    </Card>

                    {/* Reliable Voters */}
                    <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3 sm:p-4">
                            <CardTitle className="text-[11px] sm:text-xs font-semibold text-gray-600">Reliable Voters</CardTitle>
                            <div className="rounded-full bg-indigo-100 p-1.5 sm:p-2">
                                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0">
                            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700">{totalReliable.toLocaleString()}</div>
                            <p className="text-[10px] sm:text-xs text-indigo-600 font-medium mt-0.5">Verified members</p>
                        </CardContent>
                    </Card>

                    {/* Coverage */}
                    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3 sm:p-4">
                            <CardTitle className="text-[11px] sm:text-xs font-semibold text-gray-600">Coverage</CardTitle>
                            <div className="rounded-full bg-amber-100 p-1.5 sm:p-2">
                                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0">
                            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">{overallCoverage.toFixed(1)}%</div>
                            <p className="text-[10px] sm:text-xs text-amber-600 font-medium mt-0.5">Mobilization rate</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── SEARCH & FILTERS ── */}
                <Card className="border-0 shadow-md overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-apc-green via-white to-apc-red" />
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, ward or code…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-9"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Ward filter */}
                            <Select value={selectedWard} onValueChange={setSelectedWard}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <MapPin className="h-4 w-4 mr-2 text-apc-green" />
                                    <SelectValue placeholder="All Wards" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Wards</SelectItem>
                                    {wards?.map((ward) => (
                                        <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Status filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[160px]">
                                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Result count */}
                            {(searchQuery || statusFilter !== "all") && (
                                <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                                    <span className="font-semibold text-foreground">{filteredUnits.length}</span>&nbsp;results
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ── POLLING UNIT CARDS ── */}
                {isLoading ? (
                    <div className="flex items-center justify-center min-h-[30vh]">
                        <div className="text-center space-y-4">
                            <div className="relative mx-auto w-14 h-14">
                                <div className="animate-spin rounded-full h-14 w-14 border-4 border-apc-green/20 border-t-apc-green" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Shield className="h-5 w-5 text-apc-green" />
                                </div>
                            </div>
                            <p className="text-muted-foreground font-medium">Loading polling units…</p>
                        </div>
                    </div>
                ) : filteredUnits.length === 0 ? (
                    <Card className="p-12 text-center border-dashed border-2 border-gray-200 shadow-none">
                        <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {searchQuery || statusFilter !== "all" ? "No Results Found" : "No Polling Units"}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            {searchQuery || statusFilter !== "all"
                                ? "Try adjusting your search or filters."
                                : "No polling units are available for this LGA yet."}
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredUnits.map((pu: any) => {
                            const coverage = pu.registered_voters > 0
                                ? Math.min((pu.verified_members || 0) / pu.registered_voters * 100, 100)
                                : 0;
                            const statusCfg = getStatus(pu.status || "forming");
                            const appMembers = pu.verified_members || 0;
                            const target = pu.registered_voters || 0;

                            return (
                                <Card
                                    key={pu.id}
                                    className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-gray-100 hover:border-apc-green/30 overflow-hidden"
                                >
                                    {/* Top accent bar */}
                                    <div className={`h-1 ${coverage >= 80 ? "bg-apc-green" : coverage >= 50 ? "bg-blue-500" : coverage >= 30 ? "bg-amber-500" : "bg-gray-200"}`} />

                                    <CardHeader className="pb-3 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-sm font-bold leading-snug text-gray-800 truncate">
                                                    {pu.name}
                                                </CardTitle>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPin className="h-3 w-3 text-apc-green" />
                                                        <span>{pu.ward_name}</span>
                                                    </div>
                                                    {pu.code && (
                                                        <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                            {pu.code}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-4 pt-0 space-y-3">
                                        {/* Member progress */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-muted-foreground">Coverage</span>
                                                <span className={`font-bold ${coverageColor(coverage)}`}>{coverage.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${coverageBarColor(coverage)}`}
                                                    style={{ width: `${coverage}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* KPI mini row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-blue-50 rounded-lg p-2 text-center">
                                                <div className="text-base font-extrabold text-blue-700">{((pu as any).registered_voters || 0).toLocaleString()}</div>
                                                <div className="text-[10px] text-blue-500 font-medium">Registered</div>
                                            </div>
                                            <div className="bg-apc-green/10 rounded-lg p-2 text-center">
                                                <div className="text-base font-extrabold text-apc-green">{appMembers.toLocaleString()}</div>
                                                <div className="text-[10px] text-apc-green font-medium">Reliable</div>
                                            </div>
                                            <div className={`rounded-lg p-2 text-center ${coverage >= 80 ? "bg-green-50" : coverage >= 50 ? "bg-blue-50" : "bg-gray-50"}`}>
                                                <div className={`text-base font-extrabold ${coverageColor(coverage)}`}>{coverage.toFixed(0)}%</div>
                                                <div className="text-[10px] text-muted-foreground font-medium">Rate</div>
                                            </div>
                                        </div>

                                        {/* Agent / status indicator */}
                                        {(pu as any).polling_unit_agent_name ? (
                                            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
                                                <CheckCircle2 className="h-4 w-4 text-apc-green flex-shrink-0" />
                                                <span className="text-xs text-gray-700 truncate">
                                                    Agent: <span className="font-semibold">{(pu as any).polling_unit_agent_name}</span>
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                                <span className="text-xs text-muted-foreground">No agent assigned</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* ── FOOTER BADGE ── */}
                <div className="flex items-center justify-center gap-3 py-3 opacity-60">
                    <APCFlag size="sm" variant="horizontal" />
                </div>

            </div>
        </DashboardLayout>
    );
};

export default ChairmanPollingUnits;
