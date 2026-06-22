"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDemographicsData } from "@/hooks/useDemographicsData";
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  HeartCrack, 
  Loader2, 
  ShieldCheck, 
  Compass,
  AlertCircle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from "recharts";

interface GranularDemographicsProps {
  lga?: string;
  lgas?: string[];
  ward?: string;
  totalRegisteredVoters: number;
}

export const GranularDemographics = ({
  lga,
  lgas,
  ward,
  totalRegisteredVoters,
}: GranularDemographicsProps) => {
  const { data: stats, isLoading, error } = useDemographicsData({ lga, lgas, ward });

  if (isLoading) {
    return (
      <Card className="w-full border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading demographic statistics...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="w-full border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm font-semibold text-destructive">Failed to load demographics data</p>
        </CardContent>
      </Card>
    );
  }

  // APC Premium Color Palette
  const colors = {
    apcBlue: "#0B3D91",   // Main Blue
    apcGreen: "#006600",  // Success/Verified Green
    apcRed: "#E30613",    // Attrition Red
    apcOrange: "#FF8C00", // Leftovers Orange
    apcYellow: "#FFC107"  // Teenagers Yellow
  };

  const totalActive = stats.totalRegistered;
  const expectedTurnout = stats.expectedTurnout;
  const leftoversCount = Math.max(0, totalRegisteredVoters - expectedTurnout - stats.deathsCount);

  const maleCount = stats.genderSplit.male;
  const femaleCount = stats.genderSplit.female;
  const genderTotal = maleCount + femaleCount;
  
  const malePct = genderTotal > 0 ? Math.round((maleCount / genderTotal) * 100) : 0;
  const femalePct = genderTotal > 0 ? Math.round((femaleCount / genderTotal) * 100) : 0;

  const ageData = [
    { name: "Teenagers (<20)", count: stats.ageGroups.teenagers, color: colors.apcYellow },
    { name: "Youths (20-35)", count: stats.ageGroups.youths, color: colors.apcBlue },
    { name: "Middle-Aged (36-59)", count: stats.ageGroups.apcGreen || stats.ageGroups.middleAged, color: colors.apcGreen },
    { name: "Seniors (60+)", count: stats.ageGroups.seniors, color: colors.apcRed },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" />
          Granular Voter Demographics & Turnout Analytics
        </h3>
        <p className="text-xs text-muted-foreground">
          Real-time analysis of registered support groups, gender metrics, age ratios, voter turnout projections, and deceased attrition.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Database Supporters */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Database Supporters</p>
              <h4 className="text-xl font-extrabold text-foreground">{totalActive.toLocaleString()}</h4>
              <p className="text-[10px] text-muted-foreground">Excludes deceased</p>
            </div>
          </CardContent>
        </Card>

        {/* Expected Turnout (Verified Support) */}
        <Card className="border border-l-4 border-l-green-600 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Expected Turnout</p>
              <h4 className="text-xl font-extrabold text-green-700 dark:text-green-500">{expectedTurnout.toLocaleString()}</h4>
              <p className="text-[10px] text-muted-foreground">Verified & active members</p>
            </div>
          </CardContent>
        </Card>

        {/* Leftovers (Unaccounted/Unmobilized) */}
        <Card className="border border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Leftover Voters</p>
              <h4 className="text-xl font-extrabold text-orange-600 dark:text-orange-400">{leftoversCount.toLocaleString()}</h4>
              <p className="text-[10px] text-muted-foreground">Remaining target voters</p>
            </div>
          </CardContent>
        </Card>

        {/* Voter Attrition (Total Deaths) */}
        <Card className="border border-l-4 border-l-red-600 shadow-sm bg-red-50/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 shrink-0">
              <HeartCrack className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Deaths</p>
              <h4 className="text-xl font-extrabold text-red-600 dark:text-red-500">{stats.deathsCount.toLocaleString()}</h4>
              <p className="text-[10px] text-muted-foreground">Deceased voter logs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Split Visual Panel */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">Gender Split</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Active supporters breakdown by gender</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="font-semibold text-blue-600">Male: </span>
                <span className="font-bold text-foreground">{maleCount.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-1">({malePct}%)</span>
              </div>
              <div>
                <span className="font-semibold text-pink-600">Female: </span>
                <span className="font-bold text-foreground">{femaleCount.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-1">({femalePct}%)</span>
              </div>
            </div>

            {/* Progress Bar Split */}
            <div className="w-full h-5 rounded-full overflow-hidden flex bg-muted">
              <div 
                style={{ width: `${malePct}%`, backgroundColor: colors.apcBlue }} 
                className="h-full transition-all duration-500" 
                title={`Male: ${malePct}%`}
              />
              <div 
                style={{ width: `${femalePct}%`, backgroundColor: "#EC4899" }} 
                className="h-full transition-all duration-500" 
                title={`Female: ${femalePct}%`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/30">
                <span className="text-xs text-muted-foreground">Male Support Ratio</span>
                <h5 className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{malePct}%</h5>
              </div>
              <div className="p-3 rounded-lg bg-pink-50/50 dark:bg-pink-900/10 border border-pink-100/30">
                <span className="text-xs text-muted-foreground">Female Support Ratio</span>
                <h5 className="text-lg font-bold text-pink-600 mt-1">{femalePct}%</h5>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Age Groups Analysis */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">Age Demographics</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Distribution of active members across generation groups</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ageData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
