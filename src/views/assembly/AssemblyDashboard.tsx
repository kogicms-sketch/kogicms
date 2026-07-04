"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHouseAssemblyMember, useAssemblyLGAStats } from "@/hooks/useHouseAssemblyMember";
import { GranularDemographics } from "@/components/dashboard/GranularDemographics";
import { useJurisdictionTrends } from "@/hooks/useJurisdictionTrends";
import { VictoryGauge, RegistrationTrendChart } from "@/components/analytics/DashboardCharts";
import {
    MapPin, Building2, Users, Shield, Search, Star, Activity, TrendingUp,
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

const AssemblyDashboard = () => {
    const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
    const { data: member, isLoading: memberLoading } = useHouseAssemblyMember();
    const { data: stats, isLoading: statsLoading } = useAssemblyLGAStats();
    const { data: trendData, isLoading: trendLoading } = useJurisdictionTrends(member?.lga ? [member.lga] : []);
    const [search, setSearch] = useState("");
    const [wardFilter, setWardFilter] = useState("All");

    const isLoading = memberLoading || (!!member && (statsLoading || trendLoading));

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <div className="relative mx-auto w-16 h-16">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-apc-green/20 border-t-apc-green" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Shield className="h-6 w-6 text-apc-green" />
                            </div>
                        </div>
                        <p className="text-muted-foreground font-medium">Loading Assembly Dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!member) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Shield className="h-12 w-12 text-red-500 mx-auto" />
                        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                        <p className="text-muted-foreground">You are not registered as a House of Assembly Member.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const totalVoters = stats?.totalRegisteredVoters || 0;
    const totalPUs = stats?.totalPollingUnits || 0;
    const wardCount = stats?.totalWards || 0;
    
    // Calculate total targets from pollingUnits if target_voters exist
    const totalTarget = (stats?.pollingUnits || []).reduce((acc: number, pu: any) => acc + (pu.target_voters || 0), 0);
    const totalAppMembers = stats?.totalAppMembers || 0;
    const totalVerified = stats?.totalVerifiedMembers || 0;
    const totalPending = stats?.totalPendingMembers || 0;
    const overallCoverage = totalTarget > 0 ? Math.min((totalVerified / totalTarget) * 100, 100) : 0;

    const filteredPUs = (stats?.pollingUnits || []).filter((pu: any) => {
        const matchesSearch = pu.name?.toLowerCase().includes(search.toLowerCase()) ||
            pu.ward_name?.toLowerCase().includes(search.toLowerCase());
        const matchesWard = wardFilter === "All" || pu.ward_name === wardFilter;
        return matchesSearch && matchesWard;
    });

    const kpiCards = [
        { label: "Polling Units", value: totalPUs.toLocaleString(), sub: "In your LGA", icon: Building2, color: "text-apc-green", bg: "bg-apc-green/10", border: "border-l-apc-green" },
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

                    <div className="relative bg-gradient-to-br from-[#0B3D91] via-[#082966] to-[#041533] p-6 sm:p-8">
                        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-shrink-0 hidden sm:flex w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/10 items-center justify-center border-2 border-white/20 shadow-lg">
                                <APCFlag size="sm" variant="full" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                                    {member.lga} LGA
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex h-2">
                        <div className="flex-1 bg-apc-green" />
                        <div className="flex-1 bg-white border-y border-gray-200" />
                        <div className="flex-1 bg-apc-red" />
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="support-groups">My Support Groups</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-5 mt-4">
                        {/* ── INTELLIGENCE OVERVIEW ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Victory Projection Gauge */}
                            <Card className="lg:col-span-1 border-0 shadow-xl bg-white overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#0B3D91]" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0B3D91]">
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
                                        label={`${member.lga} Progress`}
                                    />
                                </CardContent>
                            </Card>

                            {/* Member Growth Trend */}
                            <Card className="lg:col-span-2 border-0 shadow-xl bg-white overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-apc-green" />
                                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-apc-green">
                                        <TrendingUp className="h-4 w-4" />
                                        Registration Momentum
                                    </CardTitle>
                                    <span className="text-[10px] font-bold text-apc-green bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest">
                                        Last 12 Weeks
                                    </span>
                                </CardHeader>
                                <CardContent>
                                    <RegistrationTrendChart 
                                        data={trendData || []} 
                                        color="#006600"
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
                            lga={member.lga}
                            totalRegisteredVoters={totalVoters}
                        />

                        {/* ── WARD BREAKDOWN ── */}
                        {stats?.wardPerformance && stats.wardPerformance.length > 0 && (
                            <Card className="border-0 shadow-md flex flex-col">
                                <div className="h-1 bg-gradient-to-r from-apc-green via-white to-apc-red" />
                                <CardHeader className="p-4 sm:p-5 border-b border-gray-100 flex-none pb-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-apc-green" />
                                        <div>
                                            <CardTitle className="text-base sm:text-lg font-bold">LGA Breakdown by Ward</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">Registered voters and polling units per Ward</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 relative min-h-[300px]">
                                    <div className="absolute inset-0 overflow-y-auto w-full p-4 sm:p-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {stats.wardPerformance.map((ward, i) => (
                                                <motion.div
                                                    key={ward.ward}
                                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                                    className="group bg-white rounded-xl border border-gray-100 hover:border-apc-green/30 p-3 shadow-sm hover:shadow-md transition-all duration-200"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{ward.ward} Ward</h3>
                                                        </div>
                                                        <div className="rounded-full bg-apc-green/10 p-1 group-hover:bg-apc-green/20 transition-colors flex-shrink-0">
                                                            <MapPin className="h-3 w-3 text-apc-green" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                                                            <div className="text-base font-extrabold text-blue-700">{ward.pollingUnits}</div>
                                                            <div className="text-[10px] text-blue-500 font-medium leading-tight">Polling Units</div>
                                                        </div>
                                                        <div className="bg-green-50 rounded-lg p-2 text-center">
                                                            <div className="text-base font-extrabold text-apc-green">{ward.registeredVoters.toLocaleString()}</div>
                                                            <div className="text-[10px] text-apc-green font-medium leading-tight">Reg. Voters</div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* ── POLLING UNITS TABLE ── */}
                        <Card className="border-0 shadow-md flex flex-col min-h-[400px]">
                            <div className="h-1 bg-gradient-to-r from-apc-green via-white to-apc-red" />
                            <CardHeader className="p-4 sm:p-5 border-b border-gray-100 flex-none pb-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-apc-green" />
                                        <div>
                                            <CardTitle className="text-base sm:text-lg font-bold">Polling Units — {member.lga}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">{filteredPUs.length} of {totalPUs} units shown</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {stats?.wardPerformance && stats.wardPerformance.length > 0 && (
                                            <select
                                                value={wardFilter}
                                                onChange={(e) => setWardFilter(e.target.value)}
                                                className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-apc-green/20"
                                            >
                                                <option value="All">All Wards</option>
                                                {(stats.wardPerformance || []).map((w) => (
                                                    <option key={w.ward} value={w.ward}>{w.ward}</option>
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
                                                className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-apc-green/20 w-44"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 relative">
                                <div className="absolute inset-0 overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead className="text-xs font-semibold w-[50px]">#</TableHead>
                                                <TableHead className="text-xs font-semibold">Polling Unit</TableHead>
                                                <TableHead className="text-xs font-semibold">Ward</TableHead>
                                                <TableHead className="text-xs font-semibold text-right">Reg. Voters</TableHead>
                                                {totalTarget > 0 && (
                                                    <>
                                                        <TableHead className="text-xs font-semibold text-right hidden sm:table-cell">Target</TableHead>
                                                        <TableHead className="text-xs font-semibold w-[120px]">Coverage</TableHead>
                                                    </>
                                                )}
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
                                                            <TableCell className="font-medium text-xs sm:text-sm max-w-[200px] sm:max-w-[300px] truncate">{pu.name}</TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/70 font-medium text-[10px]">{pu.ward_name}</span>
                                                            </TableCell>
                                                            <TableCell className="font-bold text-apc-green text-xs sm:text-sm text-right">{(pu.registered_voters || 0).toLocaleString()}</TableCell>
                                                            
                                                            {totalTarget > 0 && (
                                                                <>
                                                                    <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">{(pu.target_voters || 0).toLocaleString()}</TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                                                                </>
                                                            )}
                                                        </TableRow>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </TableBody>
                                    </Table>
                                    {filteredPUs.length > 200 && (
                                        <div className="text-center py-4 text-sm text-muted-foreground bg-muted/10">
                                            Showing first 200 of {filteredPUs.length} results.
                                        </div>
                                    )}
                                    {filteredPUs.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                            <p className="text-sm">No polling units match your filter</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── RECENT MEMBERS TABLE ── */}
                        <Card className="border-0 shadow-md overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-apc-green via-white to-apc-red" />
                            <CardHeader className="p-4 sm:p-5 border-b border-gray-100 flex-none pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        <div>
                                            <CardTitle className="text-base sm:text-lg font-bold">Recent Ward Registrations</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">Latest 50 members joining in your jurisdiction</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => navigate("/members")} className="text-xs">
                                        View All
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead className="text-xs font-semibold">Member</TableHead>
                                                <TableHead className="text-xs font-semibold">Ward</TableHead>
                                                <TableHead className="text-xs font-semibold">Status</TableHead>
                                                <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(stats?.recentMembers || []).length > 0 ? (
                                                stats?.recentMembers.map((m: any) => (
                                                    <TableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                                                        <TableCell className="font-medium text-xs sm:text-sm">
                                                            <div className="flex flex-col">
                                                                <span>{m.name}</span>
                                                                <span className="text-[10px] text-muted-foreground">{m.phone || "No phone"}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium text-[10px]">{m.ward}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            {m.is_verified ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-apc-green bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                                                    <Shield className="h-2 w-2" /> Verified
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                                                    <Activity className="h-2 w-2" /> Pending
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => navigate(`/members/detail?id=${m.id}`)}
                                                            >
                                                                <ChevronRight className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                        No members found yet.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="support-groups" className="mt-4">
                        <CandidateSupportGroupsTab candidateId={member.user_id} candidateRace="state_assembly" />
                    </TabsContent>
                </Tabs>

                {/* Footer */}
                <div className="flex items-center justify-center gap-3 py-3 opacity-50">
                    <APCFlag size="sm" variant="horizontal" />
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AssemblyDashboard;
