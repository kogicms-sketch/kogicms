"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useChartData } from "@/hooks/useChartData";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

const RegionalPerformance = () => {
  const { organizationId } = useAuth();
  const { lgaDistribution } = useChartData(organizationId);
  
  const data = lgaDistribution.data || [];
  const isLoading = lgaDistribution.isLoading;

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Regional Performance
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Member distribution by top LGAs
          </p>
        </div>
        <Skeleton className="w-full h-[240px] sm:h-[280px]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="chart-container">
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Regional Performance
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Member distribution by top LGAs
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No regional data yet</p>
          <p className="text-sm text-muted-foreground">Add members with LGA info to see distribution</p>
        </div>
      </div>
    );
  }

  // Transform data for chart (use 'lga' as the category key)
  const chartData = data.map(item => ({
    region: item.lga,
    members: item.members,
  }));

  return (
    <div className="chart-container">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">
          Regional Performance
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Member distribution by top LGAs
        </p>
      </div>

      {/* Mobile Chart */}
      <div className="sm:hidden">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 20%, 88%)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="region"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 10 }}
              width={70}
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
            <Bar
              dataKey="members"
              fill="hsl(220, 60%, 12%)"
              radius={[0, 4, 4, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Desktop Chart */}
      <div className="hidden sm:block">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 20%, 88%)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="region"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 12 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid hsl(220, 20%, 88%)",
                borderRadius: "8px",
                boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Bar
              dataKey="members"
              fill="hsl(220, 60%, 12%)"
              radius={[0, 4, 4, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RegionalPerformance;
