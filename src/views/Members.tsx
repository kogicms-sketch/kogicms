"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Mail,
  MapPin,
  Building2,
  Loader2,
  Users,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Activity,
  CheckCircle2,
  TrendingUp,
  GraduationCap,
  Sprout,
  ShoppingBag,
  BookOpen,
  Briefcase,
  Store,
  Wrench,
  Home,
  UserX,
  UserCheck,
  HelpCircle,
} from "lucide-react";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import MemberCard from "@/components/members/MemberCard";
import { useMembers, useMemberStats, useVerifyMember } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { usePUAgent } from "@/hooks/usePUAgent";
import { useAuthorizedLgas } from "@/hooks/useAuthorizedLgas";
import { useCouncillor } from "@/hooks/useCouncillors";
import { APCBanner } from "@/components/branding/APCBanner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { format } from "date-fns";

const OCCUPATIONS_CONFIG = [
  { id: "Student", label: "Students", icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-200" },
  { id: "Farmer", label: "Farmers", icon: Sprout, color: "text-green-600", bg: "bg-green-600/10", border: "border-green-200" },
  { id: "Trader", label: "Traders", icon: ShoppingBag, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-200" },
  { id: "Teacher", label: "Teachers", icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-200" },
  { id: "Civil Servant", label: "Civil Servants", icon: Briefcase, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-200" },
  { id: "Business Owner", label: "Business Owners", icon: Store, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-200" },
  { id: "Artisan", label: "Artisans", icon: Wrench, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-200" },
  { id: "Housewife", label: "Housewives", icon: Home, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-200" },
  { id: "Unemployed", label: "Unemployed", icon: UserX, color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-200" },
  { id: "Retired", label: "Retired", icon: UserCheck, color: "text-cyan-600", bg: "bg-cyan-600/10", border: "border-cyan-200" },
  { id: "Other", label: "Others", icon: HelpCircle, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-200" },
];

const Members = () => {
  const router = useRouter();
  const navigate = (path: string | number) => { if (path === -1) router.back(); else router.push(path as string); };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOccupation, setSelectedOccupation] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { organizationId, role } = useAuth();
  const { data: puAgent } = usePUAgent();

  // Resolve role-based authorization parameters
  const { data: authorizedLgas = [] } = useAuthorizedLgas();
  const { data: councillor } = useCouncillor({ enabled: role === "councillor" });

  const allowedLgas = role === "polling_unit_agent" ? undefined : (authorizedLgas.length > 0 ? authorizedLgas : undefined);
  const allowedWard = role === "councillor" ? councillor?.ward : undefined;

  const membersScope = role === "polling_unit_agent" ? "polling_unit" : organizationId ? "organization" : "all";

  const { data: members = [], isLoading } = useMembers(
    role === "polling_unit_agent" ? undefined : organizationId || undefined,
    role === "polling_unit_agent" ? puAgent?.polling_unit_id || undefined : undefined,
    role === "polling_unit_agent" ? puAgent?.polling_unit_name || undefined : undefined,
    membersScope,
    allowedLgas,
    allowedWard
  );
  const { data: stats } = useMemberStats(
    role === "polling_unit_agent" ? null : organizationId,
    role === "polling_unit_agent" ? puAgent?.polling_unit_id || undefined : undefined,
    role === "polling_unit_agent" ? puAgent?.polling_unit_name || undefined : undefined,
    membersScope,
    allowedLgas,
    allowedWard
  );
  const { mutate: verifyMember, isPending: isVerifying } = useVerifyMember();

  // Filter members based on search and selected occupation
  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.organizations?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      member.state.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOccupation = selectedOccupation 
      ? member.occupation?.toLowerCase() === selectedOccupation.toLowerCase() 
      : true;

    return matchesSearch && matchesOccupation;
  });

  // Calculate occupation counts dynamically from the fetched members
  const occupationCounts = members.reduce((acc, m) => {
    const occ = m.occupation || "Other";
    const foundConfig = OCCUPATIONS_CONFIG.find(c => c.id.toLowerCase() === occ.toLowerCase());
    const key = foundConfig ? foundConfig.id : "Other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Prepare data for Analytics charts
  const sortedMembers = [...members].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  const trendDataMap = new Map<string, number>();
  let runningCount = 0;
  sortedMembers.forEach((m) => {
    if (m.created_at) {
      try {
        const dateStr = format(new Date(m.created_at), "MMM dd");
        runningCount++;
        trendDataMap.set(dateStr, runningCount);
      } catch (e) {
        // Ignore invalid dates
      }
    }
  });
  const trendData = Array.from(trendDataMap.entries()).map(([period, membersCount]) => ({
    period,
    members: membersCount
  }));

  const tradeChartData = OCCUPATIONS_CONFIG.map((occ) => ({
    name: occ.label,
    value: occupationCounts[occ.id] || 0,
    color: occ.id === "Student" ? "#2563EB" : "#16A34A"
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const maleCount = members.filter(m => m.gender?.toLowerCase() === "male").length;
  const femaleCount = members.filter(m => m.gender?.toLowerCase() === "female").length;
  const otherGenderCount = members.length - maleCount - femaleCount;
  const genderChartData = [
    { name: "Male", value: maleCount, color: "#1e3a8a" },
    { name: "Female", value: femaleCount, color: "#ec4899" },
    ...(otherGenderCount > 0 ? [{ name: "Other", value: otherGenderCount, color: "#9ca3af" }] : [])
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout
      title="Members"
      subtitle="Manage organization members and contacts"
    >
      {/* APC Banner */}
      <APCBanner
        title="Member Management"
        subtitle="All Progressives Congress - Katsina State"
      />
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="kpi-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Members</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
            {(stats?.total || 0).toLocaleString()}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Active Members</p>
          <p className="text-xl sm:text-2xl font-bold text-success mt-1">
            {(stats?.active || 0).toLocaleString()}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Inactive</p>
          <p className="text-xl sm:text-2xl font-bold text-muted-foreground mt-1">
            {(stats?.inactive || 0).toLocaleString()}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Organizations</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
            {new Set(members.map((m) => m.organization_id)).size}
          </p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="list" className="gap-2">
            <Users className="w-4 h-4" />
            <span>Supporters List</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>Analytics & Trends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {/* Action Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-between items-stretch sm:items-center mb-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-premium pl-10 w-full sm:w-64 lg:w-80 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button size="sm" className="btn-action gap-2 flex-1 sm:flex-initial" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </Button>
              <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            </div>
          </div>

          {/* Occupation/Trade Filters */}
          <div className="mb-6 bg-card/45 border border-border/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Filter by Trade / Occupation</h3>
              {selectedOccupation && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedOccupation(null)}
                  className="text-xs text-primary h-7 px-2 hover:bg-primary/5"
                >
                  Clear Filter
                </Button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
              {OCCUPATIONS_CONFIG.map((occ) => {
                const count = occupationCounts[occ.id] || 0;
                const IconComponent = occ.icon;
                const isSelected = selectedOccupation === occ.id;
                return (
                  <button
                    key={occ.id}
                    onClick={() => setSelectedOccupation(isSelected ? null : occ.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all min-w-[160px] flex-shrink-0 ${
                      isSelected 
                        ? "bg-primary/10 border-primary shadow-sm scale-[1.02]" 
                        : "bg-background/60 hover:bg-background/90 hover:scale-[1.01] hover:shadow-sm border-border/80"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${occ.bg} ${occ.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{occ.label}</p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{count} {count === 1 ? "member" : "members"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No members found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters or register a new member</p>
              <Button className="btn-action gap-2" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Member
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 animate-fade-in">
                {filteredMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onClick={() => navigate(`/members/detail?id=${member.id}`)}
                  />
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block data-table animate-fade-in overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Organization</th>
                      <th>Role</th>
                      <th>Gender</th>
                      <th>Voter Card</th>
                      <th>Location</th>
                      <th>Field Verification</th>
                      <th>Activities</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="group cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/members/detail?id=${member.id}`)}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 border border-border">
                              <AvatarFallback className="bg-navy-deep text-white text-sm font-medium">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{member.full_name}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {member.email || "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">
                              {member.organizations?.name || "-"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="text-foreground capitalize">{member.role || "-"}</span>
                        </td>
                        <td>
                          <span className="text-foreground capitalize">{member.gender || "-"}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {member.voters_card_image_url ? (
                              <div className="flex items-center gap-1.5 text-success text-xs font-medium bg-success/10 px-2 py-1 rounded-full w-fit">
                                <CreditCard className="w-3 h-3" />
                                <span>Uploaded</span>
                              </div>
                            ) : member.voters_card_id ? (
                              <div className="flex items-center gap-1.5 text-warning text-xs font-medium bg-warning/10 px-2 py-1 rounded-full w-fit">
                                <CreditCard className="w-3 h-3" />
                                <span>ID Only</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Missing</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {member.state}{member.lga ? `, ${member.lga}` : ""}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            {member.is_verified ? (
                              <div className="flex items-center gap-1.5 text-success text-[11px] font-bold bg-success/10 px-2 py-0.5 rounded-full w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Verified</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-orange-600 text-[11px] font-bold bg-orange-50 px-2 py-0.5 rounded-full w-fit border border-orange-100">
                                <Activity className="w-3 h-3" />
                                <span>Pending Visit</span>
                              </div>
                            )}
                            {role === "polling_unit_agent" && !member.is_verified && (puAgent?.polling_unit_id === member.polling_unit_id || puAgent?.polling_unit_name === member.polling_unit) && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                disabled={isVerifying}
                                className="h-7 text-[10px] text-apc-green hover:text-white hover:bg-apc-green gap-1 px-2 border border-apc-green/30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Confirm physical verification for ${member.full_name}?`)) {
                                    verifyMember(member.id);
                                  }
                                }}
                              >
                                {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                Verify Now
                              </Button>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="font-medium text-foreground">
                            {member.activity_count || 0}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              member.status === "active"
                                ? "status-active"
                                : "status-inactive"
                            }
                          >
                            {member.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <button className="p-2 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Registration Momentum */}
            <Card className="p-4 sm:p-6 bg-card border border-border shadow-premium rounded-xl">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-base font-bold text-foreground">Registration Momentum</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Cumulative member registration trajectory</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {trendData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="memberGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(229, 231, 235, 0.5)" />
                        <XAxis 
                          dataKey="period" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '12px',
                            background: 'rgba(255,255,255,0.95)'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="members" 
                          stroke="#2563eb" 
                          fillOpacity={1} 
                          fill="url(#memberGrowthGrad)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm italic">
                    No registration trend data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Occupation Split */}
            <Card className="p-4 sm:p-6 bg-card border border-border shadow-premium rounded-xl">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-base font-bold text-foreground">Trade & Occupation Split</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Distribution of member primary occupations</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {tradeChartData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tradeChartData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(229, 231, 235, 0.5)" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 500, fill: '#4B5563' }}
                          width={100}
                        />
                        <RechartsTooltip 
                          cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                          {tradeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm italic">
                    No occupation data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card className="p-4 sm:p-6 bg-card border border-border shadow-premium rounded-xl lg:col-span-2">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-base font-bold text-foreground">Gender Distribution</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Member gender split ratio</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex flex-col md:flex-row items-center justify-around gap-6">
                {genderChartData.length > 0 ? (
                  <>
                    <div className="h-[240px] w-[240px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={genderChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {genderChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-foreground">{members.length}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Members</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 min-w-[200px]">
                      {genderChartData.map((g, idx) => {
                        const pct = ((g.value / members.length) * 100).toFixed(1);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                              <span className="text-sm font-semibold text-foreground">{g.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-foreground">{g.value}</span>
                              <span className="text-xs text-muted-foreground ml-2">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm italic">
                    No gender data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Members;
