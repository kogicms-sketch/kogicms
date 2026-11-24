"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useParty } from "@/contexts/PartyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFederalRep, useFederalConstituencyData } from "@/hooks/useFederalRep";
import { GranularDemographics } from "@/components/dashboard/GranularDemographics";
import { useJurisdictionTrends } from "@/hooks/useJurisdictionTrends";
import { VictoryGauge, RegistrationTrendChart } from "@/components/analytics/DashboardCharts";
import {
    MapPin, Building2, Users, Shield, Search, Target, BarChart3, Star, Activity, TrendingUp,
    ChevronRight, Vote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { APCFlag } from "@/components/branding/APCFlag";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidateSupportGroupsTab } from "@/components/support-groups/CandidateSupportGroupsTab";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { KeyRound } from "lucide-react";

const FederalRepDashboard = () => {
    const { partyId } = useParty();
    const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
    const { data: rep, isLoading: repLoading } = useFederalRep();
    const { data: constData, isLoading: constLoading } = useFederalConstituencyData();
    const { data: trendData, isLoading: trendLoading } = useJurisdictionTrends(rep?.lga_list || []);
    const [search, setSearch] = useState("");
    const [lgaFilter, setLgaFilter] = useState("All");
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const isLoading = repLoading || (!!rep && (constLoading || trendLoading));

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <div className="relative mx-auto w-16 h-16">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-apc-red/20 border-t-apc-red" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Shield className="h-6 w-6 text-apc-red" />
                            </div>
                        </div>
                        <p className="text-muted-foreground font-medium">Loading Constituency Dashboard...</p>
                    </div>
                </div>
                <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
        </DashboardLayout>
        );
    }

    if (!rep) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Shield className="h-12 w-12 text-red-500 mx-auto" />
                        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                        <p className="text-muted-foreground">You are not registered as a Federal Constituency Representative.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const totalVoters = constData?.totalRegisteredVoters || 0;
    const totalPUs = constData?.totalPollingUnits || 0;
    const totalTarget = constData?.totalTargetVoters || 0;
    const totalAppMembers = constData?.totalAppMembers || 0;
    const totalVerified = constData?.totalVerifiedMembers || 0;
    const totalPending = constData?.totalPendingMembers || 0;
    const overallCoverage = totalTarget > 0 ? Math.min((totalVerified / totalTarget) * 100, 100) : 0;
    const lgaCount = constData?.lgaBreakdown?.length || 0;

    const filteredPUs = (constData?.pollingUnits || []).filter((pu: any) => {
        const matchesSearch = pu.name.toLowerCase().includes(search.toLowerCase()) ||
            pu.lga_name.toLowerCase().includes(search.toLowerCase()) ||
            (pu.ward_name || "").toLowerCase().includes(search.toLowerCase());
        const matchesLGA = lgaFilter === "All" || pu.lga_name === lgaFilter;
        return matchesSearch && matchesLGA;
    });

    const kpiCards = [
        { label: "Polling Units", value: totalPUs.toLocaleString(), sub: "In constituency", icon: Building2, color: "text-apc-red", bg: "bg-red-50", border: "border-l-apc-red" },
        { label: "Registered Voters", value: totalVoters.toLocaleString(), sub: "INEC registered", icon: Vote, color: "text-purple-600", bg: "bg-purple-50", border: "border-l-purple-500" },
        { label: "App Members", value: totalAppMembers.toLocaleString(), sub: "Registered via app", icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-l-blue-600" },
        { label: "Verified Members", value: totalVerified.toLocaleString(), sub: "Field confirmed", icon: Shield, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-l-indigo-500" },
        { label: "Pending Verification", value: totalPending.toLocaleString(), sub: "Awaiting visit", icon: Activity, color: "text-orange-600", bg: "bg-orange-50", border: "border-l-orange-500" },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-5 animate-fade-in">

                {/* ── HERO BANNER ── */}
                <div className="relative overflow-hidden rounded-xl shadow-2xl">
                    <div className="flex h-2">
                        <div className="flex-1 bg-apc-green" />
                        <div className="flex-1 bg-white border-y border-gray-200" />
                        <div className="flex-1 bg-apc-red" />
                    </div>

                    <div className="relative bg-gradient-to-br from-[#7B0011] via-[#5a000d] to-[#3d0008] p-6 sm:p-8">
                        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-shrink-0 hidden sm:flex w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/10 items-center justify-center border-2 border-white/20 shadow-lg overflow-hidden">
                                {rep.photo_url ? (
                                    <img 
                                        src={rep.photo_url} 
                                        alt={partyId === "apc" ? rep.rep_name : rep.constituency_name} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            // Fallback to placeholder if image not found
                                            e.currentTarget.src = "/placeholder.svg";
                                        }}
                                    />
                                ) : (
                                    <APCFlag size="sm" variant="full" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                                    {rep.constituency_name}
                                </h1>
                                <p className="text-white/80 font-medium text-lg mt-1">
                                    {partyId === "apc" 
                                        ? rep.rep_name 
                                        : `${rep.lga_list.join(", ")} Local Government${rep.lga_list.length > 1 ? "s" : ""}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex h-2">
                        <div className="flex-1 bg-apc-green" />
                        <div className="flex-1 bg-white border-y border-gray-200" />
                        <div className="flex-1 bg-apc-red" />
                    </div>
                </div>

                {/* ── INTELLIGENCE OVERVIEW ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Victory Projection Gauge */}
                    <Card className="lg:col-span-1 border-0 shadow-xl bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-apc-red" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-apc-red">
                                <Activity className="h-4 w-4" />
                                Victory Projection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <VictoryGauge 
                                percentage={overallCoverage}
                                target={totalTarget}
                                current={totalAppMembers}
                                verified={totalVerified}
                                description="Verified Coverage"
                                label={`${rep.constituency_name} Progress`}
                            />
                        </CardContent>
                    </Card>

                    {/* Member Growth Trend */}
                    <Card className="lg:col-span-2 border-0 shadow-xl bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                Registration Momentum
                            </CardTitle>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-widest">
                                Last 12 Weeks
                            </span>
                        </CardHeader>
                        <CardContent>
                            <RegistrationTrendChart 
                                data={trendData || []} 
                                color="#8B0000"
                                height={220}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* ── KPI CARDS ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {kpiCards.map(({ label, value, sub, icon: Icon, color, bg, border }, i) => (
                        <motion.div key={label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                            <Card className={`border-l-4 ${border} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3 sm:p-4">
                                    <CardTitle className="text-[11px] sm:text-xs font-semibold text-gray-600">{label}</CardTitle>
                                    <div className={`rounded-full ${bg} p-1.5 sm:p-2`}>
                                        <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 sm:p-4 pt-0">
                                    <div className={`text-2xl sm:text-3xl font-extrabold ${color} tracking-tight`}>{value}</div>
                                    <p className={`text-[10px] sm:text-xs ${color} mt-0.5 font-medium opacity-80`}>{sub}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* ── GRANULAR DEMOGRAPHICS ── */}
                <GranularDemographics
                    lgas={rep.lga_list}
                    totalRegisteredVoters={totalVoters}
                />

                {/* ── LGA BREAKDOWN ── */}
                {constData?.lgaBreakdown && constData.lgaBreakdown.length > 0 && (
                    <Card className="border-0 shadow-md overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-apc-green via-white to-apc-red" />
                        <CardHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-apc-red" />
                                <div>
                                    <CardTitle className="text-base sm:text-lg font-bold">Constituency Breakdown by LGA</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">Registered voters and polling units per LGA</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <div className={`grid gap-3 ${constData.lgaBreakdown.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
                                {constData.lgaBreakdown.map((lga, i) => (
                                    <motion.div
                                        key={lga.lga_name}
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                        className="group bg-white rounded-xl border border-gray-100 hover:border-apc-red/30 p-4 shadow-sm hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-bold text-sm text-gray-800">{lga.lga_name} LGA</h3>
                                                <span className="text-[10px] text-apc-red font-semibold uppercase tracking-wide">Local Government Area</span>
                                            </div>
                                            <div className="rounded-full bg-apc-red/10 p-1.5 group-hover:bg-apc-red/20 transition-colors">
                                                <MapPin className="h-3 w-3 text-apc-red" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                                                <div className="text-lg font-extrabold text-blue-700">{lga.app_members_total.toLocaleString()}</div>
                                                <div className="text-[10px] text-blue-500 font-medium">App Members</div>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-2.5 text-center">
                                                <div className="text-lg font-extrabold text-apc-red">{lga.app_members_verified.toLocaleString()}</div>
                                                <div className="text-[10px] text-apc-red font-medium">Verified</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mb-3 text-[10px] text-gray-500">
                                            <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                                                {lga.app_members_pending.toLocaleString()} Pending
                                            </span>
                                            <span className="font-medium">
                                                INEC: {lga.registered_voters.toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                                                <span className="font-medium">Coverage</span>
                                                <span className="font-bold text-gray-700">{lga.coverage_pct.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full bg-gradient-to-r from-apc-red to-red-400"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${lga.coverage_pct}%` }}
                                                    transition={{ duration: 1, ease: "easeOut", delay: i * 0.05 }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── POLLING UNITS TABLE ── */}
                <Card className="border-0 shadow-md overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-apc-green via-white to-apc-red" />
                    <CardHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-apc-red" />
                                <div>
                                    <CardTitle className="text-base sm:text-lg font-bold">Polling Units — {rep.constituency_name}</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">{filteredPUs.length} of {totalPUs} units shown</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {lgaCount > 1 && (
                                    <select
                                        value={lgaFilter}
                                        onChange={(e) => setLgaFilter(e.target.value)}
                                        className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-apc-red/20"
                                    >
                                        <option value="All">All LGAs</option>
                                        {(constData?.lgaBreakdown || []).map((l) => (
                                            <option key={l.lga_name} value={l.lga_name}>{l.lga_name}</option>
                                        ))}
                                    </select>
                                )}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search units..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-apc-red/20 w-44"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="text-xs font-semibold">#</TableHead>
                                        <TableHead className="text-xs font-semibold">Polling Unit</TableHead>
                                        <TableHead className="text-xs font-semibold">LGA</TableHead>
                                        <TableHead className="text-xs font-semibold hidden sm:table-cell">Ward</TableHead>
                                        <TableHead className="text-xs font-semibold">Reg. Voters</TableHead>
                                        <TableHead className="text-xs font-semibold hidden md:table-cell">Target</TableHead>
                                        <TableHead className="text-xs font-semibold">Coverage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {filteredPUs.slice(0, 200).map((pu: any, idx: number) => {
                                            const cov = pu.target_voters > 0
                                                ? Math.min((pu.registered_voters / pu.target_voters) * 100, 100)
                                                : 0;
                                            return (
                                                <TableRow key={pu.id} className="hover:bg-muted/20 transition-colors">
                                                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                                    <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] truncate">{pu.name}</TableCell>
                                                    <TableCell className="text-xs">
                                                        <span className="px-2 py-0.5 rounded-full bg-apc-red/10 text-apc-red font-medium text-[10px]">{pu.lga_name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell max-w-[120px] truncate">{pu.ward_name}</TableCell>
                                                    <TableCell className="font-bold text-blue-600 text-xs sm:text-sm">{(pu.registered_voters || 0).toLocaleString()}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{(pu.target_voters || 0).toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-14 sm:w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${cov}%` }}
                                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                                    className={`h-full ${cov >= 80 ? "bg-apc-green" : cov >= 50 ? "bg-blue-500" : "bg-orange-500"}`}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-foreground">{cov.toFixed(0)}%</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                            {filteredPUs.length > 200 && (
                                <div className="text-center py-4 text-sm text-muted-foreground bg-muted/10">
                                    Showing first 200 of {filteredPUs.length} results. Use filters to narrow down.
                                </div>
                            )}
                            {filteredPUs.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm">No polling units match your search</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ── RECENT MEMBERS TABLE ── */}
                <Card className="border-0 shadow-md overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-apc-green via-white to-apc-red" />
                    <CardHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                <div>
                                    <CardTitle className="text-base sm:text-lg font-bold">Recent Constituency Registrations</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">Latest 50 members joining the campaign in this constituency</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigate("/members")} className="text-xs">
                                View All Members
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                                <TabsTrigger value="overview">Constituency Overview</TabsTrigger>
                                <TabsTrigger value="support-groups">My Support Groups</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-5 mt-4">
                                {/* ── INTELLIGENCE OVERVIEW ── */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                    {/* Victory Projection Gauge */}
                                    <Card className="lg:col-span-1 border-0 shadow-xl bg-white overflow-hidden relative">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-apc-red" />
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-apc-red">
                                                <Activity className="h-4 w-4" />
                                                Victory Projection
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pb-4">
                                            <VictoryGauge 
                                                percentage={overallCoverage}
                                                target={totalTarget}
                                                current={totalAppMembers}
                                            />
                                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground font-semibold">Total Target</span>
                                                <span className="font-extrabold text-navy-deep">{totalTarget.toLocaleString()}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Granular Demographics (Youth vs Seniors) */}
                                    <Card className="lg:col-span-2 border-0 shadow-xl bg-white overflow-hidden relative">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-apc-green" />
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-apc-green">
                                                <Users className="h-4 w-4" />
                                                Granular Demographics (Youth vs Seniors)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pb-4">
                                            <GranularDemographics lgas={rep.lga_list} />
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* KPI Metrics Row */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    {kpiCards.map((card, idx) => {
                                        const Icon = card.icon;
                                        return (
                                            <Card key={idx} className={`bg-white border-0 border-l-4 ${card.border} shadow-lg transition-transform duration-300 hover:-translate-y-1`}>
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold text-muted-foreground">{card.label}</p>
                                                        <h3 className="text-xl sm:text-2xl font-black text-navy-deep">{card.value}</h3>
                                                        <p className="text-[10px] text-muted-foreground">{card.sub}</p>
                                                    </div>
                                                    <div className={`p-2 rounded-lg ${card.bg}`}>
                                                        <Icon className={`h-5 w-5 ${card.color}`} />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Charts / Trends */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                    <Card className="lg:col-span-2 border-0 shadow-xl bg-white p-5">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                            <div>
                                                <h3 className="text-sm font-bold text-navy-white flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-apc-green" />
                                                    Member Registration Trends
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">Daily growth analysis across LGAs</p>
                                            </div>
                                        </div>
                                        <div className="h-[280px]">
                                            <RegistrationTrendChart data={trendData || []} lgas={rep.lga_list} />
                                        </div>
                                    </Card>

                                    <Card className="lg:col-span-1 border-0 shadow-xl bg-white">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold text-apc-red flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                LGA Registration Coverage
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                                                {(constData?.lgaBreakdown || []).map((lga, idx) => (
                                                    <div key={idx} className="space-y-1.5">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="font-bold text-navy-deep">{lga.lga_name}</span>
                                                            <span className="font-semibold text-muted-foreground">
                                                                {lga.app_members_verified.toLocaleString()} / {lga.target_voters.toLocaleString()} ({Math.round(lga.coverage_pct)}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                            <div 
                                                                className="bg-apc-green h-1.5 rounded-full transition-all duration-500" 
                                                                style={{ width: `${lga.coverage_pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Polling Units & Members Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                    {/* Polling Unit Status Ledger */}
                                    <Card className="lg:col-span-2 border-0 shadow-xl bg-white">
                                        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-sm font-bold text-navy-deep flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-purple-600" />
                                                    Constituency Polling Units
                                                </CardTitle>
                                                <CardDescription className="text-xs">Browse coverage metrics per polling unit</CardDescription>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <div className="relative flex-1 sm:w-[200px]">
                                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search unit/ward..."
                                                        value={search}
                                                        onChange={(e) => setSearch(e.target.value)}
                                                        className="pl-8 h-9 text-xs w-full bg-muted/30 border-0 rounded-lg focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </div>
                                                <select
                                                    value={lgaFilter}
                                                    onChange={(e) => setLgaFilter(e.target.value)}
                                                    className="h-9 text-xs bg-muted/30 border-0 rounded-lg px-2 text-navy-deep font-medium"
                                                >
                                                    <option value="All">All LGAs</option>
                                                    {rep.lga_list.map((lga, idx) => (
                                                        <option key={idx} value={lga}>{lga}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/30">
                                                            <TableHead className="text-xs font-semibold">PU Details</TableHead>
                                                            <TableHead className="text-xs font-semibold">LGA / Ward</TableHead>
                                                            <TableHead className="text-xs font-semibold text-center">Voters</TableHead>
                                                            <TableHead className="text-xs font-semibold text-center">Target</TableHead>
                                                            <TableHead className="text-xs font-semibold text-center">Members</TableHead>
                                                            <TableHead className="text-xs font-semibold text-right">Coverage</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredPUs.length > 0 ? (
                                                            filteredPUs.slice(0, 100).map((pu: any) => {
                                                                const coverage = pu.target_voters > 0 
                                                                    ? Math.min((pu.verified_members / pu.target_voters) * 100, 100)
                                                                    : 0;
                                                                return (
                                                                    <TableRow key={pu.id} className="hover:bg-muted/20 transition-colors">
                                                                        <TableCell className="font-medium text-xs">
                                                                            <div className="flex flex-col">
                                                                                <span>{pu.name}</span>
                                                                                <span className="text-[10px] text-muted-foreground font-mono">{pu.code}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-semibold text-navy-deep">{pu.lga_name}</span>
                                                                                <span className="text-[10px] text-muted-foreground">{pu.ward_name}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-xs font-medium">{pu.registered_voters?.toLocaleString() || 0}</TableCell>
                                                                        <TableCell className="text-center text-xs text-muted-foreground font-medium">{pu.target_voters || 0}</TableCell>
                                                                        <TableCell className="text-center text-xs font-bold text-apc-green">{pu.verified_members || 0}</TableCell>
                                                                        <TableCell className="text-right text-xs font-extrabold">
                                                                            <span className={coverage >= 80 ? "text-green-600" : coverage >= 40 ? "text-orange-500" : "text-red-500"}>
                                                                                {Math.round(coverage)}%
                                                                            </span>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                                    No polling units matched search.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Recent Member Registrations */}
                                    <Card className="lg:col-span-1 border-0 shadow-xl bg-white">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold text-navy-deep flex items-center gap-2">
                                                <Star className="h-4 w-4 text-orange-500" />
                                                Recent Members
                                            </CardTitle>
                                            <CardDescription className="text-xs">Latest registrations in your constituency</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/30">
                                                            <TableHead className="text-xs font-semibold">Member Name</TableHead>
                                                            <TableHead className="text-xs font-semibold">LGA</TableHead>
                                                            <TableHead className="text-xs font-semibold hidden sm:table-cell">Ward</TableHead>
                                                            <TableHead className="text-xs font-semibold">Status</TableHead>
                                                            <TableHead className="text-xs font-semibold">Joined</TableHead>
                                                            <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(constData?.recentMembers || []).length > 0 ? (
                                                            constData?.recentMembers.map((member: any) => (
                                                                <TableRow key={member.id} className="hover:bg-muted/20 transition-colors">
                                                                    <TableCell className="font-medium text-xs sm:text-sm">
                                                                        <div className="flex flex-col">
                                                                            <span>{member.name}</span>
                                                                            <span className="text-[10px] text-muted-foreground">{member.phone || "No phone"}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        <span className="px-2 py-0.5 rounded-full bg-apc-red/10 text-apc-red font-medium text-[10px]">{member.lga}</span>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{member.ward}</TableCell>
                                                                    <TableCell>
                                                                        {member.is_verified ? (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-apc-green bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                                                                <Shield className="h-2 w-2" /> Verified
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                                                                <Activity className="h-2 w-2" /> Pending
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-[10px] text-muted-foreground">
                                                                        {new Date(member.created_at).toLocaleDateString()}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="sm" 
                                                                            className="h-8 w-8 p-0"
                                                                            onClick={() => navigate(`/members/detail?id=${member.id}`)}
                                                                        >
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                                    No members found in this constituency yet.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="support-groups" className="mt-4">
                                <CandidateSupportGroupsTab candidateId={rep.user_id} candidateRace="house_of_reps" />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="flex items-center justify-center gap-3 py-3 opacity-50">
                    <APCFlag size="sm" variant="horizontal" />
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FederalRepDashboard;
