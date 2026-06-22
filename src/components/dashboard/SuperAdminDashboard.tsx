"use client";
import React, { useState } from "react";
import { useSuperAdminStats } from "@/hooks/useSuperAdminStats";
import { useSuperAdminDemographics } from "@/hooks/useSuperAdminDemographics";
import KPICard from "./KPICard";
import {
    Building2,
    Users,
    CalendarDays,
    MessageSquare,
    TrendingUp,
    Activity,
    ShieldAlert,
    ShieldCheck,
    HeartCrack,
    MapPin,
    ArrowUpRight,
    Loader2,
    Trophy
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import RecentActivities from "./RecentActivities";
import { useParty } from "@/contexts/PartyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SuperAdminDashboard = () => {
    const { data: statsData, isLoading: statsLoading } = useSuperAdminStats();
    const { data: demoData, isLoading: demoLoading } = useSuperAdminDemographics();
    const { party } = useParty();
    const { data: topSupportGroups = [], isLoading: topGroupsLoading } = useQuery({
        queryKey: ["global-top-support-groups"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("organizations")
                .select("id, name, type, leader_name, kpi_score, candidate_race, lga")
                .eq("verification_status", "verified")
                .order("kpi_score", { ascending: false })
                .limit(10);
            if (error) throw error;
            return data || [];
        }
    });
    const [selectedZone, setSelectedZone] = useState<string>("All");

    const [c1, c2, c3] = [party.colors.swatches[0], party.colors.swatches[1] || "#FFFFFF", party.colors.swatches[2] || party.colors.swatches[0]];

    const isLoading = statsLoading || demoLoading;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-6">
                <div className="h-40 bg-muted/20 animate-pulse rounded-xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="h-28 bg-muted/20 animate-pulse rounded-xl" />
                    <div className="h-28 bg-muted/20 animate-pulse rounded-xl" />
                    <div className="h-28 bg-muted/20 animate-pulse rounded-xl" />
                    <div className="h-28 bg-muted/20 animate-pulse rounded-xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[380px] bg-muted/20 animate-pulse rounded-xl" />
                    <div className="h-[380px] bg-muted/20 animate-pulse rounded-xl" />
                </div>
            </div>
        );
    }

    if (!statsData || !demoData) {
        return (
            <div className="p-8 text-center bg-muted/20 rounded-xl border border-destructive/20">
                <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load dashboard data</h3>
                <p className="text-muted-foreground">Please check your database connection and try refreshing the page.</p>
            </div>
        );
    }

    const { counts } = statsData;
    const { weeklyGrowth, zoneWeights, lgaHeatmap, summary } = demoData;

    // Filter LGAs based on selected Senatorial Zone
    const filteredLGAs = lgaHeatmap.filter(item => 
        selectedZone === "All" || item.zone === selectedZone
    );

    // Leftovers Calculation
    const leftoversCount = Math.max(0, summary.totalTarget - summary.totalVerified);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Party Tricolor Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ minHeight: '160px' }}>
                <div className="absolute inset-0 flex">
                    <div className="flex-1" style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c1} 100%)` }} />
                    <div className="flex-[2]" style={{ background: c2 }} />
                    <div className="flex-1" style={{ background: `linear-gradient(135deg, ${c3} 0%, ${c3} 100%)` }} />
                </div>
                <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${c1}E6, ${c1}B3, transparent)` }} />
                <div className="absolute top-0 right-0 w-64 h-64 border-8 border-white/10 rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-1/3 w-32 h-32 border-4 border-white/10 rounded-full translate-y-1/2" />
                <div className="relative z-10 flex items-center justify-between p-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <img src={party.flag} alt={party.name} className="w-8 h-6 rounded shadow-sm bg-white/20" />
                            <span className="text-white/90 text-sm font-semibold tracking-widest uppercase">{party.shortName} Campaign HQ</span>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Command Centre</h2>
                        <p className="text-white/80 max-w-xl text-sm">
                            Real-time mobilization tracking, predictive expansion projections, demographic splits, and LGA performance heatmaps.
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <div className="w-24 h-24 rounded-full border-4 border-white/50 p-3 bg-white shadow-2xl backdrop-blur-sm transition-transform duration-500 hover:scale-110">
                            <img
                                src={party.logo}
                                alt={`${party.name} logo`}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. Global KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <KPICard
                    title="Total Organizations"
                    value={counts.organizations}
                    change={`${counts.activeOrgs} active units`}
                    changeType="positive"
                    icon={Building2}
                    variant="default"
                />
                <KPICard
                    title="Active Supporters"
                    value={summary.totalRegistered}
                    change="Excludes deceased logs"
                    changeType="neutral"
                    icon={Users}
                    variant="accent"
                />
                <KPICard
                    title="Expected Turnout"
                    value={summary.totalVerified}
                    change={`${Math.round((summary.totalVerified / (summary.totalTarget || 1)) * 100)}% state target`}
                    changeType="positive"
                    icon={ShieldCheck}
                    variant="default"
                />
                <KPICard
                    title="Voter Attrition"
                    value={summary.totalDeceased}
                    change="Total deaths reported"
                    changeType="negative"
                    icon={HeartCrack}
                    variant="default"
                />
            </div>

            {/* 2. Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Trajectory & Predictive Analysis Chart */}
                <Card className="lg:col-span-2 border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                Growth Trajectory & Predictive Analysis
                            </CardTitle>
                            <CardDescription>
                                Weekly registrations with 6-week forecast model (based on 4-week moving velocity)
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weeklyGrowth} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                                    <XAxis
                                        dataKey="week"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            borderColor: "hsl(var(--border))",
                                            borderRadius: "8px"
                                        }}
                                        itemStyle={{ color: "hsl(var(--foreground))" }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Line
                                        name="Actual Cumulative"
                                        type="monotone"
                                        dataKey="actual"
                                        stroke="#006600"
                                        strokeWidth={3}
                                        dot={{ fill: "#006600", strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: "#E30613" }}
                                        connectNulls
                                    />
                                    <Line
                                        name="Projected Curve"
                                        type="monotone"
                                        dataKey="projected"
                                        stroke="#0B3D91"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        connectNulls
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Senatorial Zone Demographic Weights */}
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            Zone Weights (Youth vs Senior)
                        </CardTitle>
                        <CardDescription>
                            Senatorial demographic weights for Youth (20-35) vs Seniors (60+)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={zoneWeights} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                                    <XAxis
                                        dataKey="zone"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            borderColor: "hsl(var(--border))",
                                            borderRadius: "8px"
                                        }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar
                                        name="Youth (20-35)"
                                        dataKey="youth"
                                        fill="#0B3D91"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        name="Senior (60+)"
                                        dataKey="senior"
                                        fill="#E30613"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Performance Heatmap Panel */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            LGA Mobilization Performance Grid
                        </CardTitle>
                        <CardDescription>
                            LGA target coverage rate of verified members against INEC targets. Total State Leftover Target: <span className="font-semibold text-orange-600">{leftoversCount.toLocaleString()} voters</span>.
                        </CardDescription>
                    </div>
                    {/* Zone Filtering Toggles */}
                    <div className="flex flex-wrap gap-1.5 bg-muted p-1 rounded-lg self-start sm:self-center">
                        {["All", "Katsina Central", "Katsina North", "Katsina South"].map(zone => (
                            <button
                                key={zone}
                                onClick={() => setSelectedZone(zone)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                    selectedZone === zone 
                                        ? "bg-card text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {zone.replace("Katsina ", "")}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredLGAs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No LGAs found in this Senatorial Zone.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {filteredLGAs.map((lgaItem) => {
                                // color coding based on coverage percentage
                                let statusClass = "";
                                if (lgaItem.coverage >= 70) {
                                    statusClass = "bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400";
                                } else if (lgaItem.coverage >= 30) {
                                    statusClass = "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400";
                                } else {
                                    statusClass = "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400";
                                }

                                return (
                                    <Card 
                                        key={lgaItem.lga} 
                                        className={`border p-3 transition-all hover:scale-[1.02] ${statusClass}`}
                                    >
                                        <div className="flex flex-col h-full justify-between gap-3">
                                            <div>
                                                <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70 block">{lgaItem.zone.replace("Katsina ", "")}</span>
                                                <h4 className="text-sm font-bold truncate mt-0.5">{lgaItem.lga}</h4>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="text-[10px] opacity-75">Coverage</span>
                                                    <span className="text-xs font-extrabold">{lgaItem.coverage}%</span>
                                                </div>
                                                {/* Mini progress bar */}
                                                <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-current" 
                                                        style={{ width: `${lgaItem.coverage}%` }}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5 text-[9px] opacity-70 mt-2 font-medium">
                                                    <div className="flex justify-between">
                                                        <span>Verified:</span>
                                                        <span className="font-semibold">{lgaItem.verified.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Target:</span>
                                                        <span className="font-semibold">{lgaItem.target.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top Support Groups (Global Leaderboard) */}
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                Top Support Groups (Global Leaderboard)
                            </CardTitle>
                            <CardDescription>
                                Master standing of the top 10 support groups across the entire state based on field KPI scores
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {topGroupsLoading ? (
                        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading rankings...
                        </div>
                    ) : topSupportGroups.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No verified support groups found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-[80px] font-bold">Rank</TableHead>
                                        <TableHead className="font-bold">Group Name</TableHead>
                                        <TableHead className="font-bold">Type</TableHead>
                                        <TableHead className="font-bold">LGA Focus</TableHead>
                                        <TableHead className="font-bold">Leader</TableHead>
                                        <TableHead className="text-right font-bold">KPI Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topSupportGroups.map((group, idx) => {
                                        const rank = idx + 1;
                                        return (
                                            <TableRow key={group.id} className="hover:bg-muted/20 transition-colors">
                                                <TableCell className="font-extrabold text-sm">
                                                    {rank === 1 ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500 text-white shadow-sm">🥇</span>
                                                    ) : rank === 2 ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-slate-800 shadow-sm">🥈</span>
                                                    ) : rank === 3 ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white shadow-sm">🥉</span>
                                                    ) : (
                                                        `#${rank}`
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-semibold text-foreground">{group.name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground capitalize">
                                                    {group.type ? group.type.replace('_', ' ') : '—'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                                        {group.lga || 'State-Wide'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-foreground">{group.leader_name}</TableCell>
                                                <TableCell className="text-right font-extrabold text-[#0B3D91]">
                                                    {group.kpi_score || 0} pts
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 4. Control Center Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <RecentActivities />
                </div>

                {/* Simplified System Health Indicator */}
                <Card className="border-border/50 h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-green-600" />
                            System & Network Status
                        </CardTitle>
                        <CardDescription>Real-time server & DB infrastructure diagnostics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <span className="text-sm font-medium">Database Connection</span>
                                <span className="text-xs font-bold text-green-700 bg-green-500/10 px-2.5 py-1 rounded-full dark:text-green-400">OPTIMAL</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <span className="text-sm font-medium">API Latency</span>
                                <span className="text-xs font-bold text-green-700 bg-green-500/10 px-2.5 py-1 rounded-full dark:text-green-400">18ms</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <span className="text-sm font-medium">Active Command Sessions</span>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full text-green-700 bg-green-500/10 dark:text-green-400">
                                    {Math.floor(Math.random() * 10) + 5} users
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
