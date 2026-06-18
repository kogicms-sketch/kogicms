"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCouncillor, useCouncillorWardData } from "@/hooks/useCouncillors";
import { GranularDemographics } from "@/components/dashboard/GranularDemographics";
import {
    MapPin, Building2, Users, Activity, ShieldCheck, Clock,
    Shield, Star, Vote, TrendingUp, ChevronRight, Navigation
} from "lucide-react";
import { motion } from "framer-motion";
import { APCFlag } from "@/components/branding/APCFlag";
import { VictoryGauge } from "@/components/analytics/DashboardCharts";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RecentAgentActivity = ({ lga, ward }: { lga: string; ward: string }) => {
    const { data: locations = [], isLoading } = useQuery({
        queryKey: ["ward-recent-locations", lga, ward],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("agent_locations")
                .select("*")
                .eq("lga", lga)
                .eq("ward", ward)
                .order("created_at", { ascending: false })
                .limit(5);

            if (error) throw error;
            return data;
        },
        enabled: !!lga && !!ward,
    });

    return (
        <Card className="border-0 shadow-md overflow-hidden flex flex-col h-[480px]">
            <div className="h-1 bg-purple-600" />
            <CardHeader className="p-4 border-b border-gray-100">
                <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-600" />
                        Live Field Activity
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        Recent coordinates reported by PU Agents
                    </p>
                </div>
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-y-auto divide-y divide-gray-100">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        Loading activity feed...
                    </div>
                ) : locations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground opacity-60">
                        <MapPin className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-xs font-semibold">No recent activity</p>
                        <p className="text-[10px] mt-0.5">Coordinates appear when agents open the app</p>
                    </div>
                ) : (
                    locations.map((loc: any) => (
                        <div key={loc.id} className="py-3 flex flex-col gap-1 first:pt-1 last:pb-1">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-xs text-gray-800">{loc.agent_name}</span>
                                <span className="text-[9px] text-purple-600 bg-purple-50 font-bold px-1.5 py-0.5 rounded-full">
                                    Active
                                </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                {loc.polling_unit_name}
                            </span>
                            <div className="flex items-center justify-between mt-1 text-[9px] text-gray-400">
                                <span className="flex items-center gap-0.5 font-mono">
                                    <Navigation className="h-2.5 w-2.5" />
                                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                                </span>
                                <span>{new Date(loc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
};

const CouncillorDashboard = () => {
    const { data: councillor, isLoading: councillorLoading } = useCouncillor();
    const { data: wardData, isLoading: wardLoading } = useCouncillorWardData();

    if (councillorLoading || wardLoading) {
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
                        <p className="text-muted-foreground font-medium">Loading Ward Dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!councillor) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Shield className="h-12 w-12 text-red-500 mx-auto" />
                        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                        <p className="text-muted-foreground">You are not registered as a Councillor.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Computed values
    const totalRegisteredVoters = (wardData?.pollingUnits || []).reduce(
        (sum: number, pu: any) => sum + (pu.registered_voters || 0), 0
    );
    const totalVerified   = wardData?.verifiedMembers || 0;
    const totalMembers    = wardData?.totalMembers || 0;
    const totalPending    = wardData?.pendingVerification || 0;
    const totalPUs        = wardData?.totalPollingUnits || 0;

    // Target = total registered voters in the ward (same logic as other dashboards)
    const victoryPct = totalRegisteredVoters > 0
        ? Math.min((totalVerified / totalRegisteredVoters) * 100, 100)
        : 0;

    const kpiCards = [
        {
            label: "Polling Units",
            value: totalPUs.toLocaleString(),
            sub: "In your ward",
            icon: Building2,
            color: "text-apc-green",
            bg: "bg-apc-green/10",
            border: "border-l-apc-green",
        },
        {
            label: "Registered Voters",
            value: totalRegisteredVoters.toLocaleString(),
            sub: "INEC registered",
            icon: Vote,
            color: "text-purple-600",
            bg: "bg-purple-50",
            border: "border-l-purple-500",
        },
        {
            label: "App Members",
            value: totalMembers.toLocaleString(),
            sub: "Registered via app",
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-l-blue-600",
        },
        {
            label: "Verified",
            value: totalVerified.toLocaleString(),
            sub: "Field confirmed",
            icon: ShieldCheck,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-l-indigo-500",
        },
        {
            label: "Pending",
            value: totalPending.toLocaleString(),
            sub: "Awaiting visit",
            icon: Clock,
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-l-orange-500",
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-5 animate-fade-in">

                {/* ── HERO BANNER ── */}
                <div className="relative overflow-hidden rounded-xl shadow-2xl">
                    {/* APC tri-color stripe */}
                    <div className="flex h-2">
                        <div className="flex-1 bg-apc-green" />
                        <div className="flex-1 bg-white border-y border-gray-200" />
                        <div className="flex-1 bg-apc-red" />
                    </div>

                    <div className="relative bg-gradient-to-br from-[#006600] via-[#004d00] to-[#003300] p-6 sm:p-8">
                        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-shrink-0 hidden sm:flex w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/10 items-center justify-center border-2 border-white/20 shadow-lg">
                                <APCFlag size="sm" variant="full" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                                    {wardData?.lga || councillor.lga} LGA
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

                {/* ── INTELLIGENCE OVERVIEW ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Victory Gauge */}
                    <Card className="lg:col-span-1 border-0 shadow-xl bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-apc-green" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Activity className="h-4 w-4 text-apc-green" />
                                Victory Projection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <VictoryGauge
                                percentage={victoryPct}
                                target={totalRegisteredVoters}
                                current={totalMembers}
                                verified={totalVerified}
                                description="Verified Coverage"
                                label={`${wardData?.ward || councillor.ward} Progress`}
                            />
                        </CardContent>
                    </Card>

                    {/* Ward Performance panel */}
                    <Card className="lg:col-span-2 border-0 shadow-xl bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                Ward Performance Summary
                            </CardTitle>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-widest">
                                {wardData?.ward}
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Mobilization rate */}
                                <div className="rounded-xl bg-gradient-to-br from-apc-green/5 to-green-50 border border-apc-green/20 p-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Mobilization Rate</p>
                                    <p className="text-3xl font-black text-apc-green leading-none">
                                        {totalRegisteredVoters > 0
                                            ? ((totalMembers / totalRegisteredVoters) * 100).toFixed(1)
                                            : "0.0"}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {totalMembers.toLocaleString()} members of {totalRegisteredVoters.toLocaleString()} voters
                                    </p>
                                    <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-apc-green rounded-full"
                                            style={{ width: `${totalRegisteredVoters > 0 ? Math.min((totalMembers / totalRegisteredVoters) * 100, 100) : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Verification rate */}
                                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 p-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Verification Rate</p>
                                    <p className="text-3xl font-black text-indigo-600 leading-none">
                                        {totalMembers > 0
                                            ? ((totalVerified / totalMembers) * 100).toFixed(1)
                                            : "0.0"}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {totalVerified.toLocaleString()} verified of {totalMembers.toLocaleString()} registered
                                    </p>
                                    <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${totalMembers > 0 ? Math.min((totalVerified / totalMembers) * 100, 100) : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Pending breakdown */}
                                <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pending Action</p>
                                    <p className="text-3xl font-black text-orange-600 leading-none">
                                        {totalPending.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Members awaiting field verification</p>
                                    <div className="mt-2 flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-orange-400" />
                                        <span className="text-[10px] text-orange-600 font-semibold">Requires attention</span>
                                    </div>
                                </div>

                                {/* Polling units */}
                                <div className="rounded-xl bg-gradient-to-br from-apc-green/5 to-teal-50 border border-teal-200 p-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Polling Units</p>
                                    <p className="text-3xl font-black text-teal-700 leading-none">
                                        {totalPUs.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        ~{totalPUs > 0 ? Math.round(totalRegisteredVoters / totalPUs) : 0} avg. voters per unit
                                    </p>
                                    <div className="mt-2 flex items-center gap-1">
                                        <Building2 className="h-3 w-3 text-teal-500" />
                                        <span className="text-[10px] text-teal-600 font-semibold">Active polling units</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── KPI CARDS ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {kpiCards.map(({ label, value, sub, icon: Icon, color, bg, border }, i) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                        >
                            <Card className={`border-l-4 ${border} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3 sm:p-4">
                                    <CardTitle className="text-[11px] sm:text-xs font-semibold text-gray-600 leading-tight">{label}</CardTitle>
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
                    lga={councillor.lga}
                    ward={councillor.ward}
                    totalRegisteredVoters={totalRegisteredVoters}
                />

                {/* ── POLLING UNITS & FIELD ACTIVITY GRID ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                        <Card className="border-0 shadow-md overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-apc-green via-white to-apc-red" />
                            <CardHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-apc-green" />
                                        <div>
                                            <CardTitle className="text-base sm:text-lg font-bold">
                                                Polling Units — {wardData?.ward}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Registration coverage per polling unit
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link href="/polling-units-reports">
                                            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold cursor-pointer">
                                                <Navigation className="h-3.5 w-3.5" />
                                                <span>Agent Reports</span>
                                            </Button>
                                        </Link>
                                        <span className="hidden sm:inline-flex items-center gap-1.5 bg-apc-green/10 text-apc-green text-xs font-bold px-3 py-1.5 rounded-full">
                                            <MapPin className="h-3 w-3" />
                                            {totalPUs} Units
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {wardData?.pollingUnits && wardData.pollingUnits.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                                    <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-4 sm:pl-6">Polling Unit</TableHead>
                                                    <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Code</TableHead>
                                                    <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Registered</TableHead>
                                                    <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Verified</TableHead>
                                                    <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Status</TableHead>
                                                    <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Coverage</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {wardData.pollingUnits.map((pu: any, idx: number) => {
                                                    const coverage = pu.registered_voters > 0
                                                        ? ((pu.verified_members || 0) / pu.registered_voters * 100)
                                                        : 0;
                                                    const coverageColor = coverage >= 80 ? "bg-apc-green" :
                                                        coverage >= 50 ? "bg-blue-500" :
                                                            coverage >= 20 ? "bg-orange-500" : "bg-red-500";
                                                    const badgeStyle = pu.status === "complete" ? "bg-green-100 text-green-800" :
                                                        pu.status === "ready" ? "bg-blue-100 text-blue-800" :
                                                            pu.status === "active" ? "bg-orange-100 text-orange-800" :
                                                                "bg-gray-100 text-gray-600";

                                                    return (
                                                        <motion.tr
                                                            key={pu.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.04 }}
                                                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                                                        >
                                                            <TableCell className="pl-4 sm:pl-6 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-apc-green flex-shrink-0" />
                                                                    <span className="font-semibold text-xs sm:text-sm text-gray-800">{pu.name}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden sm:table-cell">
                                                                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                                    {pu.code || "—"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-sm font-semibold text-gray-700">
                                                                {(pu.registered_voters || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="font-bold text-apc-green text-sm">
                                                                {(pu.verified_members || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="hidden sm:table-cell">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                                                    {pu.status || "forming"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2 min-w-[80px]">
                                                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${Math.min(coverage, 100)}%` }}
                                                                            transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.04 }}
                                                                            className={`h-full rounded-full ${coverageColor}`}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[11px] font-extrabold text-gray-700 w-8 text-right">
                                                                        {coverage.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                        </motion.tr>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center py-16 bg-gray-50">
                                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                            <MapPin className="h-7 w-7 text-gray-400" />
                                        </div>
                                        <p className="text-muted-foreground text-sm font-medium">No polling units found in your ward</p>
                                        <p className="text-xs text-gray-400 mt-1">Data will appear here once assigned</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <RecentAgentActivity 
                            lga={wardData?.lga || councillor.lga} 
                            ward={wardData?.ward || councillor.ward} 
                        />
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default CouncillorDashboard;
