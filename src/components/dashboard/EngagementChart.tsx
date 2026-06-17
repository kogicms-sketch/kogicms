"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useChartData } from "@/hooks/useChartData";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const EngagementChart = () => {
  const { organizationId } = useAuth();
  const { monthlyGrowth } = useChartData(organizationId);
  
  const data = monthlyGrowth.data || [];
  const isLoading = monthlyGrowth.isLoading;

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Growth & Engagement
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Member growth and activity trends
            </p>
          </div>
        </div>
        <Skeleton className="w-full h-[250px] sm:h-[300px]" />
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Growth & Engagement
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Member growth and activity trends
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-navy-deep" />
            <span className="text-xs sm:text-sm text-muted-foreground">Members</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-power-red" />
            <span className="text-xs sm:text-sm text-muted-foreground">Activities</span>
          </div>
        </div>
      </div>

      {/* Mobile Chart */}
      <div className="sm:hidden">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorMembersMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220, 60%, 12%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(220, 60%, 12%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorActivitiesMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 75%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 75%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 88%)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 10 }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid hsl(220, 20%, 88%)",
                borderRadius: "8px",
                boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.1)",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="members"
              stroke="hsl(220, 60%, 12%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMembersMobile)"
            />
            <Area
              type="monotone"
              dataKey="activities"
              stroke="hsl(0, 75%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorActivitiesMobile)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Desktop Chart */}
      <div className="hidden sm:block">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220, 60%, 12%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(220, 60%, 12%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 75%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 75%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
                boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="members"
              stroke="hsl(220, 60%, 12%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMembers)"
            />
            <Area
              type="monotone"
              dataKey="activities"
              stroke="hsl(0, 75%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorActivities)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EngagementChart;
