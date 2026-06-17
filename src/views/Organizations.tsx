"use client";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Users,
  MapPin,
  Calendar,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { CreateOrganizationModal } from "@/components/organizations/CreateOrganizationModal";

const Organizations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: organizations = [], isLoading } = useOrganizations();

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.leader_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout
      title="Organizations"
      subtitle="Manage campaign organizations and groups"
    >
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium pl-10 w-full sm:w-80"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
        <Button className="btn-action gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Organization
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No organizations yet</h3>
          <p className="text-muted-foreground mb-4">Create your first organization to get started</p>
          <Button className="btn-action gap-2" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Organization
          </Button>
        </div>
      ) : (
        /* Organizations Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger-children">
          {filteredOrgs.map((org) => (
            <div
              key={org.id}
              className="bg-card rounded-xl border border-border/50 p-6 hover:shadow-premium hover:border-border transition-all duration-300 group cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-navy-deep/20">
                    <AvatarFallback className="bg-navy-deep text-white font-semibold">
                      {getInitials(org.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-navy-deep transition-colors">
                      {org.name}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">{org.type}</p>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Leader Info */}
              <div className="mb-4 pb-4 border-b border-border/50">
                <p className="text-sm text-muted-foreground">Organization Leader</p>
                <p className="font-medium text-foreground">{org.leader_name || "Not assigned"}</p>
                <p className="text-sm text-muted-foreground">{org.leader_email || "-"}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">Members</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {(org.member_count || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">State</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{org.state}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs">LGA</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {org.lga || "-"}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <span className={org.status === "active" ? "status-active" : "status-inactive"}>
                  {org.status === "active" ? "Active" : "Inactive"}
                </span>
                <button className="flex items-center gap-1 text-sm font-medium text-navy-deep hover:text-navy-light transition-colors">
                  View Details
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateOrganizationModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </DashboardLayout>
  );
};

export default Organizations;
