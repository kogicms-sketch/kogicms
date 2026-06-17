"use client";
import React, { useMemo } from "react";
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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BarChart2, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegistryVoter {
  id: string;
  gender?: string | null;
  dob_year?: number | null;
  voter_status?: string;
}

interface Props {
  voters: RegistryVoter[];
  isLoading?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();

const GENDER_COLORS = {
  Male:   "#3b82f6", // blue-500
  Female: "#ec4899", // pink-500
  Unknown:"#94a3b8", // slate-400
};

const AGE_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#6366f1"];

const AGE_GROUPS = [
  { key: "youth18_25",   label: "Teenagers (18–25)",  min: 18, max: 25, color: "#8b5cf6" },
  { key: "youth26_40",   label: "Youth (26–40)",       min: 26, max: 40, color: "#10b981" },
  { key: "senior41plus", label: "Senior (41+)",         min: 41, max: Infinity, color: "#f59e0b" },
  { key: "unknown",      label: "Age Unknown",          min: -1, max: -1, color: "#94a3b8" },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, value, payload: p } = payload[0];
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-2.5 text-sm">
        <p className="font-semibold text-slate-800">{name}</p>
        <p className="text-slate-600">
          Count: <span className="font-bold text-slate-900">{value.toLocaleString()}</span>
        </p>
        <p className="text-slate-500">Share: {p.pct}%</p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-2.5 text-sm">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.fill }} className="font-medium">
            {entry.name}: <span className="font-bold">{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, pct, color, icon,
}: {
  label: string; value: number; pct: number; color: string; icon: React.ReactNode;
}) => (
  <div
    className="relative overflow-hidden rounded-xl border p-4 flex flex-col gap-2 transition-all hover:shadow-md"
    style={{ borderColor: color + "44", background: color + "0d" }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span style={{ color }} className="opacity-80">{icon}</span>
    </div>
    <div className="flex items-end gap-2">
      <span className="text-2xl font-extrabold text-slate-900">{value.toLocaleString()}</span>
      <span
        className="mb-0.5 text-sm font-bold rounded-full px-2 py-0.5"
        style={{ color, background: color + "22" }}
      >
        {pct}%
      </span>
    </div>
    {/* Mini progress bar */}
    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const VoterDemographicsChart: React.FC<Props> = ({ voters, isLoading }) => {
  const stats = useMemo(() => {
    if (!voters || voters.length === 0) return null;

    // Filter to alive voters only for demographics relevance
    const activeVoters = voters.filter((v) => v.voter_status !== "deceased");
    const total = activeVoters.length;

    // ── Gender ──
    const maleCount   = activeVoters.filter((v) => v.gender?.toUpperCase() === "M").length;
    const femaleCount = activeVoters.filter((v) => v.gender?.toUpperCase() === "F").length;
    const unknownGenderCount = total - maleCount - femaleCount;

    const genderData = [
      { name: "Male",    value: maleCount,          pct: total > 0 ? Math.round((maleCount / total) * 100) : 0,   color: GENDER_COLORS.Male },
      { name: "Female",  value: femaleCount,         pct: total > 0 ? Math.round((femaleCount / total) * 100) : 0, color: GENDER_COLORS.Female },
      ...(unknownGenderCount > 0
        ? [{ name: "Unknown", value: unknownGenderCount, pct: total > 0 ? Math.round((unknownGenderCount / total) * 100) : 0, color: GENDER_COLORS.Unknown }]
        : []),
    ].filter((d) => d.value > 0);

    // ── Age Groups ──
    let teens = 0, youth = 0, senior = 0, ageUnknown = 0;

    activeVoters.forEach((v) => {
      if (!v.dob_year || v.dob_year < 1900) {
        ageUnknown++;
        return;
      }
      const age = CURRENT_YEAR - v.dob_year;
      if (age >= 18 && age <= 25)      teens++;
      else if (age >= 26 && age <= 40) youth++;
      else if (age >= 41)              senior++;
      else                             ageUnknown++;
    });

    const ageData = [
      { name: "Teenagers (18–25)", value: teens,      pct: total > 0 ? Math.round((teens / total) * 100) : 0,      color: "#8b5cf6" },
      { name: "Youth (26–40)",     value: youth,      pct: total > 0 ? Math.round((youth / total) * 100) : 0,      color: "#10b981" },
      { name: "Senior (41+)",      value: senior,     pct: total > 0 ? Math.round((senior / total) * 100) : 0,     color: "#f59e0b" },
      ...(ageUnknown > 0
        ? [{ name: "Age Unknown", value: ageUnknown, pct: total > 0 ? Math.round((ageUnknown / total) * 100) : 0, color: "#94a3b8" }]
        : []),
    ].filter((d) => d.value > 0);

    // ── Gender × Age cross-breakdown (bar chart) ──
    const crossData = [
      {
        name: "Teenagers\n(18–25)",
        Male:   activeVoters.filter((v) => v.gender?.toUpperCase() === "M" && v.dob_year && CURRENT_YEAR - v.dob_year >= 18 && CURRENT_YEAR - v.dob_year <= 25).length,
        Female: activeVoters.filter((v) => v.gender?.toUpperCase() === "F" && v.dob_year && CURRENT_YEAR - v.dob_year >= 18 && CURRENT_YEAR - v.dob_year <= 25).length,
      },
      {
        name: "Youth\n(26–40)",
        Male:   activeVoters.filter((v) => v.gender?.toUpperCase() === "M" && v.dob_year && CURRENT_YEAR - v.dob_year >= 26 && CURRENT_YEAR - v.dob_year <= 40).length,
        Female: activeVoters.filter((v) => v.gender?.toUpperCase() === "F" && v.dob_year && CURRENT_YEAR - v.dob_year >= 26 && CURRENT_YEAR - v.dob_year <= 40).length,
      },
      {
        name: "Senior\n(41+)",
        Male:   activeVoters.filter((v) => v.gender?.toUpperCase() === "M" && v.dob_year && CURRENT_YEAR - v.dob_year >= 41).length,
        Female: activeVoters.filter((v) => v.gender?.toUpperCase() === "F" && v.dob_year && CURRENT_YEAR - v.dob_year >= 41).length,
      },
    ];

    return { total, genderData, ageData, crossData, maleCount, femaleCount, teens, youth, senior };
  }, [voters]);

  if (isLoading) {
    return (
      <Card className="col-span-full animate-pulse">
        <CardContent className="h-60 flex items-center justify-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p>No voter data available to show demographics.</p>
        </CardContent>
      </Card>
    );
  }

  const { total, genderData, ageData, crossData, maleCount, femaleCount, teens, youth, senior } = stats;

  return (
    <Card className="col-span-full shadow-sm border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-500" />
          Voter Demographics &amp; Trends
        </CardTitle>
        <CardDescription>
          Gender and age-group breakdown of all active registered voters in this polling unit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">

        {/* ── Stat Cards Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Active"
            value={total}
            pct={100}
            color="#6366f1"
            icon={<Users className="w-4 h-4" />}
          />
          <StatCard
            label="Male"
            value={maleCount}
            pct={total > 0 ? Math.round((maleCount / total) * 100) : 0}
            color={GENDER_COLORS.Male}
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M9 11.75A2.25 2.25 0 1 1 11.25 14 2.25 2.25 0 0 1 9 11.75M14 2h6v6l-2.3-2.3-7 7a6 6 0 1 1-1.4-1.4l7-7z"/>
              </svg>
            }
          />
          <StatCard
            label="Female"
            value={femaleCount}
            pct={total > 0 ? Math.round((femaleCount / total) * 100) : 0}
            color={GENDER_COLORS.Female}
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M11 2a7 7 0 1 1 0 14A7 7 0 0 1 11 2m0 16v4m-4-2h8"/>
              </svg>
            }
          />
          <StatCard
            label="Teenagers 18–25"
            value={teens}
            pct={total > 0 ? Math.round((teens / total) * 100) : 0}
            color="#8b5cf6"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <StatCard
            label="Youth 26–40"
            value={youth}
            pct={total > 0 ? Math.round((youth / total) * 100) : 0}
            color="#10b981"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pie — Gender */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Gender Split
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {genderData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  formatter={(value, entry: any) => (
                    <span className="text-xs text-slate-600">
                      {value} — {entry.payload?.value?.toLocaleString()}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Pie — Age Groups */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              Age Group Distribution
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={ageData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={100}
                  animationDuration={800}
                >
                  {ageData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  formatter={(value, entry: any) => (
                    <span className="text-xs text-slate-600">
                      {value} — {entry.payload?.value?.toLocaleString()}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar — Gender × Age cross */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Male vs Female by Age Group
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={crossData} barCategoryGap="30%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f1f5f950" }} />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-600">{value}</span>
                  )}
                />
                <Bar dataKey="Male"   fill={GENDER_COLORS.Male}   radius={[4, 4, 0, 0]} animationDuration={700} />
                <Bar dataKey="Female" fill={GENDER_COLORS.Female} radius={[4, 4, 0, 0]} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Detailed Table ── */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Detailed Demographics Breakdown</h4>
          <div className="overflow-hidden rounded-xl border border-slate-200 text-sm">
            {/* Header */}
            <div className="grid grid-cols-5 bg-slate-50 px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-slate-500 border-b">
              <span>Category</span>
              <span className="text-right">Total</span>
              <span className="text-right">Male</span>
              <span className="text-right">Female</span>
              <span className="text-right">Share</span>
            </div>

            {/* Gender rows */}
            {[
              { label: "👨 All Males",           total: maleCount,   male: maleCount,   female: 0,            pct: Math.round((maleCount / total) * 100),   color: GENDER_COLORS.Male },
              { label: "👩 All Females",          total: femaleCount, male: 0,           female: femaleCount,  pct: Math.round((femaleCount / total) * 100),  color: GENDER_COLORS.Female },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-5 px-4 py-3 border-b hover:bg-slate-50 transition-colors items-center">
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="text-right font-bold text-slate-900">{row.total.toLocaleString()}</span>
                <span className="text-right text-blue-600 font-semibold">{row.male > 0 ? row.male.toLocaleString() : "—"}</span>
                <span className="text-right text-pink-600 font-semibold">{row.female > 0 ? row.female.toLocaleString() : "—"}</span>
                <span className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: row.color + "22", color: row.color }}>
                    {row.pct}%
                  </span>
                </span>
              </div>
            ))}

            {/* Divider */}
            <div className="bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b">
              Age Group Breakdown
            </div>

            {/* Age group rows — compute male/female per group */}
            {[
              {
                label: "🧑 Teenagers (18–25)",
                color: "#8b5cf6",
                voters: voters?.filter((v) => v.voter_status !== "deceased" && v.dob_year && CURRENT_YEAR - v.dob_year >= 18 && CURRENT_YEAR - v.dob_year <= 25) ?? [],
              },
              {
                label: "🧑‍💼 Youth (26–40)",
                color: "#10b981",
                voters: voters?.filter((v) => v.voter_status !== "deceased" && v.dob_year && CURRENT_YEAR - v.dob_year >= 26 && CURRENT_YEAR - v.dob_year <= 40) ?? [],
              },
              {
                label: "🧓 Senior (41+)",
                color: "#f59e0b",
                voters: voters?.filter((v) => v.voter_status !== "deceased" && v.dob_year && CURRENT_YEAR - v.dob_year >= 41) ?? [],
              },
            ].map((group, i) => {
              const gTotal = group.voters.length;
              const gMale  = group.voters.filter((v) => v.gender?.toUpperCase() === "M").length;
              const gFem   = group.voters.filter((v) => v.gender?.toUpperCase() === "F").length;
              const gPct   = total > 0 ? Math.round((gTotal / total) * 100) : 0;
              return (
                <div key={i} className={`grid grid-cols-5 px-4 py-3 border-b hover:bg-slate-50 transition-colors items-center ${i === 2 ? "" : ""}`}>
                  <span className="font-medium text-slate-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: group.color }} />
                    {group.label}
                  </span>
                  <span className="text-right font-bold text-slate-900">{gTotal.toLocaleString()}</span>
                  <span className="text-right text-blue-600 font-semibold">{gMale.toLocaleString()}</span>
                  <span className="text-right text-pink-600 font-semibold">{gFem.toLocaleString()}</span>
                  <span className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: group.color + "22", color: group.color }}>
                      {gPct}%
                    </span>
                  </span>
                </div>
              );
            })}

            {/* Total row */}
            <div className="grid grid-cols-5 px-4 py-3 bg-indigo-50 border-t-2 border-indigo-100 font-bold text-slate-900 items-center">
              <span className="text-indigo-700">📊 Total Active Voters</span>
              <span className="text-right text-indigo-900">{total.toLocaleString()}</span>
              <span className="text-right text-blue-700">{maleCount.toLocaleString()}</span>
              <span className="text-right text-pink-700">{femaleCount.toLocaleString()}</span>
              <span className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-200 text-indigo-700">100%</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoterDemographicsChart;
