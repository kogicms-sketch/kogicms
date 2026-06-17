"use client";
import { ArrowRight, Users, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Skeleton } from "@/components/ui/skeleton";

const OrganizationsList = () => {
  const { data: organizations = [], isLoading } = useOrganizations();

  // Show top 4 organizations by member count
  const topOrgs = [...organizations]
    .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
    .slice(0, 4);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Top Organizations
            </h3>
            <p className="text-sm text-muted-foreground">
              Leading groups by membership
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topOrgs.length === 0) {
    return (
      <div className="chart-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Top Organizations
            </h3>
            <p className="text-sm text-muted-foreground">
              Leading groups by membership
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No organizations yet</p>
          <p className="text-sm text-muted-foreground">Create your first organization to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Top Organizations
          </h3>
          <p className="text-sm text-muted-foreground">
            Leading groups by membership
          </p>
        </div>
        <button className="text-sm text-navy-deep font-medium hover:text-navy-light transition-colors flex items-center gap-1">
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {topOrgs.map((org) => (
          <div
            key={org.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
          >
            <Avatar className="w-12 h-12 border-2 border-navy-deep/20">
              <AvatarFallback className="bg-navy-deep text-white font-semibold text-sm">
                {getInitials(org.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground truncate">
                  {org.name}
                </h4>
                <span className={org.status === "active" ? "status-active" : "status-inactive"}>
                  {org.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground capitalize">{org.type}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {(org.member_count || 0).toLocaleString()} members
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {org.state}
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizationsList;
