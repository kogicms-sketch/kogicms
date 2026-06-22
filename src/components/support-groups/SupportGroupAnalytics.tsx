"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Users, ShieldCheck, CheckCircle2, TrendingUp, Calendar, Heart } from "lucide-react";
import { differenceInDays, subDays, startOfWeek, endOfWeek, format } from "date-fns";

interface Member {
  id: string;
  gender?: string | null;
  date_of_birth?: string | null;
  pvc_verified?: boolean;
  is_verified?: boolean;
  voters_card_id?: string | null;
  is_deceased?: boolean;
  created_at: string;
}

interface SupportGroupAnalyticsProps {
  members: Member[];
}

export function SupportGroupAnalytics({ members }: SupportGroupAnalyticsProps) {
  // Filter out deceased members for active demographics
  const activeMembers = useMemo(() => {
    return (members || []).filter((m) => !m.is_deceased);
  }, [members]);

  const deceasedCount = useMemo(() => {
    return (members || []).filter((m) => m.is_deceased).length;
  }, [members]);

  // 1. Voter Verification Counters
  const totalRegistered = activeMembers.length;
  const totalVerified = useMemo(() => {
    return activeMembers.filter(
      (m) => m.pvc_verified || m.is_verified || (m.voters_card_id && m.voters_card_id.trim() !== "")
    ).length;
  }, [activeMembers]);

  const verificationRate = totalRegistered > 0 ? Math.round((totalVerified / totalRegistered) * 100) : 0;

  // 2. Gender Distribution Data
  const genderData = useMemo(() => {
    let male = 0;
    let female = 0;
    let unspecified = 0;

    activeMembers.forEach((m) => {
      const g = m.gender?.toLowerCase();
      if (g === "male") male++;
      else if (g === "female") female++;
      else unspecified++;
    });

    const results = [];
    if (male > 0) results.push({ name: "Male", value: male, color: "#0B3D91" }); // Navy Blue
    if (female > 0) results.push({ name: "Female", value: female, color: "#EC4899" }); // Pink
    if (unspecified > 0) results.push({ name: "Unspecified", value: unspecified, color: "#6B7280" }); // Gray

    if (results.length === 0) {
      results.push({ name: "No Data", value: 1, color: "#E5E7EB" });
    }
    return results;
  }, [activeMembers]);

  // 3. Age Brackets Data
  const ageData = useMemo(() => {
    let youth = 0;       // 18-35
    let middleAged = 0;  // 36-59
    let seniors = 0;     // 60+
    let under18 = 0;

    const currentYear = new Date().getFullYear();

    activeMembers.forEach((m) => {
      if (m.date_of_birth) {
        const dobYear = new Date(m.date_of_birth).getFullYear();
        const age = currentYear - dobYear;
        if (age < 18) under18++;
        else if (age >= 18 && age <= 35) youth++;
        else if (age >= 36 && age <= 59) middleAged++;
        else if (age >= 60) seniors++;
      }
    });

    return [
      { name: "Youth (18-35)", value: youth, color: "#2563EB" },
      { name: "Middle-Aged (36-59)", value: middleAged, color: "#F59E0B" },
      { name: "Seniors (60+)", value: seniors, color: "#10B981" }
    ];
  }, [activeMembers]);

  // 4. Registration Momentum (Last 6 Weeks)
  const momentumData = useMemo(() => {
    const today = new Date();
    const weeks = [];

    // Generate 6 weekly intervals: oldest to newest
    for (let i = 5; i >= 0; i--) {
      const endOfInterval = subDays(today, i * 7);
      const startOfInterval = subDays(endOfInterval, 6);
      
      const label = i === 0 ? "This Week" : i === 1 ? "1 wk ago" : `${i} wks ago`;
      
      const count = activeMembers.filter((m) => {
        const date = new Date(m.created_at);
        return date >= startOfInterval && date <= endOfInterval;
      }).length;

      weeks.push({
        period: label,
        members: count
      });
    }

    return weeks;
  }, [activeMembers]);

  return (
    <div className="space-y-6">
      {/* VERIFICATION COUNTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-navy-deep relative overflow-hidden bg-card/60 backdrop-blur-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Registered Supporters</p>
              <h3 className="text-3xl font-black text-foreground">{totalRegistered.toLocaleString()}</h3>
              <p className="text-[10px] text-muted-foreground">Total active members onboarded</p>
            </div>
            <div className="p-3 bg-navy-deep/10 rounded-lg text-navy-deep">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-apc-green relative overflow-hidden bg-card/60 backdrop-blur-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Verified Supporters</p>
              <h3 className="text-3xl font-black text-foreground">{totalVerified.toLocaleString()}</h3>
              <p className="text-[10px] text-muted-foreground">PVC / Phone / QR verified</p>
            </div>
            <div className="p-3 bg-apc-green/10 rounded-lg text-apc-green">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 relative overflow-hidden bg-card/60 backdrop-blur-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Verification Rate</p>
              <h3 className="text-3xl font-black text-foreground">{verificationRate}%</h3>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                <div 
                  className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${verificationRate}%` }}
                />
              </div>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Gender Distribution
            </CardTitle>
            <CardDescription>Ratio of male and female registered supporters</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[220px]">
            {totalRegistered === 0 ? (
              <div className="text-muted-foreground text-xs italic py-8">No gender metrics logged</div>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-4">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '11px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2">
                  {genderData.map((g, idx) => {
                    const pct = totalRegistered > 0 ? Math.round((g.value / totalRegistered) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                        <span className="font-semibold text-foreground w-16">{g.name}:</span>
                        <span className="font-bold text-muted-foreground">{g.value} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Age segments */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-apc-red" />
              Age Segments
            </CardTitle>
            <CardDescription>Supporters demographic classification</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[220px] flex items-center justify-center">
            {activeMembers.filter(m => !!m.date_of_birth).length === 0 ? (
              <div className="text-muted-foreground text-xs italic py-8">No age metrics logged</div>
            ) : (
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#374151' }}
                      width={100}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '11px'
                      }} 
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                      {ageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* REGISTRATION MOMENTUM */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Registration Momentum (Last 6 Weeks)
          </CardTitle>
          <CardDescription>Weekly recruits onboarded during the campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={momentumData}>
                <defs>
                  <linearGradient id="colorRecruits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="period" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="members" 
                  stroke="#16a34a" 
                  fillOpacity={1} 
                  fill="url(#colorRecruits)" 
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {deceasedCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
          <span>Notice: {deceasedCount} deceased member(s) have been excluded from active analytics and mobilization lists.</span>
        </div>
      )}
    </div>
  );
}
