"use client";
import { useSuperAdminStats } from "@/hooks/useSuperAdminStats";
import KPICard from "./KPICard";
import {
    Building2,
    Users,
    CalendarDays,
    MessageSquare,
    TrendingUp,
    Activity,
    ShieldAlert
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
    Bar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import RecentActivities from "./RecentActivities";
import { useParty } from "@/contexts/PartyContext";

const SuperAdminDashboard = () => {
    const { data, isLoading } = useSuperAdminStats();
    const { party } = useParty();
    const [c1, c2, c3] = [party.colors.swatches[0], party.colors.swatches[1] || "#FFFFFF", party.colors.swatches[2] || party.colors.swatches[0]];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-6">
                <div className="h-32 bg-muted/20 animate-pulse rounded-xl" />
                <div className="h-96 bg-muted/20 animate-pulse rounded-xl" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 text-center bg-muted/20 rounded-xl border border-destructive/20">
                <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load dashboard data</h3>
                <p className="text-muted-foreground">Please try refreshing the page.</p>
            </div>
        );
    }

    const { counts, charts } = data;

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
                        <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Welcome Back</h2>
                        <p className="text-white/80 max-w-xl">
                            Real-time command center for campaign operations, member mobilization, and strategic analytics.
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
                    change={`${counts.activeOrgs} active`}
                    changeType="positive"
                    icon={Building2}
                    variant="default"
                />
                <KPICard
                    title="Total Members"
                    value={counts.members}
                    change="+12% this month"
                    changeType="positive"
                    icon={Users}
                    variant="accent"
                />
                <KPICard
                    title="Global Activities"
                    value={counts.activities}
                    change="System wide"
                    changeType="neutral"
                    icon={CalendarDays}
                    variant="default"
                />
                <KPICard
                    title="Network Messages"
                    value={counts.messages}
                    change="Real-time volume"
                    changeType="neutral"
                    icon={MessageSquare}
                    variant="default"
                />
            </div>

            {/* 2. Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Member Growth Chart */}
                <Card className="lg:col-span-2 border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" style={{ color: '#009900' }} />
                                    Growth Trajectory
                                </CardTitle>
                                <CardDescription>New member registration trends (6 months)</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={charts.memberGrowth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            borderColor: "#009900",
                                            borderRadius: "8px"
                                        }}
                                        itemStyle={{ color: "hsl(var(--foreground))" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#009900"
                                        strokeWidth={3}
                                        dot={{ fill: "#009900", strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: "#E30613" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Volume Chart */}
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5" style={{ color: '#E30613' }} />
                            Activity Volume
                        </CardTitle>
                        <CardDescription>Daily campaign events (7 days)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.activityTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            borderColor: "#E30613",
                                            borderRadius: "8px"
                                        }}
                                    />
                                    <Bar
                                        dataKey="value"
                                        fill="#E30613"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Control Center Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <RecentActivities />
                </div>

                {/* Simplified Live Feed / System Health Placeholder */}
                <Card className="border-border/50 h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-success" />
                            System Status
                        </CardTitle>
                        <CardDescription>Real-time operational metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <span className="text-sm font-medium">Database Connection</span>
                                <span className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">OPTIMAL</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <span className="text-sm font-medium">API Latency</span>
                                <span className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">24ms</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <span className="text-sm font-medium">Active Sessions</span>
                                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ color: '#009900', backgroundColor: '#00990015' }}>
                                    {Math.floor(Math.random() * 20) + 1} users
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
