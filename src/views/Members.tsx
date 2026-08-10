"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { STUDENT_INSTITUTIONS } from "@/data/student_institutions";
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
  BarChart3,
  ArrowLeft,
  Printer,
  Link,
} from "lucide-react";
import { toast } from "sonner";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import MemberCard from "@/components/members/MemberCard";
import { StarAgentButton } from "@/components/members/StarAgentButton";
import { useMembers, useMemberStats, useVerifyMember } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { usePUAgent } from "@/hooks/usePUAgent";
import { useAuthorizedLgas } from "@/hooks/useAuthorizedLgas";
import { useCouncillor } from "@/hooks/useCouncillors";
import { APCBanner } from "@/components/branding/APCBanner";
import { useParty } from "@/contexts/PartyContext";
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

const TRADER_SUB_TRADES = [
  "Grain / Produce Merchant (Mai Hatsi)",
  "Livestock Trader (Mai Dabbobi)",
  "Textile / Wrapper Dealer (Mai Atamfa da Yadudduka)",
  "Provisions Shop Owner (Mai Kantin Shago)",
  "Tea & Bread Vendor (Mai Shayi da Buredi)",
  "Perishable Goods / Vegetable Vendor (Mai Kayan Miya)",
  "Mobile Phone Accessory / Charging Point (Mai Charge da Waya)",
  "POS Agent / Mobile Money Operator (Mai POS)",
  "Butcher / Meat Vendor (Mai Naman Shanu/Akuya)",
  "Cosmetics & Perfume Seller (Mai Kayan Kwalliya)",
  "Footwear & Shoe Dealer (Mai Takalma)",
  "Hardware & Building Materials (Mai Kayan Gini)",
  "Auto / Motorcycle Spare Parts (Mai Kayan Mota da Keke)",
  "Second-Hand Clothes Merchant (Mai Gwanjo)",
  "Gold & Silver Goldsmith (Mai Gyaran Gwal)",
  "Charcoal / Firewood Seller (Mai Gawayi da Itace)",
  "Catering / Cooked Food Vendor (Mai Abinci)",
  "Cement Dealer (Mai Simenti)",
  "Plastic Ware & Kitchen Utensils (Mai Kayan Robobi)",
  "Electrical Appliances Dealer (Mai Kayan Wutar Lantarki)",
  "Tailoring Materials Merchant (Mai Kayan Dinki)",
  "Other Trader"
];

// STUDENT_INSTITUTIONS imported from @/data/student_institutions

const BUSINESS_SECTORS = [
  "Commercial Transport Fleet (Mota/Buses)",
  "Tricycle Operations Owner (Keke Napep Fleet)",
  "Commercial Motorcycle Fleet (Achaba Operator)",
  "Pharmacy / Wholesale Chemist",
  "Patent Medicine Store (Local Chemist Shop)",
  "Block Industry & Concrete Molding Yard",
  "Tailoring & Embroidery Fashion Center",
  "Computer Cyber Café & IT Support Center",
  "Welding & Iron Fabrication Workshop",
  "Carpentry & Furniture Showroom",
  "Grain Milling & Agro-Processing Factory (Gidan Nika)",
  "Bakery / Confectionery Factory",
  "Dry Cleaning & Laundry Business",
  "Barbing / Hair Dressing Salon",
  "Poultry / Livestock Farm Enterprise",
  "Pure Water / Sachet Water Factory",
  "Car Wash Outlet",
  "Printing Press & Graphic Design Studio",
  "Scrap Metal Yard (Mai Kayan Ruwa)",
  "Electrical / Solar Installation Agency",
  "Artisan Workshop (Mechanic, Panel Beater)",
  "Other / Unknown Business"
];

const OCCUPATION_SUB_CATEGORIES_DEFAULTS: Record<string, string[]> = {
  Trader: TRADER_SUB_TRADES,
  Student: STUDENT_INSTITUTIONS,
  "Business Owner": BUSINESS_SECTORS,
  Teacher: ["Primary", "Secondary", "Tertiary"],
  Farmer: [
    "Noman Damana (Rain-fed)",
    "Noman Rani (Irrigation)",
    "Both"
  ],
  "Civil Servant": [
    "State Ministry",
    "Local Government",
    "Federal",
    "Other"
  ]
};

