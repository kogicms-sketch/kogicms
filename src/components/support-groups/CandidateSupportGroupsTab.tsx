"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useCandidateSupportGroups, useCandidateGroupsActivities, useVerifyActivity } from "@/hooks/useSupportGroups";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, Award, CheckCircle2, Shield, AlertCircle, Clock, MapPin, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CandidateSupportGroupsTabProps {
  candidateId: string;
  candidateRace: 'senatorial' | 'house_of_reps' | 'state_assembly' | 'lga_chairman';
}

export const CandidateSupportGroupsTab = ({ candidateId, candidateRace }: CandidateSupportGroupsTabProps) => {
  const router = useRouter();
  const navigate = (path: string) => {
    router.push(path);
  };

  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useCandidateSupportGroups(candidateId);
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = useCandidateGroupsActivities(candidateId);
  const { mutate: verifyActivity, isPending: isVerifying } = useVerifyActivity();

  const handleVerify = (activityId: string) => {
    verifyActivity(activityId, {
      onSuccess: () => {
        refetchActivities();
        refetchGroups();
      }
    });
  };

  if (groupsLoading || activitiesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-muted-foreground">Loading support group metrics...</div>
      </div>
    );
  }

  // Calculate aggregated stats
  const totalGroups = groups?.length || 0;
  const totalMembers = groups?.reduce((sum, g) => sum + (g.member_count || 0), 0) || 0;
  const totalPvc = groups?.reduce((sum, g) => sum + (g.pvc_count || 0), 0) || 0;
  const totalActivities = groups?.reduce((sum, g) => sum + (g.activities_count || 0), 0) || 0;

  // Sort groups by kpi_score for leaderboard
  const sortedGroups = [...(groups || [])].sort((a, b) => (b.kpi_score || 0) - (a.kpi_score || 0));
  
  // Podium top 3
  const top3 = sortedGroups.slice(0, 3);
  // Remaining top 10
  const remainingTop10 = sortedGroups.slice(3, 10);

  // Format race label
  const raceLabel = {
    senatorial: "Senatorial Zone",
    house_of_reps: "Federal Constituency",
    state_assembly: "State Assembly constituency",
    lga_chairman: "LGA Campaign"
  }[candidateRace];

  return (
    <div className="space-y-6">
      {/* ── AGGREGATED METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-navy-deep to-indigo-900 border-0 shadow-lg text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Aligned Groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{totalGroups}</div>
              <p className="text-xs text-white/60 mt-1">Driving your campaign</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-card border-l-4 border-l-[hsl(var(--apc-green))] shadow-md">
            <CardHeader className="pb-2">
              <CardDescription>Total Group Members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--apc-green))]">{totalMembers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total registered recruits</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-card border-l-4 border-l-purple-500 shadow-md">
            <CardHeader className="pb-2">
              <CardDescription>Projected E-Day Turnout</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{totalPvc.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Members with Voter Cards (PVC)</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-card border-l-4 border-l-apc-red shadow-md">
            <CardHeader className="pb-2">
              <CardDescription>Hosted Events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-apc-red">{totalActivities}</div>
              <p className="text-xs text-muted-foreground mt-1">Community engagements</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── LEADERBOARD SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Podium visualization */}
        <Card className="lg:col-span-1 border-0 shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Constituency Podium
            </CardTitle>
            <CardDescription>Top 3 performing groups</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-end min-h-[300px] pb-6">
            {top3.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No active support groups yet.
              </div>
            ) : (
              <div className="flex items-end justify-between w-full h-[220px] gap-2 pt-6">
                 {/* 2nd Place */}
                {top3[1] && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 130 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex-1 flex flex-col items-center justify-end cursor-pointer group/podium"
                    onClick={() => navigate(`/support-groups/detail?id=${top3[1].id}`)}
                  >
                    <div className="text-center mb-2 px-1 max-w-[90px]">
                      <p className="text-xs font-bold truncate text-muted-foreground group-hover/podium:underline">{top3[1].name}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">{top3[1].kpi_score} pts</p>
                    </div>
                    <div className="w-full bg-gradient-to-t from-slate-300 to-slate-200 border-t border-slate-400/30 rounded-t-lg shadow-inner flex flex-col items-center justify-start pt-3 h-full">
                      <span className="w-8 h-8 rounded-full bg-slate-400 text-slate-900 font-extrabold flex items-center justify-center text-sm shadow">2</span>
                    </div>
                  </motion.div>
                )}

                 {/* 1st Place */}
                {top3[0] && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 170 }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-end cursor-pointer group/podium"
                    onClick={() => navigate(`/support-groups/detail?id=${top3[0].id}`)}
                  >
                    <div className="text-center mb-2 px-1 max-w-[100px]">
                      <p className="text-sm font-extrabold truncate text-navy-deep group-hover/podium:underline">{top3[0].name}</p>
                      <p className="text-xs text-[hsl(var(--apc-green))] font-bold">{top3[0].kpi_score} pts</p>
                    </div>
                    <div className="w-full bg-gradient-to-t from-yellow-400 to-amber-200 border-t border-yellow-500/30 rounded-t-lg shadow-lg flex flex-col items-center justify-start pt-3 h-full">
                      <span className="w-9 h-9 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-md shadow animate-bounce">1</span>
                    </div>
                  </motion.div>
                )}

                 {/* 3rd Place */}
                {top3[2] && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 100 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex-1 flex flex-col items-center justify-end cursor-pointer group/podium"
                    onClick={() => navigate(`/support-groups/detail?id=${top3[2].id}`)}
                  >
                    <div className="text-center mb-2 px-1 max-w-[90px]">
                      <p className="text-xs font-bold truncate text-muted-foreground group-hover/podium:underline">{top3[2].name}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">{top3[2].kpi_score} pts</p>
                    </div>
                    <div className="w-full bg-gradient-to-t from-orange-400/70 to-orange-300/40 border-t border-orange-500/20 rounded-t-lg shadow-inner flex flex-col items-center justify-start pt-3 h-full">
                      <span className="w-7 h-7 rounded-full bg-amber-700/60 text-orange-100 font-extrabold flex items-center justify-center text-xs shadow">3</span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 List */}
        <Card className="lg:col-span-2 border-0 shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="text-md font-bold">Constituency Leaderboard</CardTitle>
            <CardDescription>Support Groups ranked by activity & membership voter points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-xs font-bold text-center">Rank</TableHead>
                    <TableHead className="text-xs font-bold">Group Name</TableHead>
                    <TableHead className="text-xs font-bold text-center">Members</TableHead>
                    <TableHead className="text-xs font-bold text-center">PVCs</TableHead>
                    <TableHead className="text-xs font-bold text-center">KPI Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGroups.length > 0 ? (
                    sortedGroups.slice(0, 10).map((group, index) => (
                      <TableRow 
                        key={group.id} 
                        className="hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={() => navigate(`/support-groups/detail?id=${group.id}`)}
                      >
                        <TableCell className="text-center font-bold text-xs">
                          {index === 0 && <span className="text-amber-500">🏆 1</span>}
                          {index === 1 && <span className="text-slate-400">🥈 2</span>}
                          {index === 2 && <span className="text-amber-700">🥉 3</span>}
                          {index > 2 && index + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-xs sm:text-sm text-navy-deep hover:underline">{group.name}</TableCell>
                        <TableCell className="text-center text-xs font-medium">{group.member_count}</TableCell>
                        <TableCell className="text-center text-xs text-purple-600 font-medium">{group.pvc_count}</TableCell>
                        <TableCell className="text-center text-xs font-black text-[hsl(var(--apc-green))]">{group.kpi_score || 0}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        No groups found in this constituency.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ACTIVITY FEED / LEDGER ── */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-md font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-apc-red" />
            Support Group Activities Log
          </CardTitle>
          <CardDescription>Verify events held by your aligned groups to award KPI scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {activitiesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading activity feed...</div>
            ) : !activities || activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No activities logged by aligned groups yet.
              </div>
            ) : (
              activities.map((act) => {
                const isVerified = !!act.verified_at;
                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-muted/20 border border-border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-xs font-extrabold text-navy-deep px-2 py-0.5 rounded bg-navy-deep/5 cursor-pointer hover:underline"
                          onClick={() => act.support_group_id && navigate(`/support-groups/detail?id=${act.support_group_id}`)}
                        >
                          {act.group?.name || "Support Group"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(act.activity_date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground">{act.activity_title || act.name || "Campaign Activity"}</h4>
                      <p className="text-xs text-muted-foreground max-w-2xl">{act.description}</p>
                      
                      {/* Event Media Render */}
                      {(act.photo_url || act.video_url) && (
                        <div className="flex gap-2 mt-2">
                          {act.photo_url && (
                            <img 
                              src={act.photo_url} 
                              alt="Activity media" 
                              className="w-16 h-16 rounded object-cover border" 
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      {isVerified ? (
                        <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--apc-green))] font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-[hsl(var(--apc-green))] hover:bg-[hsl(var(--apc-green))]/90 text-white font-semibold text-xs h-8"
                          onClick={() => handleVerify(act.id)}
                          disabled={isVerifying}
                        >
                          Verify Event
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
