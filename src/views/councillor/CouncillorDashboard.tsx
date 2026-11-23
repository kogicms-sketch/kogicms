"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Building2,
  Users,
  Activity,
  ShieldCheck,
  Clock,
  Vote,
  TrendingUp,
  ChevronRight,
  Navigation,
  UserPlus,
  Search,
  CreditCard,
  Sparkles,
  Gift,
  KeyRound,
  Award,
  CheckCircle2,
  AlertCircle,
  Filter,
  Phone,
  Radio,
  FileText,
  UserCheck
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParty } from "@/contexts/PartyContext";
import { useCouncillor, useCouncillorWardData } from "@/hooks/useCouncillors";
import { KOGI_LGAS, getWardsForLga } from "@/lib/campaign-data";
import { GranularDemographics } from "@/components/dashboard/GranularDemographics";
import { AgentPerformanceReport } from "@/components/dashboard/AgentPerformanceReport";
import { AgentPaymentRoster } from "@/components/councillor/AgentPaymentRoster";
import AssignAgentModal from "@/components/modals/AssignAgentModal";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { toast } from "sonner";

export default function CouncillorDashboard() {
  const { party } = useParty();
  const { data: councillor, isLoading: councillorLoading } = useCouncillor();

  // LGA and Ward state with fallback to Councillor profile
  const [selectedLga, setSelectedLga] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");

  const activeLga = selectedLga || councillor?.lga || "Lokoja";
  const activeWard = selectedWard || councillor?.ward || "Lokoja - A";

  // Available wards in active LGA
  const availableWards = useMemo(() => {
    return getWardsForLga(activeLga);
  }, [activeLga]);

  // Ward data hook using dynamic selection
  const {
    data: wardData,
    isLoading: wardLoading,
    refetch: refetchWardData,
  } = useCouncillorWardData(activeLga, activeWard);

  // Search & Filter state for polling units
  const [puSearch, setPuSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [selectedPuForAssignment, setSelectedPuForAssignment] = useState<any | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("polling-units");

  // Handle LGA switch
  const handleLgaChange = (newLga: string) => {
    setSelectedLga(newLga);
    const wards = getWardsForLga(newLga);
    if (wards.length > 0) {
      setSelectedWard(wards[0]);
    }
  };

  // Filter polling units
  const filteredPollingUnits = useMemo(() => {
    if (!wardData?.pollingUnits) return [];
    return wardData.pollingUnits.filter((pu) => {
      const matchQuery =
        !puSearch ||
        pu.name.toLowerCase().includes(puSearch.toLowerCase()) ||
        (pu.code && pu.code.toLowerCase().includes(puSearch.toLowerCase()));

      const matchStatus = statusFilter === "all" || pu.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [wardData?.pollingUnits, puSearch, statusFilter]);

  // Loading state
  if (councillorLoading || wardLoading) {
    return (
      <DashboardLayout title="Ward Executive Command" subtitle="Loading analytics...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500/20 border-t-emerald-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-semibold">
              Loading Ward Command Dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalRegisteredVoters = wardData?.totalRegisteredVoters || 0;
  const totalMembers = wardData?.totalMembers || 0;
  const totalVerified = wardData?.verifiedMembers || 0;
  const totalPending = wardData?.pendingVerification || 0;
  const totalPUs = wardData?.totalPollingUnits || 0;
  const assignedAgentsCount = wardData?.assignedAgentsCount || 0;

  const victoryPct =
    totalRegisteredVoters > 0
      ? Math.min(Math.round((totalMembers / totalRegisteredVoters) * 100), 100)
      : 0;

  const statCards = [
    {
      label: "Polling Units",
      value: totalPUs.toLocaleString(),
      sub: "100% Ward Coverage",
      icon: Building2,
      border: "border-l-emerald-600",
      bg: "from-emerald-50 to-white",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-700",
      valColor: "text-emerald-800",
    },
    {
      label: "INEC Registered",
      value: totalRegisteredVoters.toLocaleString(),
      sub: "Official voter base",
      icon: Vote,
      border: "border-l-blue-600",
      bg: "from-blue-50 to-white",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
      valColor: "text-blue-900",
    },
    {
      label: "Campaign Members",
      value: totalMembers.toLocaleString(),
      sub: "Mobilized via APM app",
      icon: Users,
      border: "border-l-indigo-600",
      bg: "from-indigo-50 to-white",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-700",
      valColor: "text-indigo-900",
    },
    {
      label: "Field Verified",
      value: totalVerified.toLocaleString(),
      sub: "PVC & address confirmed",
      icon: ShieldCheck,
      border: "border-l-teal-600",
      bg: "from-teal-50 to-white",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-700",
      valColor: "text-teal-900",
    },
    {
      label: "PU Agents Assigned",
      value: `${assignedAgentsCount} / ${totalPUs}`,
      sub: totalPUs > 0 && assignedAgentsCount >= totalPUs ? "Full Deployment" : "Deployment in Progress",
      icon: UserCheck,
      border: "border-l-amber-600",
      bg: "from-amber-50 to-white",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-700",
      valColor: "text-amber-900",
    },
  ];

  const quickActions = [
    {
      label: "Polling Units",
      sub: "View & audit cells",
      icon: Building2,
      route: "/polling-units",
      bg: "bg-emerald-600 hover:bg-emerald-700",
      text: "text-white",
    },
    {
      label: "Agent Payment Roster",
      sub: "Bank accounts & pay",
      icon: CreditCard,
      onClick: () => setActiveTab("payment-roster"),
      bg: "bg-blue-600 hover:bg-blue-700",
      text: "text-white",
    },
    {
      label: "Register Member",
      sub: "Enroll voter to APM",
      icon: UserPlus,
      route: "/members",
      bg: "bg-indigo-600 hover:bg-indigo-700",
      text: "text-white",
    },
    {
      label: "Ward Welfare",
      sub: "Incentive distribution",
      icon: Gift,
      route: "/welfare",
      bg: "bg-teal-600 hover:bg-teal-700",
      text: "text-white",
    },
    {
      label: "Field Reports",
      sub: "Election day & alerts",
      icon: FileText,
      route: "/polling-units-reports",
      bg: "bg-purple-600 hover:bg-purple-700",
      text: "text-white",
    },
    {
      label: "AI Post Generator",
      sub: "Grassroots outreach",
      icon: Sparkles,
      route: "/post-generator",
      bg: "bg-amber-600 hover:bg-amber-700",
      text: "text-white",
    },
  ];

  return (
    <DashboardLayout
      title={`${activeWard} Ward Command`}
      subtitle={`${activeLga} LGA • Allied Peoples' Movement (APM)`}
    >
      <div className="space-y-6 pb-12 animate-fade-in">
        {/* ── 1. APM HERO COMMAND BANNER ── */}
        <div className="relative overflow-hidden rounded-2xl shadow-xl border border-emerald-800/40">
          {/* APM Tri-Color Top Accent Line */}
          <div className="flex h-2">
            <div className="flex-1 bg-emerald-600" />
            <div className="flex-1 bg-sky-500" />
            <div className="flex-1 bg-slate-900" />
          </div>

          <div className="relative bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 p-6 md:p-8 text-white">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Brand & Title */}
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white p-2 flex items-center justify-center shadow-2xl border-2 border-emerald-400/40 shrink-0">
                  <img
                    src="/apm-logo.png"
                    alt="APM Logo"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/40 text-[11px] font-bold uppercase tracking-wider">
                      📍 Ward Executive Command
                    </Badge>
                    <Badge className="bg-white/10 text-white border-white/20 text-[11px]">
                      Nigeria First
                    </Badge>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    {activeWard}
                  </h1>

                  <p className="text-xs sm:text-sm text-emerald-200/90 font-medium">
                    {activeLga} Local Government Area • Confluence State
                  </p>
                  <p className="text-[11px] text-white/70">
                    Leader: {councillor?.councillor_name || "Hon. Ward Councillor"} • {councillor?.email || "councillor@kogicms.ng"}
                  </p>
                </div>
              </div>

              {/* Right Controls: Interactive Ward Switcher & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black/30 backdrop-blur p-3 rounded-xl border border-white/10">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                    Switch LGA:
                  </span>
                  <select
                    value={activeLga}
                    onChange={(e) => handleLgaChange(e.target.value)}
                    className="h-9 px-2.5 rounded-lg bg-slate-900 border border-white/20 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {KOGI_LGAS.map((lga) => (
                      <option key={lga} value={lga}>
                        {lga}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                    Switch Ward:
                  </span>
                  <select
                    value={activeWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    className="h-9 px-2.5 rounded-lg bg-slate-900 border border-white/20 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[140px]"
                  >
                    {availableWards.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end pt-2 sm:pt-0">
                  <Button
                    onClick={() => setIsPasswordModalOpen(true)}
                    variant="outline"
                    className="h-9 text-xs gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20 font-semibold"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-300" />
                    Password
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* APM Tri-Color Bottom Accent Line */}
          <div className="flex h-1.5">
            <div className="flex-1 bg-emerald-600" />
            <div className="flex-1 bg-sky-500" />
            <div className="flex-1 bg-slate-900" />
          </div>
        </div>

        {/* ── 2. MOBILIZATION TRACKER & GENDER DEMOGRAPHICS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Expected Turnout & Campaign Mobilization */}
          <Card className="border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/40 via-white to-white overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-gray-800">
                      Expected Turnout & Ward Mobilization
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Campaign member coverage in {activeWard}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {wardData?.expectedTurnoutRate || "0%"} Turnout Rate
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] text-gray-500 font-medium block">
                    INEC Registered
                  </span>
                  <strong className="text-lg sm:text-xl font-extrabold text-gray-800">
                    {totalRegisteredVoters.toLocaleString()}
                  </strong>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] text-emerald-700 font-medium block">
                    Campaign Members
                  </span>
                  <strong className="text-lg sm:text-xl font-extrabold text-emerald-700">
                    {totalMembers.toLocaleString()}
                  </strong>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 shadow-2xs">
                  <span className="text-[11px] text-amber-700 font-medium block">
                    Remaining Voters
                  </span>
                  <strong className="text-lg sm:text-xl font-extrabold text-amber-800">
                    {Math.max(0, totalRegisteredVoters - totalMembers).toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                  <span>Ward Mobilization Progress</span>
                  <span className="font-bold text-emerald-700">
                    {wardData?.expectedTurnoutRate || "0%"}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          1,
                          totalRegisteredVoters > 0
                            ? (totalMembers / totalRegisteredVoters) * 100
                            : 0
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Gender Demographics (Male & Female) */}
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
                    Distribution of male and female registered voters in {activeWard}
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
                      {(wardData?.maleVoters || 0).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-bold">
                    {wardData?.malePct || "52%"}
                  </Badge>
                </div>

                <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                      👩 Female Voters
                    </span>
                    <div className="text-xl sm:text-2xl font-extrabold text-rose-900 mt-1">
                      {(wardData?.femaleVoters || 0).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-bold">
                    {wardData?.femalePct || "48%"}
                  </Badge>
                </div>
              </div>

              {/* Split Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                  <span className="text-blue-700 font-semibold">
                    Male: {wardData?.malePct || "52%"}
                  </span>
                  <span className="text-rose-700 font-semibold">
                    Female: {wardData?.femalePct || "48%"}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-500 transition-all duration-700"
                    style={{ width: wardData?.malePct || "52%" }}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-700"
                    style={{ width: wardData?.femalePct || "48%" }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 3. EXECUTIVE KPI METRICS GRID ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card
                className={`border-l-4 ${card.border} ${card.bg} bg-gradient-to-br shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3 sm:p-4">
                  <CardTitle className="text-[11px] sm:text-xs font-semibold text-gray-600 leading-tight">
                    {card.label}
                  </CardTitle>
                  <div className={`rounded-full ${card.iconBg} p-1.5 sm:p-2 flex-shrink-0`}>
                    <card.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${card.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className={`text-2xl sm:text-3xl font-extrabold ${card.valColor} tracking-tight`}>
                    {card.value}
                  </div>
                  <p className={`text-[10px] sm:text-xs ${card.iconColor} mt-0.5 font-medium`}>
                    {card.sub}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── 4. QUICK ACTIONS GRID ── */}
        <Card className="border-0 shadow-md overflow-hidden bg-white">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-navy-900" />
          <CardHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Ward Operations & Quick Actions
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct tools to manage your ward mobilisation, agents, and activities
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((act) => {
                const Content = (
                  <div
                    className={`
                      group flex flex-col items-center justify-center gap-2 rounded-xl 
                      py-4 px-3 ${act.bg} ${act.text}
                      shadow-sm hover:shadow-lg transition-all duration-200 
                      hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-center cursor-pointer h-full
                    `}
                  >
                    <div className="rounded-full bg-white/20 p-2.5 group-hover:scale-110 transition-transform">
                      <act.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold leading-tight">
                      {act.label}
                    </span>
                    <span className="text-[10px] opacity-80">{act.sub}</span>
                  </div>
                );

                if (act.onClick) {
                  return (
                    <div key={act.label} onClick={act.onClick}>
                      {Content}
                    </div>
                  );
                }

                return (
                  <Link key={act.label} href={act.route || "#"}>
                    {Content}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── 5. MAIN TABBED WORKSPACE ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl bg-muted p-1 rounded-xl">
            <TabsTrigger value="polling-units" className="flex items-center gap-1.5 text-xs font-bold">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Polling Units ({totalPUs})</span>
            </TabsTrigger>
            <TabsTrigger value="payment-roster" className="flex items-center gap-1.5 text-xs font-bold">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Agent Payments</span>
            </TabsTrigger>
            <TabsTrigger value="demographics" className="flex items-center gap-1.5 text-xs font-bold">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Demographics</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1.5 text-xs font-bold">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Live Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: POLLING UNITS & FIELD AGENTS ── */}
          <TabsContent value="polling-units" className="space-y-4 mt-4">
            <Card className="border-0 shadow-md overflow-hidden bg-white">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600" />
              <CardHeader className="p-4 sm:p-6 pb-3 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-base sm:text-lg font-bold">
                        Polling Units in {activeWard}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {filteredPollingUnits.length} units found • Real-time voter strength and PU Agent assignment
                      </CardDescription>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                      <Input
                        placeholder="Search unit name or code..."
                        value={puSearch}
                        onChange={(e) => setPuSearch(e.target.value)}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="ready">Ready</option>
                      <option value="forming">Forming</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredPollingUnits.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                          <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-4 sm:pl-6">
                            Polling Unit Name
                          </TableHead>
                          <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                            INEC Code
                          </TableHead>
                          <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Voters
                          </TableHead>
                          <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Members
                          </TableHead>
                          <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Coverage
                          </TableHead>
                          <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                            Status
                          </TableHead>
                          <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider pr-4 sm:pr-6 text-right">
                            Assigned Agent
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPollingUnits.map((pu, idx) => {
                          const coverage =
                            pu.registered_voters > 0
                              ? Math.round(((pu.total_members || 0) / pu.registered_voters) * 100)
                              : 0;
                          const coverageColor =
                            coverage >= 50
                              ? "bg-emerald-500"
                              : coverage >= 20
                              ? "bg-blue-500"
                              : "bg-amber-500";

                          const statusBadgeStyle =
                            pu.status === "complete"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : pu.status === "active"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : pu.status === "ready"
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : "bg-gray-100 text-gray-600 border-gray-200";

                          return (
                            <TableRow
                              key={pu.id}
                              className="hover:bg-emerald-50/20 transition-colors border-b border-gray-100"
                            >
                              <TableCell className="pl-4 sm:pl-6 py-3 font-semibold text-xs sm:text-sm text-gray-800">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{pu.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-semibold border border-gray-200">
                                  {pu.code || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm font-semibold text-gray-700">
                                {(pu.registered_voters || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm font-bold text-emerald-700">
                                {(pu.total_members || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                    <div
                                      style={{ width: `${Math.min(coverage, 100)}%` }}
                                      className={`h-full rounded-full ${coverageColor}`}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold text-gray-600">
                                    {coverage}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyle}`}>
                                  {pu.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="pr-4 sm:pr-6 text-right">
                                {pu.agent ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Badge className="bg-emerald-600 text-white text-[11px] font-semibold gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Assigned
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedPuForAssignment(pu);
                                        setIsAssignModalOpen(true);
                                      }}
                                      className="h-7 text-xs text-emerald-700 hover:text-emerald-800"
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedPuForAssignment(pu);
                                      setIsAssignModalOpen(true);
                                    }}
                                    className="h-7 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
                                  >
                                    <UserPlus className="w-3 h-3" /> Assign Agent
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50">
                    <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-700">No polling units found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Try clearing your search query or selecting a different ward above.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: AGENT PAYMENT ROSTER ── */}
          <TabsContent value="payment-roster" className="space-y-4 mt-4">
            <AgentPaymentRoster lga={activeLga} ward={activeWard} />
          </TabsContent>

          {/* ── TAB 3: GRANULAR DEMOGRAPHICS ── */}
          <TabsContent value="demographics" className="space-y-4 mt-4">
            <GranularDemographics
              lga={activeLga}
              ward={activeWard}
              totalRegisteredVoters={totalRegisteredVoters}
            />
          </TabsContent>

          {/* ── TAB 4: LIVE FIELD ACTIVITY & LEADERBOARD ── */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <AgentPerformanceReport lga={activeLga} ward={activeWard} />
          </TabsContent>
        </Tabs>

        {/* ── ASSIGN AGENT MODAL ── */}
        {selectedPuForAssignment && (
          <AssignAgentModal
            isOpen={isAssignModalOpen}
            onClose={() => {
              setIsAssignModalOpen(false);
              setSelectedPuForAssignment(null);
            }}
            onSuccess={() => {
              refetchWardData();
              toast.success("Polling unit agent successfully updated!");
            }}
            councillorId={councillor?.id || "councillor-default"}
            pollingUnit={selectedPuForAssignment}
          />
        )}

        {/* ── CHANGE PASSWORD MODAL ── */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
