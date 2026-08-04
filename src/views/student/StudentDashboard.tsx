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
  Zap,
  Gift,
  RefreshCcw,
  Sparkles,
  PieChart as PieChartIcon
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
import Link from "next/link";

export default function StudentDashboard() {
  const [searchLga, setSearchLga] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  // 1. Fetch Real Live Member Metrics from Supabase Cloud
  const {
    data: cloudMetrics,
    isLoading: loadingMetrics,
    refetch: refetchMetrics,
    isRefetching: refetchingMetrics
  } = useQuery({
    queryKey: ["student-dashboard-cloud-metrics"],
    queryFn: async () => {
      const { data: members, error: memberErr } = await supabase
        .from("members")
        .select("id, full_name, gender, is_verified, school_name, lga, ward, occupation");

      if (memberErr) throw memberErr;

      const allMembers = members || [];
      const totalMembers = allMembers.length;
      const verifiedMembers = allMembers.filter((m) => m.is_verified).length;
      const malesCount = allMembers.filter((m) => (m.gender || "").toLowerCase() === "male").length;
      const femalesCount = allMembers.filter((m) => (m.gender || "").toLowerCase() === "female").length;

      // Query organizations from cloud
      const { count: totalOrgs, error: orgErr } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });

      // Query member incentives from cloud
      const { count: totalIncentives } = await supabase
        .from("member_incentives")
        .select("*", { count: "exact", head: true });

      // Query activities from cloud
      const { count: totalActivities } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true });

      return {
        totalMembers,
        verifiedMembers,
        malesCount,
        femalesCount,
        totalOrgs: totalOrgs || 0,
        totalIncentives: totalIncentives || 0,
        totalActivities: totalActivities || 0,
      };
    },
    refetchInterval: 30000, // auto refresh every 30 seconds
  });

  // 2. Fetch Top 10 Schools/Institutions with Male & Female Breakdown Live from Cloud
  const { data: topSchools = [], isLoading: loadingSchools } = useQuery({
    queryKey: ["student-top-schools-cloud-db"],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("members")
        .select("school_name, gender, is_verified")
        .not("school_name", "is", null)
        .neq("school_name", "");

      if (error) throw error;

      const schoolMap: Record<
        string,
        { school_name: string; total: number; males: number; females: number; verified: number }
      > = {};

      (members || []).forEach((m) => {
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

        if (m.is_verified) {
          schoolMap[rawName].verified += 1;
        }
      });

      // Sort by total student count descending
      const sorted = Object.values(schoolMap).sort((a, b) => b.total - a.total);
      return sorted;
    },
    refetchInterval: 30000,
  });

  // Filtered Top 10 Schools
  const filteredTop10Schools = useMemo(() => {
    let list = topSchools;
    if (schoolSearch.trim()) {
      list = list.filter((s) =>
        s.school_name.toLowerCase().includes(schoolSearch.toLowerCase())
      );
    }
    return list.slice(0, 10);
  }, [topSchools, schoolSearch]);

  // 3. Fetch Organizations / Campus Groups Live from Cloud
  const { data: organizationsList = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ["student-dashboard-orgs-cloud"],
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

  // 4. Fetch Activities / Events Live from Cloud
  const { data: activitiesList = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["student-dashboard-activities-cloud"],
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

  // 5. Fetch LGA Breakdown Live from Cloud Members Table
  const { data: lgaBreakdown = [], isLoading: loadingLga } = useQuery({
    queryKey: ["student-lga-breakdown-cloud"],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("members")
        .select("lga, gender, is_verified");

      if (error) throw error;

      const lgaMap: Record<
        string,
        { lga: string; total: number; verified: number; males: number; females: number }
      > = {};

      (members || []).forEach((m) => {
        const lgaName = (m.lga || "Katsina").trim();
        if (!lgaMap[lgaName]) {
          lgaMap[lgaName] = { lga: lgaName, total: 0, verified: 0, males: 0, females: 0 };
        }
        lgaMap[lgaName].total += 1;
        if (m.is_verified) lgaMap[lgaName].verified += 1;
        const g = (m.gender || "").toLowerCase();
        if (g === "male") lgaMap[lgaName].males += 1;
        if (g === "female") lgaMap[lgaName].females += 1;
      });

      return Object.values(lgaMap).sort((a, b) => b.total - a.total);
    },
  });

  // Filtered LGA list
  const filteredLgaBreakdown = useMemo(() => {
    if (!searchLga.trim()) return lgaBreakdown;
    return lgaBreakdown.filter((item) =>
      item.lga.toLowerCase().includes(searchLga.toLowerCase())
    );
  }, [lgaBreakdown, searchLga]);

  // Derived percentages
  const total = cloudMetrics?.totalMembers || 0;
  const verified = cloudMetrics?.verifiedMembers || 0;
  const males = cloudMetrics?.malesCount || 0;
  const females = cloudMetrics?.femalesCount || 0;

  const verifiedPercent = total > 0 ? Math.round((verified / total) * 100) : 0;
  const malePercent = total > 0 ? Math.round((males / total) * 100) : 0;
  const femalePercent = total > 0 ? Math.round((females / total) * 100) : 0;

  return (
    <DashboardLayout
      title="Student Campaign & Youth Affairs Dashboard"
      subtitle="Real-time live database analytics tracking student registrations, institutions, gender breakdown, and campus mobilization in Katsina State"
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
                  Live Cloud Database Connected
                </Badge>
                <Badge variant="outline" className="text-emerald-200 border-emerald-400/30 text-xs">
                  Katsina State Campaign Network
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Dikko Radda Student & Youth Affairs Dashboard
              </h1>
              <p className="text-emerald-100/90 text-sm leading-relaxed">
                Live analytics directly synced with cloud database records for student mobilization, top tertiary institutions, gender demographics, and campus support group networks.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => refetchMetrics()}
                disabled={refetchingMetrics}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md gap-2 w-full sm:w-auto text-xs"
              >
                <RefreshCcw className={`w-4 h-4 ${refetchingMetrics ? "animate-spin" : ""}`} />
                {refetchingMetrics ? "Syncing..." : "Sync Live Data"}
              </Button>
              <Link href="/members">
                <Button variant="outline" className="border-emerald-400/40 bg-emerald-950/40 text-white hover:bg-emerald-800/60 gap-2 w-full sm:w-auto text-xs">
                  <Users className="w-4 h-4" />
                  View All Members
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Top 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="h-1 bg-emerald-500 absolute top-0 left-0 right-0" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Student / Youth Members
                </p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-foreground">
                  {loadingMetrics ? "..." : total.toLocaleString()}
                </h3>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Real-time cloud count
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
                  Verified Members (PVC)
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
                  <Building2 className="w-3.5 h-3.5" /> Registered Organizations
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
                  Incentives & Welfare
                </p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-1 text-foreground">
                  {loadingMetrics ? "..." : (cloudMetrics?.totalIncentives || 0).toLocaleString()}
                </h3>
                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-1">
                  <Gift className="w-3.5 h-3.5" /> Cloud welfare records
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Award className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gender Breakdown Card: Males vs Females */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-600" />
                Gender Demographics Distribution (Males vs Females)
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time male and female student membership counts across Katsina State
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300">
                👨 Male: {males.toLocaleString()} ({malePercent}%)
              </Badge>
              <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200 border-pink-300">
                👩 Female: {females.toLocaleString()} ({femalePercent}%)
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
                    Male Students / Youth
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
                    Female Students / Youth
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
                <span>Male Ratio ({malePercent}%)</span>
                <span>Female Ratio ({femalePercent}%)</span>
              </div>
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-muted">
                <div style={{ width: `${malePercent}%` }} className="bg-blue-600 transition-all duration-500" />
                <div style={{ width: `${femalePercent}%` }} className="bg-pink-500 transition-all duration-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TOP 10 SCHOOLS & INSTITUTIONS TABLE WITH MALES & FEMALES */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                Top 10 Schools & Institutions with Most Students
              </CardTitle>
              <CardDescription className="text-xs">
                Real cloud database breakdown of schools ranking by total registered student members, male count & female count
              </CardDescription>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search school name..."
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold text-xs w-12 text-center">Rank</TableHead>
                  <TableHead className="font-bold text-xs">School / Tertiary Institution Name</TableHead>
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
                      Loading top 10 schools from cloud database...
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
                      No schools found matching search criteria.
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
                  Campus Support Groups & Organizations (Cloud Database)
                </CardTitle>
                <CardDescription className="text-xs">
                  Official support group records stored in cloud database
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
                        No organizations recorded yet.
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
                Latest Field Activities (Cloud)
              </CardTitle>
              <CardDescription className="text-xs">
                Recent campaign activities logged in the database
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 space-y-3">
              {loadingActivities ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Loading field activities...
                </div>
              ) : activitiesList.length > 0 ? (
                activitiesList.map((act: any) => (
                  <div key={act.id} className="p-3 rounded-xl border bg-muted/20 space-y-1">
                    <h4 className="font-bold text-xs text-foreground">{act.title || "Campaign Event"}</h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600 inline" /> {act.lga || "Katsina"} · {act.ward || "Statewide"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No field activities recorded yet.
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

        {/* Real Cloud LGA Mobilization Breakdown */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Real Cloud LGA Student & Youth Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Real student member records grouped by Local Government Area from Supabase database
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
                    <TableHead className="font-bold text-xs text-right">Total Registered</TableHead>
                    <TableHead className="font-bold text-xs text-right">Verified PVC</TableHead>
                    <TableHead className="font-bold text-xs text-center">👨 Males</TableHead>
                    <TableHead className="font-bold text-xs text-center">👩 Females</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLga ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        Loading LGA breakdown from cloud...
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
                        No LGA records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
