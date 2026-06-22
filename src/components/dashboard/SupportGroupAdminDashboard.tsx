"use client";

import { useAuth } from "@/contexts/AuthContext";
import { 
  useSupportGroup, 
  useSupportGroupActivities, 
  useSupportGroupMembers, 
  useSupportGroupDonations, 
  useMaterialRequests,
  useSupportGroupRankings
} from "@/hooks/useSupportGroups";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Star, 
  Users, 
  Activity, 
  Wallet, 
  Truck, 
  TrendingUp, 
  Plus, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { APCBanner } from "@/components/branding/APCBanner";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomingIncentives } from "@/components/welfare/IncomingIncentives";
import { WelfareManager } from "@/components/welfare/WelfareManager";
import { SupportGroupAnalytics } from "@/components/support-groups/SupportGroupAnalytics";

const SupportGroupAdminDashboard = () => {
  const { organizationId } = useAuth();
  
  const { data: group, isLoading: groupLoading } = useSupportGroup(organizationId || "");
  const { data: activities } = useSupportGroupActivities(organizationId || "");
  const { data: members } = useSupportGroupMembers(organizationId || "");
  const { data: donations } = useSupportGroupDonations(organizationId || "");
  const { data: requests } = useMaterialRequests(organizationId || "");
  const { data: rankings } = useSupportGroupRankings(organizationId || "");

  if (groupLoading) {
    return (
      <DashboardLayout title="Loading Dashboard..." subtitle="Please wait">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Error">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Unable to load support group details.</p>
        </div>
      </DashboardLayout>
    );
  }

  // Derived metrics
  const kpiScore = group.kpi_score || 0;
  const socialScore = group.social_media_score || 0;
  const totalScore = kpiScore + socialScore;
  
  const verifiedMembers = members?.filter(m => m.pvc_verified || m.is_verified || m.voters_card_id).length || 0;
  const memberCount = members?.length || 0;
  const verificationRate = memberCount > 0 ? Math.round((verifiedMembers / memberCount) * 100) : 0;

  const totalInflow = donations?.filter(d => d.type === 'inflow').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const totalOutflow = donations?.filter(d => d.type === 'expenditure').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const balance = totalInflow - totalOutflow;

  const pendingRequests = requests?.filter(r => r.status === 'pending').length || 0;

  const totalReach = activities?.reduce((sum, a) => sum + (Number(a.media_reach) || 0), 0) || 0;

  return (
    <DashboardLayout
      title={group.name}
      subtitle="Support Group Command Center"
    >
      <APCBanner
        title={`${group.name} Command Center`}
        subtitle="Track, Manage, and Mobilize your grassroots campaign"
      />

      {/* Leaderboard Rankings */}
      {rankings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#0B3D91]/10 to-[#0B3D91]/5 border-[#0B3D91]/20 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Trophy className="w-16 h-16 text-[#0B3D91]" />
            </div>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-[#0B3D91]/10 p-2.5">
                <Trophy className="w-5 h-5 text-[#0B3D91]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Global Leaderboard Rank</p>
                <h4 className="text-lg font-extrabold text-[#0B3D91]">
                  Ranked #{rankings.globalRank} of {rankings.globalCount} Overall
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Overall support group standing</p>
              </div>
            </CardContent>
          </Card>

          {rankings.alignments?.map((align: any, index: number) => {
            if (align.candidateRace === 'governorship') {
              return (
                <Card key={align.id || index} className="bg-gradient-to-br from-apc-red/10 to-apc-red/5 border-apc-red/20 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10">
                    <Star className="w-16 h-16 text-apc-red" />
                  </div>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-full bg-apc-red/10 p-2.5">
                      <Star className="w-5 h-5 text-apc-red" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign Alignment</p>
                      <h4 className="text-lg font-extrabold text-apc-red">
                        Governor Campaign
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Aligned to Katsina State Central Command</p>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return (
              <Card key={align.id || index} className="bg-gradient-to-br from-apc-green/10 to-apc-green/5 border-apc-green/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                  <Star className="w-16 h-16 text-apc-green" />
                </div>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-full bg-apc-green/10 p-2.5">
                    <Star className="w-5 h-5 text-apc-green" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Constituency Rank</p>
                    <h4 className="text-lg font-extrabold text-apc-green">
                      Ranked #{align.constituencyRank} of {align.constituencyCount}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                      In {align.candidateRace === 'senatorial' ? `${align.senatorialZone} Zone` : 
                          align.candidateRace === 'house_of_reps' ? `${align.federalConstituency} Constituency` : 
                          align.candidateRace === 'lga_chairman' ? `${align.lga} LGA Chairman` :
                          align.candidateRace === 'state_assembly' ? `${align.lga} LGA` :
                          `${align.lga} LGA`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[550px] mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allocations">Incoming Allocations</TabsTrigger>
          <TabsTrigger value="handover">QR Handover Portal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Gamification & KPI Hero */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Trophy className="w-24 h-24" />
              </div>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Power Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-primary">{totalScore.toLocaleString()}</span>
                  <span className="text-sm text-primary/70">PTS</span>
                </div>
                <div className="flex gap-2 mt-4 text-xs font-medium">
                  <Badge variant="outline" className="bg-white/50"><Activity className="w-3 h-3 mr-1"/> {kpiScore} Field</Badge>
                  <Badge variant="outline" className="bg-white/50"><TrendingUp className="w-3 h-3 mr-1"/> {socialScore} Social</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-muted-foreground">PVC Verification Rate</p>
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold">{verificationRate}%</span>
                  <span className="text-sm text-muted-foreground">({verifiedMembers}/{memberCount})</span>
                </div>
                <Progress value={verificationRate} className="h-2" />
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
                    {group.verification_status === "verified" ? (
                      <Badge className="bg-green-500 mt-1"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1 text-yellow-600 border-yellow-200 bg-yellow-50">Pending Verification</Badge>
                    )}
                  </div>
                  <Star className="w-8 h-8 text-yellow-400" fill="currentColor" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {group.verification_status === "verified" 
                    ? "Your group is verified and actively earning points." 
                    : "Awaiting approval from admins to log official activities."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href={`/support-groups/detail?id=${group.id}`}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 items-center justify-center hover:border-primary hover:text-primary transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Log Activity</span>
                </Button>
              </Link>
              <Link href={`/support-groups/detail?id=${group.id}`}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 items-center justify-center hover:border-blue-500 hover:text-blue-500 transition-all">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-1">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="font-medium">Manage Members</span>
                </Button>
              </Link>
              <Link href={`/support-groups/detail?id=${group.id}`}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 items-center justify-center hover:border-green-500 hover:text-green-500 transition-all">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                    <Wallet className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="font-medium">Record Donation</span>
                </Button>
              </Link>
              <Link href={`/support-groups/detail?id=${group.id}`}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 items-center justify-center hover:border-orange-500 hover:text-orange-500 transition-all">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-1">
                    <Truck className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="font-medium">Request Materials</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Member Analytics & Demographics */}
          <div className="mb-8 border-t pt-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Member Analytics & Demographics</h3>
            <SupportGroupAnalytics members={members || []} />
          </div>

          {/* Operations Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Recent Activities</CardTitle>
                  <CardDescription>Your latest campaign efforts</CardDescription>
                </div>
                <Link href={`/support-groups/detail?id=${group.id}`}>
                  <Button variant="ghost" size="sm" className="text-primary">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {(!activities || activities.length === 0) ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                    No activities logged yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.slice(0, 3).map((activity) => (
                      <div key={activity.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <h4 className="font-medium text-sm">{activity.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <Activity className="w-3 h-3" /> {activity.activity_type}
                            <span className="text-muted-foreground/30">•</span>
                            {format(new Date(activity.activity_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        {activity.verified_at ? (
                          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0">Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
                    <p className="text-xl font-bold text-green-600">₦{balance.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Logistics</p>
                    <p className="text-xl font-bold">{pendingRequests} <span className="text-sm font-normal text-muted-foreground">Pending Requests</span></p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Est. Media Reach</p>
                    <p className="text-xl font-bold">{totalReach.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">People</span></p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="allocations" className="space-y-6">
          <IncomingIncentives />
        </TabsContent>

        <TabsContent value="handover" className="space-y-6">
          <WelfareManager />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default SupportGroupAdminDashboard;
