"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  TrendingUp,
  Filter,
  Eye,
  MoreVertical,
  Edit2,
  Trash2
} from "lucide-react";
import { useSupportGroups } from "@/hooks/useSupportGroups";
import { useDeleteSupportGroup } from "@/hooks/useDeleteSupportGroup";
import { useChairman } from "@/hooks/useChairmen";
import { CAMPAIGN_STATE, KOGI_LGAS } from "@/lib/campaign-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SupportGroupRegistrationForm } from "@/components/support-groups/SupportGroupRegistrationForm";
import { EditSupportGroupModal } from "@/components/support-groups/EditSupportGroupModal";
import { SupportGroupLeaderboard } from "@/components/support-groups/SupportGroupLeaderboard";
import { useAuth } from "@/contexts/AuthContext";
import type { SupportGroupWithStats } from "@/hooks/useSupportGroups";
import dynamic from "next/dynamic";

const SupportGroupsMap = dynamic(
  () => import("@/components/support-groups/SupportGroupsMap").then(mod => mod.SupportGroupsMap),
  { ssr: false, loading: () => <div className="h-[450px] bg-muted animate-pulse rounded-lg w-full" /> }
);

const SupportGroups = () => {
  const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [lgaFilter, setLgaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState<SupportGroupWithStats | null>(null);
  const isSuperAdmin = role === "super_admin";

  const { mutate: deleteGroup } = useDeleteSupportGroup();
  const { data: chairman } = useChairman();

  const activeLgaFilter = role === "lga_chairman" ? chairman?.lga : (lgaFilter === "all" ? undefined : lgaFilter);

  const { data: allSupportGroups, isLoading: isAllLoading } = useSupportGroups();

  const { data: supportGroups, isLoading } = useSupportGroups({
    lga: activeLgaFilter,
    verificationStatus: statusFilter === "all" ? undefined : statusFilter,
  });

  const filteredGroups = supportGroups?.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.leader_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.lga?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const stats = {
    total: supportGroups?.length || 0,
    verified: supportGroups?.filter(g => g.verification_status === "verified").length || 0,
    pending: supportGroups?.filter(g => g.verification_status === "pending").length || 0,
    totalMembers: supportGroups?.reduce((acc, g) => acc + (g.member_count || 0), 0) || 0,
  };

  return (
    <DashboardLayout
      title="Support Groups"
      subtitle="Manage campaign support groups and associations"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="kpi-card-accent">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70">Total Groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <p className="text-xs text-white/60 mt-1">Registered associations</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Verified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.verified}</div>
            <p className="text-xs text-muted-foreground mt-1">Approved groups</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[hsl(var(--apc-green))]">{stats.totalMembers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Gamification & Visual Analytics */}
      {!isAllLoading && allSupportGroups && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <SupportGroupsMap groups={allSupportGroups} />
          </div>
          <div>
            <SupportGroupLeaderboard groups={allSupportGroups} />
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups by name, leader, or LGA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select
            value={role === "lga_chairman" ? chairman?.lga || "" : lgaFilter}
            onValueChange={setLgaFilter}
            disabled={role === "lga_chairman"}
          >
            <SelectTrigger className="w-[180px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by LGA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {KOGI_LGAS.map(lga => (
                <SelectItem key={lga} value={lga}>{lga}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {role !== "org_admin" && (
            <Dialog open={isRegistrationOpen} onOpenChange={setIsRegistrationOpen}>
              <DialogTrigger asChild>
                <Button className="btn-action">
                  <Plus className="w-4 h-4 mr-2" />
                  Register Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Register Support Group</DialogTitle>
                  <DialogDescription>
                    Register a new support group or association for the campaign.
                    All registrations require verification.
                  </DialogDescription>
                </DialogHeader>
                <SupportGroupRegistrationForm
                  onSuccess={() => setIsRegistrationOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Support Groups Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading support groups...</div>
        </div>
      ) : filteredGroups?.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Support Groups Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? "No groups match your search criteria."
              : "Register your first support group to get started."}
          </p>
          {role !== "org_admin" && (
            <Button onClick={() => setIsRegistrationOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Register Group
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups?.map((group) => (
            <Card key={group.id} className="group hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(`/support-groups/detail?id=${group.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate group-hover:text-[hsl(var(--apc-green))] transition-colors">
                      {group.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {group.lga || "No LGA"}, {group.state || CAMPAIGN_STATE}
                    </CardDescription>
                  </div>
                  {getStatusBadge(group.verification_status || "pending")}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/support-groups/detail?id=${group.id}`);
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {isSuperAdmin && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditGroup(group);
                        }}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(group.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Leader Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {group.leader_name || "No Leader Assigned"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.leader_phone || "No phone"}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-3 border-t">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{group.member_count || 0}</span>
                      <span className="text-xs text-muted-foreground">members</span>
                    </div>

                    {group.member_target && (
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {Math.round(((group.member_count || 0) / group.member_target) * 100)}%
                        </span>
                        <span className="text-xs text-muted-foreground">of target</span>
                      </div>
                    )}
                  </div>

                  {/* View Dashboard Button */}
                  <Button
                    variant="default"
                    className="w-full mt-2 bg-[#005A36] hover:bg-[#00482B] text-white flex items-center justify-center gap-2 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/support-groups/detail?id=${group.id}`);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Open Support Group Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the support group
              and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteId) {
                  deleteGroup(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSupportGroupModal
        group={editGroup}
        open={!!editGroup}
        onOpenChange={(o) => !o && setEditGroup(null)}
      />
    </DashboardLayout>
  );
};

export default SupportGroups;

