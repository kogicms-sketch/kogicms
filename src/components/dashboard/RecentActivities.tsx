"use client";
import { MapPin, Users, Calendar, ArrowRight } from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const statusStyles = {
  completed: "status-active",
  ongoing: "status-pending",
  planned: "status-inactive",
  cancelled: "status-inactive",
};

const statusLabels = {
  completed: "Completed",
  ongoing: "In Progress",
  planned: "Planned",
  cancelled: "Cancelled",
};

const RecentActivities = () => {
  const { data: activities = [], isLoading } = useActivities();

  // Show most recent 4 activities
  const recentActivities = activities.slice(0, 4);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Recent Activities
            </h3>
            <p className="text-sm text-muted-foreground">
              Latest campaign activities across regions
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/30">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-32 mb-2" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentActivities.length === 0) {
    return (
      <div className="chart-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Recent Activities
            </h3>
            <p className="text-sm text-muted-foreground">
              Latest campaign activities across regions
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No activities yet</p>
          <p className="text-sm text-muted-foreground">Create your first activity to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Recent Activities
          </h3>
          <p className="text-sm text-muted-foreground">
            Latest campaign activities across regions
          </p>
        </div>
        <button className="text-sm text-navy-deep font-medium hover:text-navy-light transition-colors flex items-center gap-1">
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {recentActivities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h4 className="font-medium text-foreground">{activity.title}</h4>
                <span className={statusStyles[activity.status as keyof typeof statusStyles] || statusStyles.planned}>
                  {statusLabels[activity.status as keyof typeof statusLabels] || activity.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {activity.organizations?.name || "-"}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {activity.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(activity.scheduled_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {activity.expected_attendance || 0} expected
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivities;
