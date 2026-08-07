"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  GraduationCap,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  Award,
  Search,
  MapPin,
  ArrowUpRight,
  ShieldCheck,
  RefreshCcw,
  Gift,
  PieChart as PieChartIcon,
  BookOpen,
  UserPlus
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useMembers } from "@/hooks/useMembers";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import Link from "next/link";

export default function StudentDashboard() {
  const [searchLga, setSearchLga] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolCategory, setSchoolCategory] = useState<"all" | "university" | "polytechnic" | "college">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch all members from both Supabase and local IndexedDB cache
  const {
    data: allAppMembers = [],
    isLoading: loadingMembers,
    refetch: refetchMembers,
    isRefetching: refetchingMembers
  } = useMembers("all");

  // Helper filter function to identify student records ONLY
  const isStudentMember = (m: any) => {
    if (!m) return false;
    const occ = (m.occupation || "").toLowerCase().trim();
    const emp = (m.employment_status || "").toLowerCase().trim();
    const sch = (m.school_name || "").toLowerCase().trim();
    const level = (m.school_level || "").toLowerCase().trim();
    const type = (m.member_type || "").toLowerCase().trim();

    // 1. Explicitly student by occupation, employment status, or member_type
    if (occ === "student" || emp.includes("student") || type === "student") {
      return true;
    }

    // 2. Or if school_name or school_level is specified
    if (sch !== "" || level !== "") {
      return true;
    }

    return false;
  };

  // Filtered Student Members list
  const studentMembers = useMemo(() => {
    return allAppMembers.filter(isStudentMember);
  }, [allAppMembers]);

  // Query student support groups count
  const { data: totalOrgsCount = 0 } = useQuery({
    queryKey: ["student-total-orgs-count"],
    queryFn: async () => {
      const { count } = await supabase.from("organizations").select("*", { count: "exact", head: true });
      return count || 0;
    }
  });

  // Query student welfare count
  const { data: totalIncentivesCount = 0 } = useQuery({
    queryKey: ["student-total-incentives-count"],
    queryFn: async () => {
      const { count } = await supabase.from("member_incentives").select("*", { count: "exact", head: true });
      return count || 0;
    }
  });

  // Derived metrics
  const total = studentMembers.length;
  const verified = studentMembers.filter((m) => m.is_verified || m.voters_card_id || m.pvc_status === "collected").length;
  const males = studentMembers.filter((m) => (m.gender || "").toLowerCase() === "male").length;
  const females = studentMembers.filter((m) => (m.gender || "").toLowerCase() === "female").length;

  const cloudMetrics = {
    totalStudents: total,
    verifiedStudents: verified,
    malesCount: males,
    femalesCount: females,
    totalOrgs: totalOrgsCount,
    totalIncentives: totalIncentivesCount,
    allStudentMembers: studentMembers,
  };

  // Top Schools with Breakdown
  const topSchools = useMemo(() => {
    const schoolMap: Record<
      string,
      { school_name: string; total: number; males: number; females: number; verified: number }
    > = {};

    studentMembers.forEach((m) => {
      const rawName = (m.school_name || "").trim();
      if (!rawName) return;

      if (!schoolMap[rawName]) {
        schoolMap[rawName] = {
          school_name: rawName,
          total: 0,
          males: 0,
          females: 0,
          verified: 0,
        };
      }

      schoolMap[rawName].total += 1;
      const g = (m.gender || "").toLowerCase();
      if (g === "male") {
        schoolMap[rawName].males += 1;
      } else if (g === "female") {
        schoolMap[rawName].females += 1;
      }

      if (m.is_verified || m.voters_card_id || m.pvc_status === "collected") {
        schoolMap[rawName].verified += 1;
      }
    });

    return Object.values(schoolMap)
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [studentMembers]);

  // Filtered Top 10 Schools by Search Query and Category Tabs
  const filteredTop10Schools = useMemo(() => {
    let list = topSchools;
    if (schoolCategory !== "all") {
      list = list.filter((s) => {
        const name = s.school_name.toLowerCase();
        if (schoolCategory === "university") return name.includes("university") || name.includes("umyu") || name.includes("fudma") || name.includes("al-qalam") || name.includes("abu") || name.includes("buk");
        if (schoolCategory === "polytechnic") return name.includes("polytechnic") || name.includes("poly") || name.includes("huk") || name.includes("ksitm") || name.includes("yabatech");
        if (schoolCategory === "college") return name.includes("college") || name.includes("ikcoe") || name.includes("fce") || name.includes("nursing");
        return true;
      });
    }
    if (schoolSearch.trim()) {
      list = list.filter((s) =>
        s.school_name.toLowerCase().includes(schoolSearch.toLowerCase())
      );
    }
    return list.slice(0, 10);
  }, [topSchools, schoolSearch, schoolCategory]);

  // Fetch Organizations / Student Campus Groups Live from Cloud
  const { data: organizationsList = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ["student-organizations-cloud"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Activities / Events Live from Cloud
  const { data: activitiesList = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["student-activities-cloud"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
  });

  // LGA Student Mobilization Breakdown
  const lgaBreakdown = useMemo(() => {
    const lgaMap: Record<
      string,
      { lga: string; total: number; verified: number; males: number; females: number }
    > = {};

    studentMembers.forEach((m) => {
      const lgaName = (m.lga || "Katsina").trim();
      if (!lgaMap[lgaName]) {
        lgaMap[lgaName] = { lga: lgaName, total: 0, verified: 0, males: 0, females: 0 };
      }
      lgaMap[lgaName].total += 1;
      if (m.is_verified || m.voters_card_id || m.pvc_status === "collected") lgaMap[lgaName].verified += 1;
      const g = (m.gender || "").toLowerCase();
      if (g === "male") lgaMap[lgaName].males += 1;
      if (g === "female") lgaMap[lgaName].females += 1;
    });

    return Object.values(lgaMap).sort((a, b) => b.total - a.total);
  }, [studentMembers]);

  // Filtered LGA list
  const filteredLgaBreakdown = useMemo(() => {
    if (!searchLga.trim()) return lgaBreakdown;
    return lgaBreakdown.filter((item) =>
      item.lga.toLowerCase().includes(searchLga.toLowerCase())
    );
  }, [lgaBreakdown, searchLga]);

  // Derived percentages
  const verifiedPercent = total > 0 ? Math.round((verified / total) * 100) : 0;
  const malePercent = total > 0 ? Math.round((males / total) * 100) : 0;
  const femalePercent = total > 0 ? Math.round((females / total) * 100) : 0;

  return (
    <DashboardLayout
      title="Student Campaign & Youth Affairs Dashboard"
      subtitle="Exclusive real-time student monitoring portal tracking student registrations, top 10 tertiary institutions, gender distribution, and campus mobilization in Katsina State"
    >
      <div className="space-y-6 pb-12">
        {/* Banner Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-6 md:p-8 text-white shadow-xl border border-emerald-700/40"
        >
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 px-3 py-1 font-semibold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Exclusive Student Data Portal
                </Badge>
                <Badge variant="outline" className="text-emerald-200 border-emerald-400/30 text-xs">
                  Katsina Tertiary & Secondary Students Network
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Dikko Radda Student Affairs & Campus Monitor
              </h1>
              <p className="text-emerald-100/90 text-sm leading-relaxed">
                Strictly filtered real-time database analytics monitoring ONLY registered student members across Katsina State institutions, campus chapters, and student voter mobilization.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold shadow-md gap-2 w-full sm:w-auto text-xs"
              >
                <UserPlus className="w-4 h-4" />
                Add Student Member
              </Button>
              <Button
                onClick={() => refetchMembers()}
                disabled={refetchingMembers}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold shadow-md gap-2 w-full sm:w-auto text-xs"
              >
                <RefreshCcw className={`w-4 h-4 ${refetchingMembers ? "animate-spin" : ""}`} />
                {refetchingMembers ? "Syncing..." : "Sync Student Data"}
              </Button>
              <Link href="/members">
                <Button variant="outline" className="border-emerald-400/40 bg-emerald-950/40 text-white hover:bg-emerald-800/60 gap-2 w-full sm:w-auto text-xs">
                  <GraduationCap className="w-4 h-4" />
                  View Registered Students
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Top 4 Stat Cards (100% Student Filtered) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="h-1 bg-emerald-500 absolute top-0 left-0 right-0" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Student Members
                </p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-foreground">
                  {loadingMetrics ? "..." : total.toLocaleString()}
                </h3>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Verified Student Records
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <GraduationCap className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="h-1 bg-blue-500 absolute top-0 left-0 right-0" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Verified Student Voters (PVC)
                </p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-foreground">
                  {loadingMetrics ? "..." : verified.toLocaleString()}
                </h3>
                <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {verifiedPercent}% verification rate
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="h-1 bg-purple-500 absolute top-0 left-0 right-0" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Campus Support Groups
                </p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-foreground">
                  {loadingMetrics ? "..." : (cloudMetrics?.totalOrgs || 0).toLocaleString()}
                </h3>
                <p className="text-[11px] text-purple-600 font-medium flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5" /> Registered Student Coalitions
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Building2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="h-1 bg-amber-500 absolute top-0 left-0 right-0" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Student Welfare & Bursaries
                </p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-foreground">
                  {loadingMetrics ? "..." : (cloudMetrics?.totalIncentives || 0).toLocaleString()}
                </h3>
                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-1">
                  <Gift className="w-3.5 h-3.5" /> Student Support Beneficiaries
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Award className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gender Breakdown Card: Male Students vs Female Students */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-600" />
                Student Gender Demographics (Male Students vs Female Students)
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time breakdown of registered male and female students across Katsina institutions
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300">
                👨 Male Students: {males.toLocaleString()} ({malePercent}%)
              </Badge>
              <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200 border-pink-300">
                👩 Female Students: {females.toLocaleString()} ({femalePercent}%)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Male Bar */}
              <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 space-y-2 border-blue-200/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                    Male Students
                  </span>
                  <span className="font-extrabold text-base text-blue-900 dark:text-blue-200">
                    {males.toLocaleString()} <span className="text-xs text-muted-foreground font-medium">({malePercent}%)</span>
                  </span>
                </div>
                <Progress value={malePercent} className="h-3 bg-blue-100 dark:bg-blue-950 [&>div]:bg-blue-600" />
              </div>

              {/* Female Bar */}
              <div className="p-4 rounded-xl border bg-pink-50/50 dark:bg-pink-950/20 space-y-2 border-pink-200/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-pink-900 dark:text-pink-200 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-pink-600 inline-block" />
                    Female Students
                  </span>
                  <span className="font-extrabold text-base text-pink-900 dark:text-pink-200">
                    {females.toLocaleString()} <span className="text-xs text-muted-foreground font-medium">({femalePercent}%)</span>
                  </span>
                </div>
                <Progress value={femalePercent} className="h-3 bg-pink-100 dark:bg-pink-950 [&>div]:bg-pink-600" />
              </div>
            </div>

            {/* Gender visual ratio bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Male Student Ratio ({malePercent}%)</span>
                <span>Female Student Ratio ({femalePercent}%)</span>
              </div>
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-muted">
                <div style={{ width: `${malePercent}%` }} className="bg-blue-600 transition-all duration-500" />
                <div style={{ width: `${femalePercent}%` }} className="bg-pink-500 transition-all duration-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TOP 10 SCHOOLS & TERTIARY INSTITUTIONS TABLE WITH MALES & FEMALES */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-5 border-b flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  Educational Institutions Leaderboard
                </CardTitle>
                <CardDescription className="text-xs">
                  Real cloud database ranking of educational institutions by total registered student members, male count & female count
                </CardDescription>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search school name (e.g. ABU, UMYU, FUDMA)..."
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* School Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-border/40">
              <Button
                size="sm"
                variant={schoolCategory === "all" ? "default" : "outline"}
                onClick={() => setSchoolCategory("all")}
                className={`text-xs h-7 px-3 rounded-full font-bold ${schoolCategory === "all" ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""}`}
              >
                All Institutions
              </Button>
              <Button
                size="sm"
                variant={schoolCategory === "university" ? "default" : "outline"}
                onClick={() => setSchoolCategory("university")}
                className={`text-xs h-7 px-3 rounded-full font-bold ${schoolCategory === "university" ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""}`}
              >
                🏛️ Universities
              </Button>
              <Button
                size="sm"
                variant={schoolCategory === "polytechnic" ? "default" : "outline"}
                onClick={() => setSchoolCategory("polytechnic")}
                className={`text-xs h-7 px-3 rounded-full font-bold ${schoolCategory === "polytechnic" ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""}`}
              >
                ⚙️ Polytechnics
              </Button>
              <Button
                size="sm"
                variant={schoolCategory === "college" ? "default" : "outline"}
                onClick={() => setSchoolCategory("college")}
                className={`text-xs h-7 px-3 rounded-full font-bold ${schoolCategory === "college" ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""}`}
              >
                🎓 Colleges of Education
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold text-xs w-12 text-center">Rank</TableHead>
                  <TableHead className="font-bold text-xs">Educational Institution Name</TableHead>
                  <TableHead className="font-bold text-xs text-right">Total Students</TableHead>
                  <TableHead className="font-bold text-xs text-center">👨 Male Students</TableHead>
                  <TableHead className="font-bold text-xs text-center">👩 Female Students</TableHead>
                  <TableHead className="font-bold text-xs text-center">Verified PVC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSchools ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      Loading top 10 educational institutions from cloud database...
                    </TableCell>
                  </TableRow>
                ) : filteredTop10Schools.length > 0 ? (
                  filteredTop10Schools.map((item, idx) => {
                    const mPercent = item.total > 0 ? Math.round((item.males / item.total) * 100) : 0;
                    const fPercent = item.total > 0 ? Math.round((item.females / item.total) * 100) : 0;

                    return (
                      <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center font-extrabold text-xs text-emerald-700 dark:text-emerald-400">
                          #{idx + 1}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {item.school_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="line-clamp-1">{item.school_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-extrabold text-foreground">
                          {item.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <div className="flex flex-col items-center gap-1">
                            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 text-[11px] font-bold">
                              {item.males} ({mPercent}%)
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <div className="flex flex-col items-center gap-1">
                            <Badge className="bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 text-[11px] font-bold">
                              {item.females} ({fPercent}%)
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] border-emerald-300">
                            ✓ {item.verified} Verified
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No student educational institutions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Real Organizations / Campus Groups & Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Registered Campus Organizations (2 cols) */}
          <Card className="lg:col-span-2 border border-border/60 shadow-sm">
            <CardHeader className="p-5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Campus Support Groups & Student Organizations
                </CardTitle>
                <CardDescription className="text-xs">
                  Registered student organizations and campus chapters
                </CardDescription>
              </div>
              <Link href="/support-groups">
                <Button size="sm" variant="ghost" className="text-xs gap-1 text-emerald-600">
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-bold text-xs">Organization Name</TableHead>
                    <TableHead className="font-bold text-xs">LGA / Location</TableHead>
                    <TableHead className="font-bold text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOrgs ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                        Loading organizations...
                      </TableCell>
                    </TableRow>
                  ) : organizationsList.length > 0 ? (
                    organizationsList.map((org: any) => (
                      <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-xs text-foreground">
                          {org.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {org.lga || "Katsina State"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] border-emerald-300">
                            {org.verification_status || "Verified"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                        No student organizations recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Activities / Field Events (1 col) */}
          <Card className="lg:col-span-1 border border-border/60 shadow-sm flex flex-col">
            <CardHeader className="p-5 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Latest Student Activities
              </CardTitle>
              <CardDescription className="text-xs">
                Campus outreach and student events
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 space-y-3">
              {loadingActivities ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Loading campus activities...
                </div>
              ) : activitiesList.length > 0 ? (
                activitiesList.map((act: any) => (
                  <div key={act.id} className="p-3 rounded-xl border bg-muted/20 space-y-1">
                    <h4 className="font-bold text-xs text-foreground">{act.title || "Campus Event"}</h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600 inline" /> {act.lga || "Katsina"} · {act.ward || "Statewide"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No campus activities recorded yet.
                </div>
              )}

              <Link href="/events">
                <Button className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-1.5">
                  View Events <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Real Cloud LGA Student Mobilization Breakdown */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                LGA Student Member Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Real student member count per Local Government Area in Katsina State
              </CardDescription>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter LGA by name..."
                value={searchLga}
                onChange={(e) => setSearchLga(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="max-h-[380px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold text-xs">Local Government Area (LGA)</TableHead>
                    <TableHead className="font-bold text-xs text-right">Total Students</TableHead>
                    <TableHead className="font-bold text-xs text-right">Verified Student PVC</TableHead>
                    <TableHead className="font-bold text-xs text-center">👨 Male Students</TableHead>
                    <TableHead className="font-bold text-xs text-center">👩 Female Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLga ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        Loading student LGA breakdown...
                      </TableCell>
                    </TableRow>
                  ) : filteredLgaBreakdown.length > 0 ? (
                    filteredLgaBreakdown.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-xs text-foreground">
                          {item.lga} LGA
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold">
                          {item.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-extrabold text-emerald-600">
                          {item.verified.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <span className="font-semibold text-blue-700 dark:text-blue-300">{item.males}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <span className="font-semibold text-pink-700 dark:text-pink-300">{item.females}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        No student records found for LGAs.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        isStudentOnly={true}
      />
    </DashboardLayout>
  );
}
