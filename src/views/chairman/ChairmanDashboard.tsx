"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChairman, useChairmanDashboardStats } from "@/hooks/useChairmen";
import { GranularDemographics } from "@/components/dashboard/GranularDemographics";
import { Users, MapPin, Plus, Building2, UserCheck, Globe, TrendingUp, Shield, ChevronRight, Star, ShieldCheck, Clock, Vote, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from "react";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useParty } from "@/contexts/PartyContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidateSupportGroupsTab } from "@/components/support-groups/CandidateSupportGroupsTab";

const ChairmanDashboard = () => {
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const router = useRouter();
    const { party } = useParty();
    const navigate = (path: any) => { if (path === -1) router.back(); else router.push(path); };
    const { data: chairman, isLoading: chairmanLoading } = useChairman();
    const { data: stats, isLoading: statsLoading } = useChairmanDashboardStats();

    if (chairmanLoading || (chairman && statsLoading)) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <div className="relative mx-auto w-16 h-16">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500/20 border-t-emerald-600" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Shield className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-muted-foreground font-medium">Loading dashboard...</p>
                    </div>
                </div>
                <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </DashboardLayout>
        );
    }

    if (!chairman) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh] p-6">
                    <div className="text-center space-y-4 max-w-sm">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                            <Shield className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                        <p className="text-muted-foreground">You are not registered as an LGA Chairman.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const statCards = [
        {
            label: "Total Wards",
            value: stats?.totalWards || 0,
            sub: "Electoral wards",
            icon: MapPin,
            color: "green",
            bg: "from-emerald-50 to-white",
            border: "border-l-emerald-600",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-700",
            valColor: "text-emerald-700",
        },
        {
            label: "Polling Units",
            value: stats?.totalPollingUnits || 0,
            sub: "Total in LGA",
            icon: Building2,
            color: "blue",
            bg: "from-blue-50 to-white",
            border: "border-l-blue-600",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            valColor: "text-blue-700",
        },
        {
            label: "Registered Voters",
            value: stats?.totalRegisteredVoters || 0,
            sub: "INEC registered",
            icon: Vote,
            color: "purple",
            bg: "from-purple-50 to-white",
            border: "border-l-purple-500",
            iconBg: "bg-purple-100",
            iconColor: "text-purple-600",
            valColor: "text-purple-700",
        },
        {
            label: "App Members",
            value: stats?.totalMembers || 0,
            sub: "Total registered",
            icon: Users,
            color: "indigo",
            bg: "from-indigo-50 to-white",
            border: "border-l-indigo-500",
            iconBg: "bg-indigo-100",
            iconColor: "text-indigo-600",
            valColor: "text-indigo-700",
        },
        {
            label: "Verified Members",
            value: stats?.verifiedMembers || 0,
            sub: "Field verified",
            icon: ShieldCheck,
            color: "green",
            bg: "from-emerald-50/50 to-white",
            border: "border-l-emerald-600",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-700",
            valColor: "text-emerald-700",
        },
        {
            label: "Pending Verification",
            value: stats?.pendingVerification || 0,
            sub: "Awaiting visit",
            icon: Clock,
            color: "orange",
            bg: "from-orange-50 to-white",
            border: "border-l-orange-500",
            iconBg: "bg-orange-100",
            iconColor: "text-orange-600",
            valColor: "text-orange-700",
        },
        {
            label: "Ward Admins",
            value: stats?.totalCouncillors !== undefined ? `${stats.totalCouncillors} / ${stats.totalWards}` : "0 / 0",
            sub: "Wards Assigned",
            route: "/chairman/councillors",
            icon: UserCheck,
            color: "red",
            bg: "from-red-50 to-white",
            border: "border-l-rose-500",
            iconBg: "bg-red-100",
            iconColor: "text-rose-600",
            valColor: "text-rose-600",
        },
        {
            label: "Support Groups",
            value: stats?.totalSupportGroups || 0,
            sub: "Registered groups",
            icon: Globe,
            color: "teal",
            bg: "from-teal-50 to-white",
            border: "border-l-teal-500",
            iconBg: "bg-teal-100",
            iconColor: "text-teal-600",
            valColor: "text-teal-700",
        },
    ];

    const quickActions = [
        {
            label: "Polling Units",
            icon: Building2,
            route: "/chairman/polling-units",
            bg: "bg-emerald-600 hover:bg-emerald-700",
            text: "text-white",
        },
        {
            label: "Voter Register",
            icon: Vote,
            route: "/voters",
            bg: "bg-blue-600 hover:bg-blue-700",
            text: "text-white",
        },
        {
            label: "Ward Councillors",
            icon: UserCheck,
            route: "/chairman/councillors",
            bg: "bg-teal-600 hover:bg-teal-700",
            text: "text-white",
        },
        {
            label: "Support Groups",
            icon: Globe,
            route: "/support-groups",
            bg: "bg-indigo-600 hover:bg-indigo-700",
            text: "text-white",
        },
        {
            label: "Members",
            icon: Users,
            route: "/members",
            bg: "bg-purple-600 hover:bg-purple-700",
            text: "text-white",
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-4 sm:space-y-6 animate-fade-in">

                {/* ── APM HERO BANNER ── */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-xl">
                    <div className="flex h-2 sm:h-3">
                        <div className="flex-1 bg-emerald-600" />
                        <div className="flex-1 bg-white border-y border-gray-200" />
                        <div className="flex-1 bg-emerald-700" />
                    </div>

                    {/* Main banner body */}
                    <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 p-5 sm:p-7 lg:p-10 relative">
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-48 h-48 sm:w-72 sm:h-72 rounded-full bg-white/5 pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border-2 border-white/20 shadow-lg p-2 overflow-hidden">
                                        <img
                                            src={party.logo}
                                            alt={`${party.name} logo`}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
                                        {chairman.lga} LGA
                                    </h1>
                                    <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5 truncate">
                                        {chairman.chairman_name} • {chairman.email}
                                    </p>
                                </div>
                            </div>

                            <div className="self-start sm:self-auto">
                                <Button
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    variant="outline"
                                    className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs sm:text-sm gap-2 backdrop-blur shadow-xs"
                                >
                                    <KeyRound className="w-3.5 h-3.5 text-emerald-300" />
                                    Change Password
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex h-2 sm:h-3">
                        <div className="flex-1 bg-emerald-600" />
                        <div className="flex-1 bg-white border-y border-gray-200" />
                        <div className="flex-1 bg-emerald-700" />
                    </div>
                </div>

                
                {/* ── VOTER STATS: TURNOUT TRACKER & GENDER BREAKDOWN ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Expected Turnout & Mobilization */}
                    <Card className="border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/50 via-white to-white overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-800">
                                            Expected Turnout & Campaign Mobilization
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            Registered voters mobilized in this campaign
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                        {stats?.expectedTurnoutRate || "0%"} Turnout Rate
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-1">
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center">
                                <div className="bg-white p-2 sm:p-3 rounded-xl border border-gray-100 shadow-2xs">
                                    <span className="text-[11px] text-gray-500 font-medium block">INEC Registered</span>
                                    <strong className="text-lg sm:text-xl font-extrabold text-gray-800">
                                        {stats?.totalRegisteredVoters?.toLocaleString() || 0}
                                    </strong>
                                </div>
                                <div className="bg-emerald-50/60 p-2 sm:p-3 rounded-xl border border-emerald-100 shadow-2xs">
                                    <span className="text-[11px] text-emerald-700 font-medium block">Campaign Members</span>
                                    <strong className="text-lg sm:text-xl font-extrabold text-emerald-700">
                                        {stats?.totalMembers?.toLocaleString() || 0}
                                    </strong>
                                </div>
                                <div className="bg-amber-50/60 p-2 sm:p-3 rounded-xl border border-amber-100 shadow-2xs">
                                    <span className="text-[11px] text-amber-700 font-medium block">Remaining Voters</span>
                                    <strong className="text-lg sm:text-xl font-extrabold text-amber-800">
                                        {stats?.remainingVoters?.toLocaleString() || 0}
                                    </strong>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                                    <span>Campaign Mobilization Progress</span>
                                    <span className="font-bold text-emerald-700">{stats?.expectedTurnoutRate || "0%"}</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-700"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                Math.max(
                                                    1,
                                                    stats?.totalRegisteredVoters
                                                        ? ((stats.totalMembers / stats.totalRegisteredVoters) * 100)
                                                        : 0
                                                )
                                            )}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gender Breakdown (Maza da Mata) */}
                    <Card className="border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50/40 via-white to-white overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold text-gray-800">
                                        Voter Demographics & Gender Breakdown
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        Distribution of male and female registered voters in {chairman.lga} LGA
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                                            👨 Male Voters
                                        </span>
                                        <div className="text-xl sm:text-2xl font-extrabold text-blue-900 mt-1">
                                            {stats?.maleVoters?.toLocaleString() || 0}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-bold">
                                        {stats?.malePct || "0%"}
                                    </Badge>
                                </div>

                                <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                                            👩 Female Voters
                                        </span>
                                        <div className="text-xl sm:text-2xl font-extrabold text-rose-900 mt-1">
                                            {stats?.femaleVoters?.toLocaleString() || 0}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-bold">
                                        {stats?.femalePct || "0%"}
                                    </Badge>
                                </div>
                            </div>

                            {/* Split Bar */}
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                                    <span className="text-blue-700 font-semibold">Male: {stats?.malePct || "50%"}</span>
                                    <span className="text-rose-700 font-semibold">Female: {stats?.femalePct || "50%"}</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-700"
                                        style={{ width: stats?.malePct || "50%" }}
                                    />
                                    <div
                                        className="h-full bg-rose-500 transition-all duration-700"
                                        style={{ width: stats?.femalePct || "50%" }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── STATS GRID ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
                    {statCards.map((item) => {
                        const { label, value, sub, icon: Icon, bg, border, iconBg, iconColor, valColor, route } = item as any;
                        return (
                            <Card
                                key={label}
                                onClick={() => route && navigate(route)}
                                className={`border-l-4 ${border} bg-gradient-to-br ${bg} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${route ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3 sm:p-4">
                                    <CardTitle className="text-[11px] sm:text-xs font-semibold text-gray-600 leading-tight">
                                        {label}
                                    </CardTitle>
                                    <div className={`rounded-full ${iconBg} p-1.5 sm:p-2 flex-shrink-0`}>
                                        <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${iconColor}`} />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 sm:p-4 pt-0">
                                    <div className={`text-2xl sm:text-3xl font-extrabold ${valColor} tracking-tight`}>
                                        {typeof value === "number" ? value.toLocaleString() : value}
                                    </div>
                                    <p className={`text-[10px] sm:text-xs ${iconColor} mt-0.5 font-medium`}>{sub}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* ── QUICK ACTIONS ── */}
                <Card className="border-0 shadow-md overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-emerald-600 via-amber-400 to-emerald-800" />
                    <CardHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-700" />
                            <div>
                                <CardTitle className="text-base sm:text-lg font-bold">Quick Actions</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">Manage your LGA operations</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                            {quickActions.map(({ label, icon: Icon, route, bg, text }) => (
                                <button
                                    key={label}
                                    onClick={() => navigate(route)}
                                    className={`
                                        group flex flex-col items-center justify-center gap-2.5 rounded-xl 
                                        py-3.5 sm:py-5 px-2.5 sm:px-3 ${bg} ${text} last:col-span-2 sm:last:col-span-1
                                        shadow-sm hover:shadow-lg transition-all duration-200 
                                        hover:-translate-y-0.5 active:translate-y-0 active:scale-95
                                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600
                                    `}
                                >
                                    <div className="rounded-full bg-white/20 p-2.5 sm:p-3 group-hover:scale-110 transition-transform">
                                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-semibold text-center leading-tight">{label}</span>
                                    <ChevronRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="overview">LGA Overview</TabsTrigger>
                        <TabsTrigger value="support-groups">My Support Groups</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-4">
                        {/* ── GRANULAR DEMOGRAPHICS ── */}
                        <GranularDemographics
                            lga={chairman.lga}
                            totalRegisteredVoters={stats?.totalRegisteredVoters || 0}
                        />

                        {/* ── WARD PERFORMANCE ── */}
                        <Card className="border-0 shadow-md overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-emerald-600 via-amber-400 to-emerald-800" />
                            <CardHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-emerald-700" />
                                    <div>
                                        <CardTitle className="text-base sm:text-lg font-bold">Ward Performance Overview</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Member distribution across wards in {chairman.lga} LGA
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                {stats?.wardPerformance && stats.wardPerformance.length > 0 ? (
                                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                                        {stats.wardPerformance.map((ward) => {
                                            const avgPerUnit = ward.pollingUnits > 0
                                                ? (ward.members / ward.pollingUnits).toFixed(1)
                                                : "0";
                                            const progress = Math.min(
                                                (ward.members / (ward.pollingUnits * 10)) * 100,
                                                100
                                            );
                                            return (
                                                <div
                                                    key={ward.ward}
                                                    className="group bg-white rounded-xl border border-gray-100 hover:border-emerald-500/30 p-4 shadow-sm hover:shadow-md transition-all duration-200"
                                                >
                                                    {/* Ward header */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <h3 className="font-bold text-sm sm:text-base text-gray-800 leading-snug">
                                                                {ward.ward}
                                                            </h3>
                                                            <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide">
                                                                Electoral Ward
                                                            </span>
                                                        </div>
                                                        <div className="rounded-full bg-apc-green/10 p-1.5 group-hover:bg-emerald-100 transition-colors">
                                                            <MapPin className="h-4 w-4 text-emerald-700" />
                                                        </div>
                                                    </div>

                                                    {/* Ward Admin indicator */}
                                                    <div className="mb-3 p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                                                        <span className="text-[11px] text-gray-500 font-medium">Ward Admin:</span>
                                                        {(ward as any).councillorName ? (
                                                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded flex items-center gap-1">
                                                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                                                {(ward as any).councillorName}
                                                            </span>
                                                        ) : (
                                                            <Link href="/chairman/councillors" className="text-[10px] font-bold text-amber-700 bg-amber-100/80 hover:bg-amber-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors">
                                                                <Plus className="w-2.5 h-2.5" />
                                                                Assign Admin
                                                            </Link>
                                                        )}
                                                    </div>

                                                    {/* Stats row */}
                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                                                            <div className="text-lg font-extrabold text-blue-700">{ward.pollingUnits}</div>
                                                            <div className="text-[10px] text-blue-500 font-medium">Polling Units</div>
                                                        </div>
                                                        <div className="bg-apc-green/10 rounded-lg p-2.5 text-center">
                                                            <div className="text-lg font-extrabold text-emerald-700">{ward.members}</div>
                                                            <div className="text-[10px] text-emerald-700 font-medium">Members</div>
                                                        </div>
                                                    </div>

                                                    {/* Progress bar */}
                                                    <div>
                                                        <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                                                            <span className="font-medium">Avg. Members / Unit</span>
                                                            <span className="font-bold text-gray-700">{avgPerUnit}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                            <MapPin className="h-7 w-7 text-gray-400" />
                                        </div>
                                        <p className="text-muted-foreground text-sm font-medium">No ward data available</p>
                                        <p className="text-xs text-gray-400 mt-1">Ward performance data will appear here once available</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="support-groups" className="mt-4">
                        <CandidateSupportGroupsTab candidateId={chairman.user_id} candidateRace="lga_chairman" />
                    </TabsContent>
                </Tabs>

                {/* ── APC FOOTER BADGE ── */}
                <div className="flex items-center justify-center gap-3 py-3 opacity-60">
                    <APCFlag size="sm" variant="horizontal" />
                </div>

            </div>
        </DashboardLayout>
    );
};

export default ChairmanDashboard;
