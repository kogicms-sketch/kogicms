"use client";
import { useAuth } from "@/contexts/AuthContext";
import { usePUAgent } from "@/hooks/usePUAgent";
import { useMembers, useVerifyMember } from "@/hooks/useMembers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Users, 
    ShieldCheck, 
    Activity, 
    MapPin, 
    ChevronRight,
    Search,
    UserCircle,
    CheckCircle2,
    Loader2,
    Video,
    VideoOff,
    Volume2,
    RefreshCw
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from "react";
import { useLiveStreaming } from "@/hooks/useLiveStreaming";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { Geolocation } from "@capacitor/geolocation";
import { supabase } from "@/integrations/supabase/client";

const PUAgentDashboard = () => {
    const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
    const { user } = useAuth();
    const { data: agent, isLoading: agentLoading } = usePUAgent();
    const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useMembers(undefined, agent?.polling_unit_id || undefined, agent?.polling_unit_name || undefined, "polling_unit");
    const { mutate: verifyMember, isPending: isVerifying } = useVerifyMember();

    const {
        localStream,
        activeBroadcast,
        isIntercomSpeaking,
        facingMode,
        startBroadcast,
        stopBroadcast,
        toggleCameraFacing
    } = useLiveStreaming();

    const videoRef = useCallback((node: HTMLVideoElement | null) => {
        if (node && localStream) {
            node.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        // Trigger a background query refetch on mount to ensure fresh data
        refetchMembers();
    }, [refetchMembers]);
    const [search, setSearch] = useState("");
    const [gpsStatus, setGpsStatus] = useState<'tracking' | 'error' | 'pending'>('pending');
    const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!agent || !user) return;

        const trackLocation = async () => {
            setGpsStatus('pending');
            try {
                let latitude: number | null = null;
                let longitude: number | null = null;
                let permissionGranted = false;

                // Try Capacitor Geolocation first
                try {
                    let permission = await Geolocation.checkPermissions();
                    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
                        permission = await Geolocation.requestPermissions();
                    }
                    if (permission.location === 'granted' || permission.coarseLocation === 'granted') {
                        permissionGranted = true;
                        const position = await Geolocation.getCurrentPosition({
                            enableHighAccuracy: true,
                            timeout: 10000
                        });
                        latitude = position.coords.latitude;
                        longitude = position.coords.longitude;
                    }
                } catch (capErr) {
                    console.warn("Capacitor Geolocation error, attempting web fallback:", capErr);
                }

                // Web API Fallback if Capacitor failed or didn't get coordinates
                if (latitude === null && navigator.geolocation) {
                    try {
                        const webPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 10000
                            });
                        });
                        latitude = webPosition.coords.latitude;
                        longitude = webPosition.coords.longitude;
                        permissionGranted = true;
                    } catch (webErr) {
                        console.warn("Web Geolocation fallback failed:", webErr);
                    }
                }

                if (latitude !== null && longitude !== null) {
                    // Log location to database
                    const { error } = await supabase.from('agent_locations').insert({
                        agent_user_id: user.id,
                        agent_name: agent.agent_name,
                        lga: agent.lga,
                        ward: agent.ward,
                        polling_unit_name: agent.polling_unit_name,
                        latitude,
                        longitude
                    });

                    if (error) {
                        console.warn("⚠️ Failed to write location log to database:", error.message);
                        setGpsStatus('error');
                        setGpsErrorMsg("Database sync failed: " + error.message);
                    } else {
                        console.log("📍 Polling Unit Agent location logged successfully:", { latitude, longitude });
                        setGpsStatus('tracking');
                        setGpsErrorMsg(null);
                    }
                } else {
                    setGpsStatus('error');
                    setGpsErrorMsg(!permissionGranted ? "Location permission denied." : "Could not retrieve GPS coordinates. Please ensure GPS/Location Services are turned on.");
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "GPS tracking failed.";
                console.warn("⚠️ Error tracking location:", err);
                setGpsStatus('error');
                setGpsErrorMsg(errorMsg);
            }
        };

        trackLocation();
    }, [agent, user]);

    const isLoading = agentLoading || membersLoading;

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-40 bg-muted/20 rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/20 rounded-xl" />)}
                </div>
                <div className="h-64 bg-muted/20 rounded-xl" />
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="p-8 text-center bg-orange-50 rounded-xl border border-orange-200">
                <ShieldCheck className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-orange-800 mb-2">Polling Unit Assignment Required</h3>
                <p className="text-orange-700/80">You have not been assigned to a polling unit yet. Please contact your coordinator.</p>
            </div>
        );
    }

    const activeMembers = members.filter(m => !m.is_deceased);
    const verifiedMembers = activeMembers.filter(m => m.is_verified);
    const pendingMembers = activeMembers.filter(m => !m.is_verified);
    
    const filteredPending = pendingMembers.filter(m => 
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (m.phone || "").includes(search)
    );

    const stats = [
        { label: "My Polling Unit", value: activeMembers.length, sub: "Total Registrations", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Verified", value: verifiedMembers.length, sub: "Physically Confirmed", icon: CheckCircle2, color: "text-apc-green", bg: "bg-green-50" },
        { label: "Awaiting Visit", value: pendingMembers.length, sub: "Action Required", icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
    ];

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 sm:pb-0">
            {/* PU Agent Banner */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg border border-white/20" style={{ background: 'linear-gradient(135deg, #006600 0%, #004d00 100%)' }}>
                <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
                
                <div className="relative z-10 p-5 sm:p-8">
                    <div className="space-y-1 sm:space-y-2">
                        <div className="flex items-center gap-2 text-white/70 font-medium tracking-wide uppercase text-[10px] sm:text-xs">
                            <MapPin className="w-3 h-3" />
                            {agent.lga} · {agent.ward}
                        </div>
                        <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
                            {agent.polling_unit_name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                <UserCircle className="w-5 h-5 text-white/80" />
                            </div>
                            <p className="text-white/90 text-xs sm:text-sm font-medium">
                                Agent: <span className="font-bold">{agent.agent_name}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* GPS Tracking Status Alert */}
            {gpsStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3 shadow-sm text-red-800 text-xs">
                    <MapPin className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Location Access Required</p>
                        <p className="text-red-700/95 mt-0.5">{gpsErrorMsg}</p>
                    </div>
                </div>
            )}
            {gpsStatus === 'tracking' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-start gap-3 shadow-sm text-green-800 text-xs">
                    <MapPin className="w-4.5 h-4.5 text-green-600 flex-shrink-0 mt-0.5 animate-bounce" />
                    <div>
                        <p className="font-bold">Live GPS Check-in Active</p>
                        <p className="text-green-700/90 mt-0.5">Your location has been securely registered to validate this Polling Unit's field operations.</p>
                    </div>
                </div>
            )}
            {gpsStatus === 'pending' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 shadow-sm text-blue-800 text-xs">
                    <Loader2 className="w-4.5 h-4.5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                    <div>
                        <p className="font-bold">Acquiring GPS Signal...</p>
                        <p className="text-blue-700/90 mt-0.5">Please allow location permissions if prompted by your browser or device.</p>
                    </div>
                </div>
            )}

            {/* Live Media Stream Broadcast Section */}
            <Card className="border-none shadow-premium overflow-hidden bg-slate-900 text-white rounded-xl">
                <CardHeader className="bg-slate-950 p-4 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                {activeBroadcast ? (
                                    <>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                                    </>
                                ) : (
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-600" />
                                )}
                            </span>
                            <CardTitle className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                                <Video className="w-4 h-4 text-emerald-500" />
                                Live Movement Broadcast
                            </CardTitle>
                        </div>
                        {activeBroadcast && (
                            <Badge className="bg-red-600 hover:bg-red-700 text-white animate-pulse text-[10px] uppercase font-bold py-0.5 px-2 rounded-full">
                                Streaming Live
                            </Badge>
                        )}
                    </div>
                    <CardDescription className="text-xs text-slate-400 mt-1">
                        Securely stream tactical polling unit movements directly to the ward and super-admin command walls.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 flex flex-col gap-4">
                    {isIntercomSpeaking && (
                        <div className="bg-green-950/80 border border-green-500/35 text-green-300 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                            <Volume2 className="w-5 h-5 text-green-400 flex-shrink-0 animate-bounce" />
                            <div>
                                <p className="font-bold text-xs uppercase tracking-wider text-green-200">Command Intercom Active</p>
                                <p className="text-[10px] text-green-400/90 mt-0.5">🔊 Command Centre Is Speaking...</p>
                            </div>
                        </div>
                    )}

                    {activeBroadcast && localStream ? (
                        <div className="space-y-4">
                            {/* Video preview container */}
                            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover scale-x-[-1]"
                                />
                                <div className="absolute bottom-2 left-2 bg-slate-950/85 px-2.5 py-1 rounded text-[10px] font-medium text-slate-300 flex items-center gap-1.5 backdrop-blur-sm border border-slate-800/80">
                                    <MapPin className="w-3 h-3 text-red-500" />
                                    {agent.polling_unit_name}
                                </div>
                                <div className="absolute top-2 right-2 bg-slate-950/85 px-2 py-0.5 rounded text-[9px] font-bold text-slate-300 flex items-center gap-1 backdrop-blur-sm border border-slate-800/80">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    ABR ENABLED
                                </div>
                            </div>

                            {/* Stream controls */}
                            <div className="flex gap-3">
                                <Button
                                    variant="destructive"
                                    onClick={stopBroadcast}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-11 text-xs sm:text-sm rounded-lg"
                                >
                                    <VideoOff className="w-4 h-4 mr-2" />
                                    Stop Streaming
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={toggleCameraFacing}
                                    className="bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-100 font-medium h-11 text-xs px-4 rounded-lg"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Flip Camera
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={() => {
                                startBroadcast({
                                    agent_name: agent.agent_name,
                                    polling_unit_id: agent.polling_unit_id,
                                    polling_unit_code: null,
                                    polling_unit_name: agent.polling_unit_name,
                                    ward: agent.ward,
                                    lga: agent.lga
                                });
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-12 text-sm rounded-lg shadow-lg hover:shadow-emerald-950/20 transition-all uppercase tracking-wider"
                        >
                            <Video className="w-4.5 h-4.5 mr-2 animate-pulse" />
                            Go Live / Broadcast Election Movement
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {stats.map((s, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden group">
                        <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                            <div className={`${s.bg} p-2.5 sm:p-3 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform`}>
                                <s.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.color}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</h3>
                                    <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium hidden xs:inline">{s.sub}</span>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/30 sm:hidden" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Verification Queue */}
            <Card className="border-none shadow-premium overflow-hidden rounded-xl">
                <CardHeader className="border-b bg-muted/5 p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                                    Verification Queue
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {pendingMembers.length} members awaiting visit
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] h-5 px-2">
                                {filteredPending.length} listed
                            </Badge>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                                type="text"
                                placeholder="Search by name or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2.5 sm:py-2 border rounded-xl text-sm bg-background w-full focus:ring-2 focus:ring-apc-green/20 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Table for Desktop */}
                    <div className="hidden sm:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="font-bold">Member Details</TableHead>
                                    <TableHead className="font-bold">Contact</TableHead>
                                    <TableHead className="font-bold">Registration</TableHead>
                                    <TableHead className="text-right font-bold w-[150px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPending.length > 0 ? (
                                    filteredPending.map((member) => (
                                        <TableRow key={member.id} className="hover:bg-muted/10 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-foreground">{member.full_name}</span>
                                                    <span className="text-[10px] text-muted-foreground">ID: {member.membership_id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground">{member.phone || "No phone"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-medium text-foreground">
                                                    Joined {new Date(member.created_at).toLocaleDateString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    size="sm" 
                                                    className="h-8 bg-apc-green hover:bg-apc-green/90 text-white gap-1 px-3"
                                                    disabled={isVerifying}
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
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12">
                                            <EmptyState />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile List View */}
                    <div className="block sm:hidden divide-y divide-border/50">
                        {filteredPending.length > 0 ? (
                            filteredPending.map((member) => (
                                <div key={member.id} className="p-4 space-y-3 hover:bg-muted/5 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-sm text-foreground">{member.full_name}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">
                                                    {member.membership_id}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {member.phone || "No phone"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground text-right italic">
                                            {new Date(member.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Confirm physical verification for ${member.full_name}?`)) {
                                                verifyMember(member.id);
                                            }
                                        }}
                                        disabled={isVerifying}
                                        className="w-full bg-apc-green hover:bg-apc-green/90 text-white gap-2 h-10 shadow-sm rounded-lg text-xs"
                                    >
                                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        Confirm Physical Visit
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <EmptyState />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Tips */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 shadow-sm mx-1">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-blue-800 uppercase tracking-tight">Agent Field Protocol</p>
                    <p className="text-[10px] sm:text-xs text-blue-700/80 leading-relaxed">
                        Verify member identity by matching their physical appearance and Voter Card ID with their digital record. Confirming a visit helps us maintain accurate field intel.
                    </p>
                </div>
            </div>
        </div>
    );
};

const EmptyState = () => (
    <div className="flex flex-col items-center gap-3 py-6 opacity-60">
        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-apc-green" />
        </div>
        <div className="text-center">
            <p className="text-sm font-bold">Verification Complete!</p>
            <p className="text-[10px] text-muted-foreground">All members in your unit are verified.</p>
        </div>
    </div>
);


export default PUAgentDashboard;
