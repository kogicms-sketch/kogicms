"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Calendar, TrendingUp, Users, Activity } from "lucide-react";
import { useChartData } from "@/hooks/useChartData";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";

const memberGrowthData = [
  { month: "Jul", members: 18500 },
  { month: "Aug", members: 20200 },
  { month: "Sep", members: 21800 },
  { month: "Oct", members: 23500 },
  { month: "Nov", members: 25100 },
  { month: "Dec", members: 26890 },
];

const activityData = [
  { month: "Jul", activities: 98, engagement: 78 },
  { month: "Aug", activities: 112, engagement: 82 },
  { month: "Sep", activities: 124, engagement: 85 },
  { month: "Oct", activities: 135, engagement: 88 },
  { month: "Nov", activities: 148, engagement: 91 },
  { month: "Dec", activities: 142, engagement: 94 },
];

const organizationTypeData = [
  { name: "Youth Groups", value: 35, color: "hsl(220, 60%, 12%)" },
  { name: "Women Groups", value: 28, color: "hsl(0, 75%, 50%)" },
  { name: "Professionals", value: 18, color: "hsl(145, 65%, 42%)" },
  { name: "Community", value: 12, color: "hsl(38, 95%, 55%)" },
  { name: "Others", value: 7, color: "hsl(220, 40%, 50%)" },
];

const statePerformance = [
  { state: "Lagos", score: 95, members: 4250 },
  { state: "Kano", score: 88, members: 3890 },
  { state: "Rivers", score: 85, members: 3200 },
  { state: "FCT", score: 82, members: 2980 },
  { state: "Kaduna", score: 79, members: 2650 },
  { state: "Oyo", score: 76, members: 2400 },
];

const Reports = () => {
  const { organizationId } = useAuth();
  const { monthlyGrowth, organizationDistribution, lgaDistribution } = useChartData(organizationId);
  const { data: stats } = useDashboardStats(organizationId);

  const growthData = monthlyGrowth.data || [];
  const orgTypeData = organizationDistribution.data || [];
  const lgaData = lgaDistribution.data || [];

  return (
    <DashboardLayout
      title="Reports & Analytics"
      subtitle="Campaign performance insights and data visualization"
    >
      {/* Action Bar */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3 p-1 bg-muted rounded-lg">
          {["7 Days", "30 Days", "90 Days", "Year"].map((period) => (
            <button
              key={period}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${period === "30 Days"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {period}
            </button>
          ))}
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger-children">
        <div className="kpi-card-accent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/70">Total Members</p>
              <p className="text-2xl font-bold text-white">{stats?.members.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Activity className="w-5 h-5 text-navy-deep" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activities</p>
              <p className="text-2xl font-bold text-foreground">{stats?.activities.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Engagement</p>
              <p className="text-2xl font-bold text-foreground">{stats?.engagementRate || 0}%</p>
            </div>
          </div>
        </div>
        <div className="kpi-card-danger">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/70">Active Members</p>
              <p className="text-2xl font-bold text-white">{stats?.members.active || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Member Growth */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Member Growth Trend
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            New registered members over time
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 88%)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid hsl(220, 20%, 88%)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="members"
                stroke="hsl(220, 60%, 12%)"
                strokeWidth={3}
                dot={{ fill: "hsl(220, 60%, 12%)", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Performance */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Activity Performance
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Monthly activities count
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 88%)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid hsl(220, 20%, 88%)",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="activities"
                fill="hsl(220, 60%, 12%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Types */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Organization Structure
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Distribution by type
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={orgTypeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {orgTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid hsl(220, 20%, 88%)",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {orgTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top States (Renamed to Top LGAs) */}
        <div className="chart-container lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Top Performing LGAs
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            By member count
          </p>
          <div className="space-y-4">
            {lgaData.map((item, index) => {
              // Calculate "score" as relative percentage of max
              const max = lgaData[0]?.members || 1;
              const score = Math.round((item.members / max) * 100);

              return (
                <div key={item.lga} className="flex items-center gap-4">
                  <span className="w-20 text-sm font-medium text-foreground">
                    {item.lga}
                  </span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-navy-deep to-navy-light rounded-full transition-all duration-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm font-semibold text-foreground text-right">
                    {score}%
                  </span>
                  <span className="w-20 text-sm text-muted-foreground text-right">
                    {item.members.toLocaleString()}
                  </span>
                </div>
              );
            })}
            {lgaData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No location data available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
