"use client";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  MapPin,
  Users,
  Clock,
  MoreVertical,
  ChevronRight,
  Loader2,
  Calendar,
} from "lucide-react";
import { CreateActivityModal } from "@/components/activities/CreateActivityModal";
import { useActivities, useActivityStats } from "@/hooks/useActivities";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityDetailsModal } from "@/components/activities/ActivityDetailsModal";
import { ActivityWithOrganization } from "@/hooks/useActivities";
import { format } from "date-fns";

const statusColors = {
  planned: "bg-navy-deep/10 text-navy-deep border-navy-deep/20",
  ongoing: "bg-power-red/10 text-power-red border-power-red/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const Activities = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithOrganization | null>(null);
  const { organizationId } = useAuth();

  const { data: activities = [], isLoading } = useActivities(organizationId || undefined, activeFilter);
  const { data: stats } = useActivityStats(organizationId);

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.organizations?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatTime = (startTime?: string | null, endTime?: string | null) => {
    if (!startTime) return "-";
    const start = startTime.slice(0, 5);
    const end = endTime ? endTime.slice(0, 5) : "";
    return end ? `${start} - ${end}` : start;
  };

  return (
    <DashboardLayout
      title="Activities"
      subtitle="Plan and track campaign activities"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card">
          <p className="text-sm text-muted-foreground">Total Activities</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats?.total || 0}</p>
        </div>
        <div className="kpi-card">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold text-power-red mt-1">{stats?.ongoing || 0}</p>
        </div>
        <div className="kpi-card">
          <p className="text-sm text-muted-foreground">Planned</p>
          <p className="text-2xl font-bold text-navy-deep mt-1">{stats?.planned || 0}</p>
        </div>
        <div className="kpi-card">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-success mt-1">{stats?.completed || 0}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium pl-10 w-full sm:w-80"
            />
          </div>
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            {["all", "planned", "ongoing", "completed"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeFilter === filter
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <CreateActivityModal>
          <Button className="btn-action gap-2">
            <Plus className="w-4 h-4" />
            Create Activity
          </Button>
        </CreateActivityModal>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No activities yet</h3>
          <p className="text-muted-foreground mb-4">Create your first campaign activity</p>
          <CreateActivityModal>
            <Button className="btn-action gap-2">
              <Plus className="w-4 h-4" />
              Create Activity
            </Button>
          </CreateActivityModal>
        </div>
      ) : (
        /* Activities List */
        <div className="space-y-4 stagger-children">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              onClick={() => setSelectedActivity(activity)}
              className="bg-card rounded-xl border border-border/50 p-6 hover:shadow-premium hover:border-border transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start gap-6">
                {/* Date Badge */}
                <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 bg-muted rounded-lg text-center">
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDate(activity.scheduled_date).split(" ")[0]}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {formatDate(activity.scheduled_date).split(" ")[1]?.replace(",", "")}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-navy-deep transition-colors">
                          {activity.title}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusColors[activity.status as keyof typeof statusColors] ||
                            statusColors.planned
                            }`}
                        >
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded capitalize">
                          {activity.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {activity.description || "No description provided"}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {activity.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(activity.start_time, activity.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {activity.expected_attendance || 0} expected
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {activity.organizations?.name || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ActivityDetailsModal
        activity={selectedActivity}
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </DashboardLayout>
  );
};

export default Activities;
