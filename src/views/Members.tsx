"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Mail,
  MapPin,
  Building2,
  Loader2,
  Users,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import MemberCard from "@/components/members/MemberCard";
import { useMembers, useMemberStats, useVerifyMember } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { usePUAgent } from "@/hooks/usePUAgent";
import { APCBanner } from "@/components/branding/APCBanner";

const Members = () => {
  const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { organizationId, role } = useAuth();
  const { data: puAgent } = usePUAgent();
  const membersScope = role === "polling_unit_agent" ? "polling_unit" : organizationId ? "organization" : "all";

  const { data: members = [], isLoading } = useMembers(
    role === "polling_unit_agent" ? undefined : organizationId || undefined,
    role === "polling_unit_agent" ? puAgent?.polling_unit_id || undefined : undefined,
    role === "polling_unit_agent" ? puAgent?.polling_unit_name || undefined : undefined,
    membersScope
  );
  const { data: stats } = useMemberStats(
    role === "polling_unit_agent" ? null : organizationId,
    role === "polling_unit_agent" ? puAgent?.polling_unit_id || undefined : undefined,
    role === "polling_unit_agent" ? puAgent?.polling_unit_name || undefined : undefined,
    membersScope
  );
  const { mutate: verifyMember, isPending: isVerifying } = useVerifyMember();

  const filteredMembers = members.filter((member) => {
    return (
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.organizations?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      member.state.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
      title="Members"
      subtitle="Manage organization members and contacts"
    >
      {/* APC Banner */}
      <APCBanner
        title="Member Management"
        subtitle="All Progressives Congress - Katsina State"
      />
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="kpi-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Members</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
            {(stats?.total || 0).toLocaleString()}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Active Members</p>
          <p className="text-xl sm:text-2xl font-bold text-success mt-1">
            {(stats?.active || 0).toLocaleString()}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Inactive</p>
          <p className="text-xl sm:text-2xl font-bold text-muted-foreground mt-1">
            {(stats?.inactive || 0).toLocaleString()}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Organizations</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
            {new Set(members.map((m) => m.organization_id)).size}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-between items-stretch sm:items-center mb-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium pl-10 w-full sm:w-64 lg:w-80 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" className="btn-action gap-2 flex-1 sm:flex-initial" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </Button>
          <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No members yet</h3>
          <p className="text-muted-foreground mb-4">Register your first member to get started</p>
          <Button className="btn-action gap-2" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Member
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 animate-fade-in">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onClick={() => navigate(`/members/detail?id=${member.id}`)}
              />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block data-table animate-fade-in overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Gender</th>
                  <th>Voter Card</th>
                  <th>Location</th>
                  <th>Field Verification</th>
                  <th>Activities</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/members/detail?id=${member.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border">
                          <AvatarFallback className="bg-navy-deep text-white text-sm font-medium">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{member.full_name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
                          {member.organizations?.name || "-"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-foreground capitalize">{member.role || "-"}</span>
                    </td>
                    <td>
                      <span className="text-foreground capitalize">{member.gender || "-"}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {member.voters_card_image_url ? (
                          <div className="flex items-center gap-1.5 text-success text-xs font-medium bg-success/10 px-2 py-1 rounded-full w-fit">
                            <CreditCard className="w-3 h-3" />
                            <span>Uploaded</span>
                          </div>
                        ) : member.voters_card_id ? (
                          <div className="flex items-center gap-1.5 text-warning text-xs font-medium bg-warning/10 px-2 py-1 rounded-full w-fit">
                            <CreditCard className="w-3 h-3" />
                            <span>ID Only</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Missing</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {member.state}{member.lga ? `, ${member.lga}` : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {member.is_verified ? (
                          <div className="flex items-center gap-1.5 text-success text-[11px] font-bold bg-success/10 px-2 py-0.5 rounded-full w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-orange-600 text-[11px] font-bold bg-orange-50 px-2 py-0.5 rounded-full w-fit border border-orange-100">
                            <Activity className="w-3 h-3" />
                            <span>Pending Visit</span>
                          </div>
                        )}
                         {role === "polling_unit_agent" && !member.is_verified && (puAgent?.polling_unit_id === member.polling_unit_id || puAgent?.polling_unit_name === member.polling_unit) && (
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             disabled={isVerifying}
                             className="h-7 text-[10px] text-apc-green hover:text-white hover:bg-apc-green gap-1 px-2 border border-apc-green/30"
                             onClick={(e) => {
                               e.stopPropagation();
                               if (window.confirm(`Confirm physical verification for ${member.full_name}?`)) {
                                 verifyMember(member.id);
                               }
                             }}
                           >
                             {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                             Verify Now
                           </Button>
                         )}
                      </div>
                    </td>
                    <td>
                      <span className="font-medium text-foreground">
                        {member.activity_count || 0}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          member.status === "active"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {member.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button className="p-2 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Members;
