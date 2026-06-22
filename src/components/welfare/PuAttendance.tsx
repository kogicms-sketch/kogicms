"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useIncentiveBatches, useDisburseIncentive } from "@/hooks/useIncentives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Camera,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Gift,
  Phone,
  User,
  Users,
  MapPin,
  RefreshCw,
  Award,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff
} from "lucide-react";

interface AttendanceRecord {
  member_id: string;
  arrived: boolean;
  arrived_at: string | null;
  voted_our_party: boolean;
  voted_at: string | null;
  loyalty_enrolled: boolean;
  enrolled_at: string | null;
  lga: string;
  ward: string;
  polling_unit: string;
}

export const PuAttendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Resolve user LGA and Ward
  const { data: userProfile } = useQuery({
    queryKey: ["welfare-pu-user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("lga, ward, full_name").eq("id", user.id).single();
      return data;
    },
    enabled: !!user?.id
  });

  const userLga = userProfile?.lga || "";
  const userWard = userProfile?.ward || "";

  // Fetch active received batches for distribution options
  const { data: batches = [] } = useIncentiveBatches({
    target_lga: userLga,
    target_ward: userWard
  });
  const acceptedBatches = batches.filter(
    (b) => b.received_status === "received" && b.status === "active" && b.disbursed_packages < b.total_packages
  );

  // Fetch members in this Ward
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["welfare-pu-members", userLga, userWard],
    queryFn: async () => {
      if (!userLga || !userWard) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, phone, polling_unit, membership_id")
        .eq("lga", userLga)
        .eq("ward", userWard)
        .eq("is_deceased", false)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userLga && !!userWard
  });

  // Fetch online attendance list
  const { data: dbAttendance = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ["election-day-attendance", userLga, userWard],
    queryFn: async () => {
      if (!userLga || !userWard) return [];
      const { data, error } = await supabase
        .from("election_day_attendance")
        .select("*")
        .eq("lga", userLga)
        .eq("ward", userWard);
      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!userLga && !!userWard
  });

  // Offline capability & state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPu, setSelectedPu] = useState("all");

  // QR Camera scanner
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Loyalty popup upgrade
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMemberName, setUpgradeMemberName] = useState("");

  // Select allocation popup
  const [selectedMemberForIncentive, setSelectedMemberForIncentive] = useState<any | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [uomAllocationType, setUomAllocationType] = useState<"whole" | "fractional">("whole");
  const [uomQuantity, setUomQuantity] = useState<string>("1");
  const disburseMutation = useDisburseIncentive();

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Read initial queue
    const savedQueue = localStorage.getItem("offline_attendance_queue");
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Merge DB and Offline Queue into local attendance mapping
  useEffect(() => {
    const initialMap: Record<string, AttendanceRecord> = {};
    
    // Add DB records
    dbAttendance.forEach((rec) => {
      initialMap[rec.member_id] = rec;
    });

    // Overwrite with offline queue updates
    offlineQueue.forEach((item) => {
      initialMap[item.member_id] = {
        ...initialMap[item.member_id],
        ...item
      };
    });

    setLocalAttendance(initialMap);
  }, [dbAttendance, offlineQueue]);

  // Synchronize offline queue to Supabase
  const triggerSync = async () => {
    const savedQueue = localStorage.getItem("offline_attendance_queue");
    const queue = savedQueue ? JSON.parse(savedQueue) : [];
    if (queue.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;

    try {
      for (const item of queue) {
        const { error } = await supabase
          .from("election_day_attendance")
          .upsert({
            member_id: item.member_id,
            arrived: item.arrived,
            arrived_at: item.arrived_at,
            voted_our_party: item.voted_our_party,
            voted_at: item.voted_at,
            loyalty_enrolled: item.loyalty_enrolled,
            enrolled_at: item.enrolled_at,
            lga: item.lga,
            ward: item.ward,
            polling_unit: item.polling_unit,
            recorded_by: user?.id
          }, {
            onConflict: "member_id"
          });

        if (!error) {
          successCount++;
        }
      }

      // Remove synced items from queue
      const remainingQueue = queue.slice(successCount);
      localStorage.setItem("offline_attendance_queue", JSON.stringify(remainingQueue));
      setOfflineQueue(remainingQueue);

      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline attendance log(s) to server.`);
        refetchAttendance();
      }
    } catch (err) {
      console.error("Error syncing offline queue:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Perform a single update
  const handleToggle = async (memberId: string, field: "arrived" | "voted_our_party") => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const current = localAttendance[memberId] || {
      member_id: memberId,
      arrived: false,
      arrived_at: null,
      voted_our_party: false,
      voted_at: null,
      loyalty_enrolled: false,
      enrolled_at: null,
      lga: userLga,
      ward: userWard,
      polling_unit: member.polling_unit || "Unknown PU"
    };

    const nextVal = !current[field];
    const updated: AttendanceRecord = {
      ...current,
      [field]: nextVal,
      [`${field}_at`]: nextVal ? new Date().toISOString() : null
    };

    // Rule: Arrived + Voted Our Party = Upgrade to Loyalty Card Scheme
    let showUpgrade = false;
    if (updated.arrived && updated.voted_our_party && !current.loyalty_enrolled) {
      updated.loyalty_enrolled = true;
      updated.enrolled_at = new Date().toISOString();
      showUpgrade = true;
      setUpgradeMemberName(member.full_name);
    }

    // Save locally
    const nextMap = { ...localAttendance, [memberId]: updated };
    setLocalAttendance(nextMap);

    // Save to queue
    const updatedQueue = [...offlineQueue.filter((q) => q.member_id !== memberId), updated];
    localStorage.setItem("offline_attendance_queue", JSON.stringify(updatedQueue));
    setOfflineQueue(updatedQueue);

    // Show upgrade popup if triggered
    if (showUpgrade) {
      setShowUpgradeModal(true);
    }

    // Try online sync
    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from("election_day_attendance")
          .upsert({
            member_id: memberId,
            arrived: updated.arrived,
            arrived_at: updated.arrived_at,
            voted_our_party: updated.voted_our_party,
            voted_at: updated.voted_at,
            loyalty_enrolled: updated.loyalty_enrolled,
            enrolled_at: updated.enrolled_at,
            lga: userLga,
            ward: userWard,
            polling_unit: member.polling_unit || "Unknown PU",
            recorded_by: user?.id
          }, {
            onConflict: "member_id"
          });

        if (!error) {
          // Sync successful, remove from queue
          const nextQueue = updatedQueue.filter((q) => q.member_id !== memberId);
          localStorage.setItem("offline_attendance_queue", JSON.stringify(nextQueue));
          setOfflineQueue(nextQueue);
          refetchAttendance();
        }
      } catch (err) {
        // Safe offline mode fallback
      }
    }
  };

  // Browser-native camera stream prompt
  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(err.message || "Could not access back camera.");
    }
  };

  // Close camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setShowCamera(false);
  };

  // Simulate scanning a barcode / QR
  const handleSimulatedQrScan = (memberId: string) => {
    stopCamera();
    const member = members.find((m) => m.id === memberId || m.membership_id === memberId);
    if (!member) {
      toast.error("Scanned QR code invalid or not in database.");
      return;
    }

    toast.success(`Scanned: ${member.full_name}`);
    
    // Automatically auto-check arrival & open incentive dialog if eligible
    const current = localAttendance[member.id] || { arrived: false, voted_our_party: false };
    if (!current.arrived) {
      handleToggle(member.id, "arrived");
    }

    setSelectedMemberForIncentive(member);
  };

  // Handle Instant Incentive Issue
  const handleIssueIncentive = async () => {
    if (!selectedMemberForIncentive || !selectedBatchId) return;

    const batch = acceptedBatches.find((b) => b.id === selectedBatchId);
    let qty: number | undefined;
    let unit: string | undefined;
    let equivalentFraction: number | undefined;

    if (batch && batch.type === "material" && batch.conversion_rate) {
      qty = parseFloat(uomQuantity);
      if (isNaN(qty) || qty <= 0) {
        toast.error("Please enter a valid quantity.");
        return;
      }

      if (uomAllocationType === "whole") {
        equivalentFraction = qty;
        unit = batch.bulk_unit || "Bag";
      } else {
        unit = batch.retail_unit || "Tiya";
        const rate = Number(batch.conversion_rate);
        equivalentFraction = qty / rate;
      }
    }

    try {
      await disburseMutation.mutateAsync({
        batch_id: selectedBatchId,
        member_id: selectedMemberForIncentive.id,
        phone_number: selectedMemberForIncentive.phone,
        disbursed_quantity: qty,
        disbursed_unit: unit,
        disbursed_equivalent_fraction: equivalentFraction
      });
      setSelectedMemberForIncentive(null);
      setSelectedBatchId("");
      setUomQuantity("1");
      setUomAllocationType("whole");
      queryClient.invalidateQueries({ queryKey: ["incentive-batches"] });
    } catch (e) {
      // Handled
    }
  };

  // Unique Polling Units list for filtering
  const uniquePus = Array.from(new Set(members.map((m) => m.polling_unit).filter(Boolean)));

  // Filter roster
  const filteredMembers = members.filter((m) => {
    const status = localAttendance[m.id] || { arrived: false };
    const matchesSearch =
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone || "").includes(searchQuery) ||
      (m.membership_id || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPu = selectedPu === "all" || m.polling_unit === selectedPu;

    return matchesSearch && matchesPu;
  });

  const isLoading = membersLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      {/* Sync / Offline banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm gap-4">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="outline" className="border-green-600 text-green-600 bg-green-500/5 py-1 px-3 flex items-center gap-1.5">
              <Wifi className="w-4 h-4" />
              Synced & Online
            </Badge>
          ) : (
            <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-500/5 py-1 px-3 flex items-center gap-1.5">
              <WifiOff className="w-4 h-4 animate-pulse" />
              Offline Mode Active ({offlineQueue.length} pending sync)
            </Badge>
          )}
          {offlineQueue.length > 0 && isOnline && (
            <Button
              size="xs"
              variant="outline"
              onClick={triggerSync}
              disabled={isSyncing}
              className="text-[10px] py-0.5 px-2 gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              Sync Queue
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Voter Registry: <span className="font-bold text-foreground">{members.length}</span> voters listed.
        </div>
      </div>

      {/* QUICK ACTIONS PANEL */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions Panel</CardTitle>
          <CardDescription>Simulate QR card scanning or search directory for checking in voters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Button
              onClick={startCamera}
              className="md:w-1/4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs h-[42px] cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              📁 Scan Member QR Code
            </Button>

            <div className="flex-1 relative">
              <input
                className="input-premium pl-9 text-xs w-full h-[42px]"
                placeholder="Search Member Name, Phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="md:w-1/4">
              <select
                className="input-premium w-full text-xs h-[42px] bg-card"
                value={selectedPu}
                onChange={(e) => setSelectedPu(e.target.value)}
              >
                <option value="all">Filter by Polling Unit: All</option>
                {uniquePus.map((pu) => (
                  <option key={pu} value={pu}>
                    {pu}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MEMBER ROSTER */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading voter roster...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-40 text-gray-400" />
              <p className="text-sm font-semibold">No members found</p>
              <p className="text-xs text-gray-400 mt-1">Refine search criteria or check selected filters.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="p-4 font-semibold text-xs text-muted-foreground pl-6">Member Info</th>
                      <th className="p-4 font-semibold text-xs text-muted-foreground">Polling Unit</th>
                      <th className="p-4 font-semibold text-xs text-muted-foreground text-center">Attendance Check-in</th>
                      <th className="p-4 font-semibold text-xs text-muted-foreground text-center">Voting Confirmation</th>
                      <th className="p-4 font-semibold text-xs text-muted-foreground pr-6 text-right">Instant Incentive Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {filteredMembers.map((m) => {
                      const status = localAttendance[m.id] || {
                        arrived: false,
                        voted_our_party: false,
                        loyalty_enrolled: false
                      };

                      return (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4 pl-6">
                            <span className="font-bold text-foreground block">{m.full_name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                              {m.membership_id} • <Phone className="w-2.5 h-2.5" /> {m.phone || "No Phone"}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-semibold text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {m.polling_unit || "—"}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={status.arrived}
                                onCheckedChange={() => handleToggle(m.id, "arrived")}
                                className="w-5 h-5 border-border rounded-md"
                              />
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={status.voted_our_party}
                                onCheckedChange={() => handleToggle(m.id, "voted_our_party")}
                                className="w-5 h-5 border-border rounded-md"
                              />
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            {status.arrived && status.voted_our_party ? (
                              <Button
                                size="sm"
                                onClick={() => setSelectedMemberForIncentive(m)}
                                className="bg-gradient-to-r from-apc-green to-indigo-600 hover:opacity-90 text-white text-xs gap-1.5 cursor-pointer"
                              >
                                <Gift className="w-3.5 h-3.5" />
                                Issue Incentive
                              </Button>
                            ) : status.arrived ? (
                              <Badge variant="outline" className="border-red-500 text-red-500 bg-red-500/5 py-1 px-2.5">
                                Ineligible (Didn't vote party)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-300 text-gray-500 bg-gray-100 py-1 px-2.5">
                                Awaiting Arrival
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile-Optimized Roster Cards */}
              <div className="block md:hidden divide-y">
                {filteredMembers.map((m) => {
                  const status = localAttendance[m.id] || {
                    arrived: false,
                    voted_our_party: false,
                    loyalty_enrolled: false
                  };

                  return (
                    <div key={m.id} className="p-4 space-y-4 hover:bg-muted/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-foreground text-sm block">{m.full_name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID: {m.membership_id} • {m.phone || "No Phone"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">
                            {m.polling_unit || "No PU"}
                          </span>
                        </div>
                      </div>

                      {/* Checkboxes Row */}
                      <div className="grid grid-cols-2 gap-4 bg-muted/30 p-2.5 rounded-lg border">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <Checkbox
                            checked={status.arrived}
                            onCheckedChange={() => handleToggle(m.id, "arrived")}
                            className="w-4 h-4 border-border rounded"
                          />
                          <span>Arrived</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <Checkbox
                            checked={status.voted_our_party}
                            onCheckedChange={() => handleToggle(m.id, "voted_our_party")}
                            className="w-4 h-4 border-border rounded"
                          />
                          <span>Voted Party</span>
                        </label>
                      </div>

                      {/* Incentive Status Button */}
                      <div className="flex justify-end pt-1">
                        {status.arrived && status.voted_our_party ? (
                          <Button
                            size="sm"
                            onClick={() => setSelectedMemberForIncentive(m)}
                            className="w-full bg-gradient-to-r from-apc-green to-indigo-600 hover:opacity-90 text-white text-xs gap-1.5 cursor-pointer"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            Issue Incentive
                          </Button>
                        ) : status.arrived ? (
                          <span className="text-[11px] font-bold text-red-600 bg-red-500/5 border border-red-500/30 rounded py-1 px-3 w-full text-center">
                            Ineligible (Didn't vote party)
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500 bg-gray-100 rounded py-1 px-3 w-full text-center">
                            Awaiting Arrival
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* LOYALTY CARD UPGRADE MODAL POPUP */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-600">
              <Award className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">Loyalty Scheme Upgrade</h3>
              <p className="text-xs text-muted-foreground mt-1">
                System Notification: Member successfully upgraded to Loyalty Card Scheme!
              </p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border text-sm font-semibold">
              {upgradeMemberName}
            </div>
            <Button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full bg-navy-deep text-white text-xs cursor-pointer"
            >
              Acknowledge & Continue
            </Button>
          </div>
        </div>
      )}

      {/* LIVE CAMERA IN-BROWSER SCANNER MODAL */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col h-[480px]">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-500" />
                Live Camera QR Scanner
              </span>
              <Button size="xs" variant="ghost" onClick={stopCamera} className="text-xs cursor-pointer">
                Cancel
              </Button>
            </div>
            <div className="flex-1 bg-black relative flex items-center justify-center">
              {cameraError ? (
                <div className="text-center p-6 text-white space-y-2">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                  <p className="text-xs font-semibold">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Neon laser overlay */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500 shadow-[0_0_8px_red] animate-[scan_2s_ease-in-out_infinite]" />
                  <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-dashed border-indigo-500/70 rounded-lg" />
                  </div>
                </>
              )}
            </div>
            {/* Quick Sim Selector in camera view if device lacks camera */}
            <div className="p-4 border-t bg-card space-y-3">
              <p className="text-[10px] text-muted-foreground text-center">
                Camera active. Alternatively, choose a member below to simulate a QR scan:
              </p>
              <select
                className="input-premium w-full text-xs h-[38px] bg-card"
                onChange={(e) => {
                  if (e.target.value) {
                    handleSimulatedQrScan(e.target.value);
                  }
                }}
              >
                <option value="">-- Choose Member to Simulate QR Scan --</option>
                {members.slice(0, 15).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.membership_id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SELECT AND ISSUE INCENTIVE POPUP MODAL */}
      {selectedMemberForIncentive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4 animate-scale-in">
            <div>
              <h3 className="text-base font-bold text-foreground">Issue Political Incentive</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select an accepted campaign incentive package to award to{" "}
                <span className="font-bold text-foreground">{selectedMemberForIncentive.full_name}</span>.
              </p>
            </div>

            {acceptedBatches.length === 0 ? (
              <div className="p-4 bg-muted/40 rounded-lg text-center border">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-muted-foreground">No available/accepted incentives</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Confirm receipt of routed packages in the "Incoming Incentives" tab first.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Select Incentive Package</label>
                  <select
                    className="input-premium w-full text-xs h-[40px] bg-card"
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      setUomQuantity("1");
                      setUomAllocationType("whole");
                    }}
                  >
                    <option value="">-- Select Package --</option>
                    {acceptedBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.item_name}) - {b.total_packages - b.disbursed_packages} left
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const batch = acceptedBatches.find((b) => b.id === selectedBatchId);
                  if (batch && batch.type === "material" && batch.conversion_rate) {
                    return (
                      <div className="space-y-3 border-t pt-3">
                        {/* Toggle Selector */}
                        <div className="grid grid-cols-2 gap-2 bg-muted/45 p-1 rounded-lg border">
                          <Button
                            type="button"
                            variant={uomAllocationType === "whole" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => {
                              setUomAllocationType("whole");
                              setUomQuantity("1");
                            }}
                            className="text-xs py-1 h-[28px]"
                          >
                            Whole {batch.bulk_unit || "Bag"}
                          </Button>
                          <Button
                            type="button"
                            variant={uomAllocationType === "fractional" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => {
                              setUomAllocationType("fractional");
                              setUomQuantity("");
                            }}
                            className="text-xs py-1 h-[28px]"
                          >
                            Fractional / {batch.retail_unit || "Tiya"}
                          </Button>
                        </div>

                        {/* Quantity Input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Quantity ({uomAllocationType === "whole" ? batch.bulk_unit || "Bag" : batch.retail_unit || "Tiya"})
                          </label>
                          <input
                            type="number"
                            step="any"
                            className="input-premium w-full text-xs h-[36px]"
                            placeholder={uomAllocationType === "whole" ? "e.g. 1" : "e.g. 5"}
                            value={uomQuantity}
                            onChange={(e) => setUomQuantity(e.target.value)}
                          />
                        </div>

                        {/* Calculation Summary */}
                        {uomQuantity && !isNaN(parseFloat(uomQuantity)) && (
                          <div className="p-2.5 bg-muted/30 border rounded-lg text-[11px] space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Allocation:</span>
                              <span className="font-semibold text-foreground">
                                {uomQuantity} {uomAllocationType === "whole" ? batch.bulk_unit || "Bag" : batch.retail_unit || "Tiya"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Inventory Deduction:</span>
                              <span className="font-bold text-indigo-600">
                                {uomAllocationType === "whole" 
                                  ? parseFloat(uomQuantity).toFixed(3)
                                  : (parseFloat(uomQuantity) / Number(batch.conversion_rate)).toFixed(3)
                                } {batch.bulk_unit || "Bag"}(s)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="pt-2 flex justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMemberForIncentive(null);
                      setSelectedBatchId("");
                    }}
                    className="text-xs w-1/3 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleIssueIncentive}
                    disabled={!selectedBatchId || disburseMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs gap-1 cursor-pointer"
                  >
                    {disburseMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Disburse Incentive
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
