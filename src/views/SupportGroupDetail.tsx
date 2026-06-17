"use client";
import { useState } from "react";
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Camera,
  Plus,
  TrendingUp,
  Activity,
  Film,
  FileText,
  Video,
  Eye
} from "lucide-react";
import {
  useSupportGroup,
  useVerifySupportGroup,
  useSupportGroupActivities,
  useSupportGroupMembers,
  useSupportGroupAdmins
} from "@/hooks/useSupportGroups";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ActivityLogForm } from "@/components/support-groups/ActivityLogForm";
import { SupportGroupFunding } from "@/components/support-groups/SupportGroupFunding";
import { SupportGroupLogistics } from "@/components/support-groups/SupportGroupLogistics";
import { format } from "date-fns";
import { Wallet, Truck } from "lucide-react";

const SupportGroupDetail = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
  const { role } = useAuth();
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [verificationAction, setVerificationAction] = useState<"verified" | "rejected">("verified");

  const { data: group, isLoading } = useSupportGroup(id || "");
  const { data: activities, isLoading: activitiesLoading } = useSupportGroupActivities(id);
  const { data: members, isLoading: membersLoading } = useSupportGroupMembers(id || "");
  const { data: admins, isLoading: adminsLoading } = useSupportGroupAdmins(id || "");
  const verifyGroup = useVerifySupportGroup();

  const handleVerify = async () => {
    if (!id) return;
    await verifyGroup.mutateAsync({
      id,
      status: verificationAction,
    });
    setIsVerifyDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending Verification
          </Badge>
        );
    }
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      meeting: "Meeting",
      rally: "Rally / Campaign Event",
      door_to_door: "Door-to-Door Outreach",
      town_hall: "Town Hall",
      charity_drive: "Charity Drive",
      other: "Other Activity",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Support Group" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading support group details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout title="Support Group" subtitle="Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Support group not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/support-groups")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Groups
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isAdmin = role === "super_admin" || role === "org_admin";

  return (
    <DashboardLayout
      title={group.name}
      subtitle="Support Group Details"
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/support-groups")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Support Groups
      </Button>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{group.name}</h1>
                {getStatusBadge(group.verification_status || "pending")}
              </div>
              <p className="text-muted-foreground">{group.type}</p>

              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {group.lga}, {group.state}
                </div>
                {group.ward && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Ward: {group.ward}
                  </div>
                )}
              </div>
            </div>

            {/* Admin Actions */}
            {isAdmin && group.verification_status === "pending" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => {
                    setVerificationAction("rejected");
                    setIsVerifyDialogOpen(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="btn-action"
                  onClick={() => {
                    setVerificationAction("verified");
                    setIsVerifyDialogOpen(true);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verify Group
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Leader Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Group Leader</h3>
              <div className="space-y-2">
                <p className="font-medium">{group.leader_name || "Not assigned"}</p>
                {group.leader_phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {group.leader_phone}
                  </p>
                )}
                {group.leader_email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {group.leader_email}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              <h3 className="font-semibold">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-2xl font-bold">{group.member_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-2xl font-bold">{group.activities_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Activities</p>
                </div>
              </div>
              {group.member_target && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target Progress</span>
                    <span className="font-medium">
                      {Math.round(((group.member_count || 0) / group.member_target) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[hsl(var(--apc-green))] transition-all"
                      style={{
                        width: `${Math.min(((group.member_count || 0) / group.member_target) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {group.member_count || 0} of {group.member_target} target members
                  </p>
                </div>
              )}
            </div>

            {/* Verification Info */}
            {group.verification_status !== "pending" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Verification Details</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Status: <span className="font-medium capitalize">{group.verification_status}</span>
                  </p>
                  {group.verified_at && (
                    <p className="text-muted-foreground">
                      Verified on: {format(new Date(group.verified_at), "MMM d, yyyy")}
                    </p>
                  )}
                  {group.verification_notes && (
                    <p className="text-muted-foreground">
                      Notes: {group.verification_notes}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">
            <Activity className="w-4 h-4 mr-2" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="admins">
            <Users className="w-4 h-4 mr-2" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="funding">
            <Wallet className="w-4 h-4 mr-2" />
            Funding
          </TabsTrigger>
          <TabsTrigger value="logistics">
            <Truck className="w-4 h-4 mr-2" />
            Logistics
          </TabsTrigger>
          <TabsTrigger value="description">
            <TrendingUp className="w-4 h-4 mr-2" />
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Activity Log</h2>
            {group.verification_status === "verified" && (
              <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-action">
                    <Plus className="w-4 h-4 mr-2" />
                    Log Activity
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Log Support Group Activity</DialogTitle>
                    <DialogDescription>
                      Record meetings, rallies, and other campaign activities.
                      Photos are required for verification.
                    </DialogDescription>
                  </DialogHeader>
                  <ActivityLogForm
                    supportGroupId={id!}
                    onSuccess={() => setIsActivityDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {activitiesLoading ? (
            <div className="text-center py-8">Loading activities...</div>
          ) : activities?.length === 0 ? (
            <Card className="p-8 text-center">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activities Logged</h3>
              <p className="text-muted-foreground">
                {group.verification_status === "verified"
                  ? "Start logging your group's campaign activities to track progress."
                  : "Activities can be logged after the group is verified."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activities?.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{activity.title}</h3>
                          {activity.verified_at && (
                            <Badge variant="outline" className="text-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {getActivityTypeLabel(activity.activity_type)} • {format(new Date(activity.activity_date), "MMM d, yyyy")}
                        </p>
                        {activity.description && (
                          <p className="text-sm mb-2">{activity.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {activity.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {activity.attendance_count} attendees
                          </span>
                          {activity.media_reach > 0 && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <TrendingUp className="w-4 h-4" />
                              {activity.media_reach.toLocaleString()} reach
                            </span>
                          )}
                        </div>
                        {activity.media_links && activity.media_links.length > 0 && (
                          <div className="mt-2 text-sm flex gap-2 flex-wrap items-center">
                            <span className="text-muted-foreground text-xs">Media Links:</span>
                            {activity.media_links.map((link: string, idx: number) => (
                              <a key={idx} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs bg-primary/5 px-2 py-1 rounded">
                                Link {idx + 1}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Proof of Activity Media Grid */}
                        {((activity.photos && activity.photos.length > 0) || 
                          (activity.videos && activity.videos.length > 0) || 
                          (activity.attendance_logs && activity.attendance_logs.length > 0)) && (
                          <div className="mt-4 pt-3 border-t space-y-3">
                            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Proof of Activity</h4>
                            <div className="flex flex-col gap-3">
                              {/* Photos Gallery */}
                              {activity.photos && activity.photos.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground block font-medium">Photos</span>
                                  <div className="flex flex-wrap gap-2">
                                    {activity.photos.map((photo: string, idx: number) => (
                                      <a 
                                        key={idx} 
                                        href={photo} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted group/photo hover:shadow-md transition-all shrink-0"
                                      >
                                        <img src={photo} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover/photo:scale-110" />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                          <Eye className="w-4 h-4 text-white" />
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Videos list */}
                              {activity.videos && activity.videos.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground block font-medium">Videos</span>
                                  <div className="flex flex-wrap gap-2">
                                    {activity.videos.map((video: string, idx: number) => (
                                      <a 
                                        key={idx} 
                                        href={video} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-blue-500/[0.03] hover:bg-blue-500/10 text-blue-600 transition-colors text-xs font-semibold shrink-0 shadow-sm border-blue-500/20"
                                      >
                                        <Film className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Watch Video {activity.videos.length > 1 ? idx + 1 : ""}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Attendance sheets list */}
                              {activity.attendance_logs && activity.attendance_logs.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground block font-medium">Attendance Logs</span>
                                  <div className="flex flex-wrap gap-2">
                                    {activity.attendance_logs.map((log: string, idx: number) => {
                                      const filename = log.split('/').pop()?.split('-').slice(1).join('-') || `Attendance_${idx + 1}`;
                                      return (
                                        <a 
                                          key={idx} 
                                          href={log} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-orange-500/[0.03] hover:bg-orange-500/10 text-orange-600 transition-colors text-xs font-semibold shrink-0 shadow-sm border-orange-500/20"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-orange-500" />
                                          <span className="max-w-[180px] truncate">{filename}</span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
              <CardDescription>Members registered under this support group</CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading members...</div>
              ) : members?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic">No members found.</div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Phone</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">LGA/Ward</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Social</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Bank Info</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">PVC Status</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {members?.map((member) => (
                        <tr key={member.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4 align-middle font-medium">{member.full_name}</td>
                          <td className="p-4 align-middle">{member.phone}</td>
                          <td className="p-4 align-middle">{member.lga}{member.ward ? ` / ${member.ward}` : ""}</td>
                          <td className="p-4 align-middle">
                            {member.social_media_handle ? (
                              <Badge variant="outline" className="font-normal">{member.social_media_handle}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-4 align-middle">
                            {member.bank_name ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">{member.bank_name}</span>
                                <span className="text-xs text-muted-foreground">{member.account_number || "—"}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-4 align-middle">
                            {member.pvc_verified ? (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pending</Badge>
                            )}
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant="outline" className="capitalize">
                              {member.role || "Member"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Group Admins</CardTitle>
              <CardDescription>Personnel managing this support group</CardDescription>
            </CardHeader>
            <CardContent>
              {adminsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading admins...</div>
              ) : admins?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic">No admins assigned.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {admins?.map((admin) => (
                    <div key={admin.id} className="flex items-center gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{(admin as any).profile?.full_name || "Unknown Admin"}</p>
                        <p className="text-xs text-muted-foreground">{(admin as any).profile?.phone_number || (admin as any).profile?.phone || "No phone"}</p>
                        {role === "super_admin" && (admin as any).profile?.email && (
                          <p className="text-xs text-muted-foreground italic">{(admin as any).profile?.email}</p>
                        )}
                        <p className="text-xs font-medium text-primary mt-1 capitalize">Group Admin</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funding">
          <SupportGroupFunding supportGroupId={id!} />
        </TabsContent>

        <TabsContent value="logistics">
          <SupportGroupLogistics supportGroupId={id!} />
        </TabsContent>

        <TabsContent value="description">
          <Card>
            <CardHeader>
              <CardTitle>About {group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {group.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {group.description}
                </p>
              ) : (
                <p className="text-muted-foreground italic">
                  No description provided.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verification Dialog */}
      <AlertDialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {verificationAction === "verified" ? "Verify Support Group" : "Reject Support Group"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {verificationAction === "verified"
                ? "This will approve the support group and allow them to log activities. Are you sure?"
                : "This will reject the support group registration. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerify}
              className={verificationAction === "verified" ? "btn-action" : ""}
            >
              {verificationAction === "verified" ? "Verify" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default SupportGroupDetail;