const Members = () => {
  const { party } = useParty();
  const router = useRouter();
  const navigate = (path: string | number) => { if (path === -1) router.back(); else router.push(path as string); };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOccupation, setSelectedOccupation] = useState<string | null>(null);
  const [selectedSubOccupation, setSelectedSubOccupation] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedParentOcc, setSelectedParentOcc] = useState<string | null>(null);
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

  // Filter members based on search, selected occupation and sub-occupation
  const filteredMembers = members.filter((member) => {
    const isStudentUser = role === "student";
    if (isStudentUser) {
      const occ = (member.occupation || "").toLowerCase();
      const emp = (member.employment_status || "").toLowerCase();
      const sch = (member.school_name || "").toLowerCase();
      const isStudent = occ === "student" || emp.includes("student") || sch.includes("umyu") || sch.includes("fudma") || sch.includes("college") || sch.includes("university") || sch.includes("polytechnic") || sch.includes("fce") || sch.includes("ikcoe") || sch.includes("ksitm") || sch.includes("al-qalam");
      if (!isStudent) return false;
    }

    const matchesSearch = 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.organizations?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      member.state.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOccupation = selectedOccupation 
      ? member.occupation?.toLowerCase() === selectedOccupation.toLowerCase() 
      : true;

    let matchesSubOccupation = true;
    if (selectedOccupation && selectedSubOccupation) {
      let memberSubName = member.school_name || "";
      if (selectedOccupation === "Farmer" && memberSubName.startsWith("LGA:")) {
        memberSubName = memberSubName.replace("LGA: ", "").replace("Ward: ", "");
      }
      if (selectedOccupation === "Teacher" && member.school_level === "Secondary" && memberSubName) {
        memberSubName = `${memberSubName} (Secondary)`;
      } else if (selectedOccupation === "Teacher" && member.school_level) {
        memberSubName = `${memberSubName} (${member.school_level})`;
      } else if (selectedOccupation === "Civil Servant" && member.school_level) {
        memberSubName = `${memberSubName || "General"} (${member.school_level})`;
      }
      if (!memberSubName) {
        memberSubName = "General / Unspecified";
      }
      matchesSubOccupation = memberSubName.toLowerCase() === selectedSubOccupation.toLowerCase();
    }

    return matchesSearch && matchesOccupation && matchesSubOccupation;
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

  // Demographics aggregation logic
  const demographicStats = (() => {
    const parentStats: Record<string, {
      total: number;
      male: number;
      female: number;
      subCategories: Record<string, {
        total: number;
        male: number;
        female: number;
        ages: number[];
        locations: Record<string, number>;
      }>
    }> = {};

    // Initialize parents
    OCCUPATIONS_CONFIG.forEach((occ) => {
      parentStats[occ.id] = {
        total: 0,
        male: 0,
        female: 0,
        subCategories: {}
      };
    });

    // Ensure "Other" exists
    if (!parentStats["Other"]) {
      parentStats["Other"] = { total: 0, male: 0, female: 0, subCategories: {} };
    }

    members.forEach((m) => {
      const rawOcc = m.occupation || "Other";
      const matched = OCCUPATIONS_CONFIG.find(c => c.id.toLowerCase() === rawOcc.toLowerCase());
      const parentId = matched ? matched.id : "Other";

      const gender = (m.gender || "").toLowerCase();
      const isMale = gender === "male";
      const isFemale = gender === "female";

      parentStats[parentId].total++;
      if (isMale) parentStats[parentId].male++;
      if (isFemale) parentStats[parentId].female++;

      let subName = m.school_name || "";
      if (parentId === "Farmer" && subName.startsWith("LGA:")) {
        subName = subName.replace("LGA: ", "").replace("Ward: ", "");
      }
      
      if (parentId === "Teacher" && m.school_level === "Secondary" && subName) {
        subName = `${subName} (Secondary)`;
      } else if (parentId === "Teacher" && m.school_level) {
        subName = `${subName} (${m.school_level})`;
      } else if (parentId === "Civil Servant" && m.school_level) {
        subName = `${subName || "General"} (${m.school_level})`;
      }

      if (!subName) {
        subName = "General / Unspecified";
      }

      if (!parentStats[parentId].subCategories[subName]) {
        parentStats[parentId].subCategories[subName] = {
          total: 0,
          male: 0,
          female: 0,
          ages: [],
          locations: {}
        };
      }

      const sub = parentStats[parentId].subCategories[subName];
      sub.total++;
      if (isMale) sub.male++;
      if (isFemale) sub.female++;

      if (m.date_of_birth) {
        const birthDate = new Date(m.date_of_birth);
        if (!isNaN(birthDate.getTime())) {
          const age = new Date().getFullYear() - birthDate.getFullYear();
          if (age > 0 && age < 120) {
            sub.ages.push(age);
          }
        }
      }

      if (m.lga && m.ward) {
        const locKey = `${m.ward}, ${m.lga}`;
        sub.locations[locKey] = (sub.locations[locKey] || 0) + 1;
      }
    });

    return parentStats;
  })();

  // Get sub-categories stats for the active parent occupation, including default options for empty states
  const activeSubCategoryStats = (() => {
    if (!selectedOccupation) return [];
    
    const defaults = OCCUPATION_SUB_CATEGORIES_DEFAULTS[selectedOccupation] || [];
    const aggregated = demographicStats[selectedOccupation]?.subCategories || {};
    
    // Merge defaults and aggregated
    const allKeys = Array.from(new Set([...defaults, ...Object.keys(aggregated)]));
    
    return allKeys.map(key => {
      const stats = aggregated[key] || { total: 0, male: 0, female: 0, ages: [], locations: {} };
      return {
        name: key,
        total: stats.total,
        male: stats.male,
        female: stats.female,
        ages: stats.ages,
        locations: stats.locations
      };
    });
  })();

  return (
    <DashboardLayout
      title="Members"
      subtitle="Manage organization members and contacts"
    >
      {/* APC Banner */}
      <APCBanner
        title="Member Management"
        subtitle={`${party.fullName} - Katsina State`}
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
        <div className="overflow-x-auto scrollbar-hide mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-auto inline-flex justify-start sm:justify-center p-1 bg-muted/60 rounded-xl">
            <TabsTrigger value="list" className="gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Users className="w-4 h-4" />
              <span>Supporters List</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 text-xs sm:text-sm whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              <span>Analytics & Trends</span>
            </TabsTrigger>
            <TabsTrigger value="demographics" className="gap-2 text-xs sm:text-sm whitespace-nowrap">
              <BarChart3 className="w-4 h-4" />
              <span>Demographics Matrix</span>
            </TabsTrigger>
          </TabsList>
        </div>

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
                  className="input-premium pl-10 w-full sm:w-64 lg:w-80 text-sm h-10"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2 flex-shrink-0 h-10">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs sm:text-sm">
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-xs sm:text-sm"
                onClick={() => {
                  const url = `${window.location.origin}/register`;
                  navigator.clipboard.writeText(url);
                  toast.success("Registration link copied!");
                }}
                title="Copy public registration link to clipboard"
              >
                <Link className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate">Reg Link</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-xs sm:text-sm"
                onClick={() => window.open('/member-registration-form.html', '_blank')}
                title="Open printable registration form"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate">Print Form</span>
              </Button>
              <Button size="sm" className="btn-action gap-1.5 h-9 text-xs sm:text-sm" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate">Add Member</span>
              </Button>
              <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} isStudentOnly={role === "student"} />
            </div>
          </div>
          {/* Occupation/Trade Filters Redesign */}
          <div className="mb-8">
            {!selectedOccupation ? (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Filter by Category</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {OCCUPATIONS_CONFIG.map((occ) => {
                    const parentData = demographicStats[occ.id] || { total: 0, male: 0, female: 0 };
                    const malePct = parentData.total > 0 ? Math.round((parentData.male / parentData.total) * 100) : 0;
                    const femalePct = parentData.total > 0 ? Math.round((parentData.female / parentData.total) * 100) : 0;
                    const Icon = occ.icon;

                    return (
                      <Card
                        key={occ.id}
                        className="cursor-pointer overflow-hidden border border-border/50 transition-all duration-300 hover:shadow-md hover:border-primary/20 transform hover:-translate-y-0.5 hover:scale-[1.01]"
                        onClick={() => {
                          setSelectedOccupation(occ.id);
                          setSelectedSubOccupation(null);
                        }}
                      >
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${occ.bg}`}>
                                <Icon className={`w-4 h-4 ${occ.color}`} />
                              </div>
                              <span className="text-xs font-bold text-foreground">{occ.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-extrabold text-foreground">{parentData.total}</span>
                            </div>
                          </div>

                          <div className="space-y-2 mt-auto">
                            {/* Gender split progress bar */}
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${malePct}%` }}
                              />
                              <div 
                                className="h-full bg-pink-500 transition-all duration-500" 
                                style={{ width: `${femalePct}%` }}
                              />
                            </div>
                            {/* Gender breakdown numbers */}
                            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                              <span className="flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                M: {parentData.male} ({malePct}%)
                              </span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                                F: {parentData.female} ({femalePct}%)
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Level 2 Sub-categories Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 border border-border/40 p-3 rounded-xl mb-4">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 h-8 text-xs font-medium"
                      onClick={() => {
                        setSelectedOccupation(null);
                        setSelectedSubOccupation(null);
                      }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Main Occupations
                    </Button>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Active Filter View: <strong className="text-foreground">{selectedOccupation} Breakdown Matrix</strong>
                    </span>
                  </div>
                  {selectedSubOccupation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSubOccupation(null)}
                      className="text-xs h-8 text-primary hover:bg-primary/5"
                    >
                      Clear Sub-trade Filter
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSubCategoryStats.map((sub) => {
                    const subMalePct = sub.total > 0 ? Math.round((sub.male / sub.total) * 100) : 0;
                    const subFemalePct = sub.total > 0 ? Math.round((sub.female / sub.total) * 100) : 0;
                    const isSelected = selectedSubOccupation === sub.name;
                    const isEmpty = sub.total === 0;

                    return (
                      <Card 
                        key={sub.name}
                        onClick={() => setSelectedSubOccupation(isSelected ? null : sub.name)}
                        className={`cursor-pointer overflow-hidden transition-all duration-300 border ${
                          isEmpty 
                            ? "opacity-60 bg-muted/10 border-border/40" 
                            : isSelected 
                              ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm scale-[1.01]" 
                              : "border-border/50 hover:shadow-sm hover:border-primary/20"
                        }`}
                      >
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                          <div className="mb-2">
                            <h4 className="text-xs font-bold text-foreground line-clamp-1 truncate" title={sub.name}>
                              {sub.name}
                            </h4>
                          </div>

                          <div className="space-y-2 mt-auto">
                            {/* Total and breakdown numbers */}
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Total:</span>
                              <strong className="text-foreground">{sub.total}</strong>
                            </div>

                            {isEmpty ? (
                              <p className="text-[10px] text-muted-foreground font-semibold italic mt-1">
                                Total Members: 0 (Male: 0 | Female: 0)
                              </p>
                            ) : (
                              <>
                                {/* Gender split progress bar */}
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                                  <div 
                                    className="h-full bg-blue-500" 
                                    style={{ width: `${subMalePct}%` }}
                                  />
                                  <div 
                                    className="h-full bg-pink-500" 
                                    style={{ width: `${subFemalePct}%` }}
                                  />
                                </div>
                                {/* Gender breakdown percentages */}
                                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                  <span className="flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    M: {sub.male} ({subMalePct})
                                  </span>
                                  <span className="flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                                    F: {sub.female} ({subFemalePct})
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
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
              <div className="md:hidden space-y-3.5 animate-fade-in pb-28 sm:pb-20">
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
                            <Avatar className="w-10 h-10 border border-border flex-shrink-0">
                              <AvatarFallback className="bg-navy-deep text-white text-sm font-medium">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-foreground">{member.full_name}</p>
                                <StarAgentButton
                                  memberId={member.id}
                                  pollingUnitName={member.polling_unit || ""}
                                  initialRole={member.role}
                                  initialSocialHandle={member.social_media_handle}
                                  size="sm"
                                />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
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
                          {member.gender?.toLowerCase() === "male" ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 text-xs font-semibold bg-blue-50/80 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 px-2.5 py-0.5 rounded-full capitalize">
                              Male
                            </span>
                          ) : member.gender?.toLowerCase() === "female" ? (
                            <span className="inline-flex items-center gap-1 text-pink-700 text-xs font-semibold bg-pink-50/80 dark:bg-pink-950/20 dark:text-pink-400 border border-pink-100 dark:border-pink-900/50 px-2.5 py-0.5 rounded-full capitalize">
                              Female
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic px-2">-</span>
                          )}
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
                            {(role === "polling_unit_agent" || role === "councillor") && !member.is_verified && (
                              role === "councillor" ||
                              puAgent?.polling_unit_id === member.polling_unit_id || 
                              puAgent?.polling_unit_name === member.polling_unit
                            ) && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                disabled={isVerifying}
                                className="h-7 text-[10px] text-apc-green hover:text-white hover:bg-apc-green gap-1 px-2 border border-apc-green/30 mt-1"
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
                          {member.is_deceased ? (
                            <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50">
                              Deceased
                            </span>
                          ) : (
                            <span
                              className={
                                member.status === "active"
                                  ? "status-active"
                                  : "status-inactive"
                              }
                            >
                              {member.status === "active" ? "Active" : "Inactive"}
                            </span>
                          )}
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

        <TabsContent value="demographics">
          {!selectedParentOcc ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Occupational Demographics Matrix</h3>
                  <p className="text-sm text-muted-foreground">Select an occupation category to explore detailed localized sub-categories and metrics</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {OCCUPATIONS_CONFIG.map((occ) => {
                  const parentData = demographicStats[occ.id] || { total: 0, male: 0, female: 0 };
                  const malePct = parentData.total > 0 ? Math.round((parentData.male / parentData.total) * 100) : 0;
                  const femalePct = parentData.total > 0 ? Math.round((parentData.female / parentData.total) * 100) : 0;
                  const Icon = occ.icon;

                  return (
                    <Card 
                      key={occ.id}
                      className="kpi-card group cursor-pointer overflow-hidden border border-border/50 transition-all duration-300 hover:shadow-lg hover:border-primary/20 transform hover:-translate-y-1 hover:scale-[1.01]"
                      onClick={() => setSelectedParentOcc(occ.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-lg ${occ.bg} transition-colors group-hover:bg-primary/20`}>
                            <Icon className={`w-6 h-6 ${occ.color} transition-colors group-hover:text-primary`} />
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-foreground">{parentData.total}</span>
                            <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Registered</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{occ.label}</h4>
                            <span className="text-xs text-muted-foreground">
                              {Object.keys(demographicStats[occ.id]?.subCategories || {}).length} Sub-categories
                            </span>
                          </div>

                          {/* Gender breakdown numbers */}
                          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Male: <strong className="text-foreground">{parentData.male}</strong> ({malePct}%)
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-pink-500" />
                              Female: <strong className="text-foreground">{parentData.female}</strong> ({femalePct}%)
                            </span>
                          </div>

                          {/* Split Bar */}
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-500" 
                              style={{ width: `${malePct}%` }}
                              title={`Male: ${malePct}%`}
                            />
                            <div 
                              className="h-full bg-pink-500 transition-all duration-500" 
                              style={{ width: `${femalePct}%` }}
                              title={`Female: ${femalePct}%`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Level 2 Sub-categories Details */}
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setSelectedParentOcc(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Grid
                </Button>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {OCCUPATIONS_CONFIG.find(c => c.id === selectedParentOcc)?.label || selectedParentOcc} Breakdown
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Total: {demographicStats[selectedParentOcc]?.total || 0} members • {Object.keys(demographicStats[selectedParentOcc]?.subCategories || {}).length} active sub-categories
                  </p>
                </div>
              </div>

              {Object.keys(demographicStats[selectedParentOcc]?.subCategories || {}).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-card border border-border/50 rounded-xl text-muted-foreground text-sm italic">
                  No sub-category records registered for {selectedParentOcc} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(demographicStats[selectedParentOcc].subCategories).map(([subName, sub]) => {
                    const subMalePct = sub.total > 0 ? Math.round((sub.male / sub.total) * 100) : 0;
                    const subFemalePct = sub.total > 0 ? Math.round((sub.female / sub.total) * 100) : 0;
                    
                    // Top location
                    let topLocation = "N/A";
                    let maxCount = 0;
                    Object.entries(sub.locations).forEach(([loc, count]) => {
                      if (count > maxCount) {
                        maxCount = count;
                        topLocation = loc;
                      }
                    });

                    // Average age
                    const avgAge = sub.ages.length > 0 ? Math.round(sub.ages.reduce((a, b) => a + b, 0) / sub.ages.length) : null;

                    return (
                      <Card 
                        key={subName}
                        className="bg-card border border-border/50 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-bold text-foreground line-clamp-2 min-h-[40px] leading-tight">
                            {subName}
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">
                            Total Members: <strong className="text-foreground text-sm">{sub.total}</strong>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Gender metrics */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Male: {sub.male} ({subMalePct}%)
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                                Female: {sub.female} ({subFemalePct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${subMalePct}%` }}
                              />
                              <div 
                                className="h-full bg-pink-500" 
                                style={{ width: `${subFemalePct}%` }}
                              />
                            </div>
                          </div>

                          <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Top Ward & LGA</span>
                              <span className="font-semibold text-foreground truncate block text-left" title={topLocation}>
                                {topLocation}
                              </span>
                            </div>
                            <div className="space-y-0.5 text-right">
                              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Average Age</span>
                              <span className="font-semibold text-foreground block">
                                {avgAge ? `${avgAge} yrs` : "N/A"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Members;
