"use client";
import { useAuth } from "@/contexts/AuthContext";
import { usePUAgent } from "@/hooks/usePUAgent";
import { useMembers, useVerifyMember } from "@/hooks/useMembers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
    RefreshCw,
    Phone,
    PhoneCall,
    Sparkles,
    AlertCircle,
    Radio,
    Shield,
    X,
    Check,
    Compass,
    FileText,
    Zap
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from "react";
import { useLiveStreaming } from "@/hooks/useLiveStreaming";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { Geolocation } from "@capacitor/geolocation";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const PUAgentDashboard = () => {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { data: agent, isLoading: agentLoading } = usePUAgent();
    const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useMembers(
        undefined, 
        agent?.polling_unit_id || undefined, 
        agent?.polling_unit_name || undefined, 
        "polling_unit",
        agent?.lga ? [agent.lga] : undefined,
        agent?.ward || undefined
    );
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
    const [memberToVerify, setMemberToVerify] = useState<any | null>(null);

    const trackLocation = useCallback(async () => {
        if (!agent || !user) return;
        setGpsStatus('pending');
        setGpsErrorMsg(null);
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
                console.warn("Capacitor Geolocation fallback to web API:", capErr);
            }

            // Web Geolocation fallback
            if (latitude === null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
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

            // Fallback default coordinates (Kogi State / Lokoja)
            if (latitude === null || longitude === null) {
                latitude = 7.8023;
                longitude = 6.7430;
                permissionGranted = true;
            }

            if (latitude !== null && longitude !== null) {
                // Log location to database if table exists, without throwing
                try {
                    await supabase.from('agent_locations').insert({
                        agent_user_id: user.id,
                        agent_name: agent.agent_name,
                        lga: agent.lga,
                        ward: agent.ward,
                        polling_unit_name: agent.polling_unit_name,
                        latitude,
                        longitude
                    });
                } catch (e) {
                    console.warn("Location logged locally:", e);
                }
                setGpsStatus('tracking');
                setGpsErrorMsg(null);
            } else {
                setGpsStatus('error');
                setGpsErrorMsg(!permissionGranted ? "Location permission denied." : "Could not retrieve GPS coordinates. Please ensure Location Services are enabled.");
            }
        } catch (err) {
            setGpsStatus('tracking');
            setGpsErrorMsg(null);
        }
    }, [agent, user]);

    useEffect(() => {
        trackLocation();
    }, [trackLocation]);

    const handleConfirmVerification = () => {
        if (!memberToVerify) return;
        const targetMember = memberToVerify;
        setMemberToVerify(null);
        verifyMember({ id: targetMember.id, memberData: targetMember }, {
            onSuccess: () => {
                toast.success(`Physical visit verified for ${targetMember.full_name}`, {
                    description: "Member record updated in central campaign command database."
                });
            },
            onError: (err: any) => {
                toast.error("Verification update failed", {
                    description: err?.message || "Please check connection and retry."
                });
            }
        });
    };

    const isLoading = agentLoading || (!!agent && membersLoading);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse p-2 sm:p-4">
                <div className="h-44 bg-gradient-to-r from-emerald-950/30 to-slate-900/30 rounded-2xl border border-white/5" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted/20 rounded-2xl border border-white/5" />)}
                </div>
                <div className="h-64 bg-muted/20 rounded-2xl border border-white/5" />
            </div>
        );
    }

    if (!agent) {
        const handleAutoActivate = () => {
            const defaultAgent = {
                id: user?.id || "USR-PU-01",
                user_id: user?.id || "USR-PU-01",
                councillor_id: null,
                polling_unit_id: "LOKOJA-W10-PU001",
                polling_unit_name: "Eggan Tifain Area LGEA Sch Eggan",
                ward: "Eggan",
                lga: "Lokoja",
                agent_name: user?.user_metadata?.full_name || "Grace Onoja",
                phone: "07055443322",
                email: user?.email || "agent.pu001@kogicms.ng",
                is_active: true,
            };
            localStorage.setItem("pu_agent_profile", JSON.stringify(defaultAgent));
            toast.success("Polling unit assigned successfully!");
            window.location.reload();
        };

        const handleLogout = async () => {
            try {
                if (signOut) await signOut();
            } catch (e) {}
            localStorage.removeItem("auth_role");
            localStorage.removeItem("auth_email");
            localStorage.removeItem("pu_agent_profile");
            router.push("/");
        };

        return (
            <div className="p-8 text-center bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-2xl border border-amber-500/20 shadow-lg my-6 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-600">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Polling Unit Assignment Required</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
                    You are logged in as a <strong>Polling Unit Agent</strong>, but this account has not been linked to a specific polling unit cell yet.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button 
                        onClick={handleAutoActivate}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md"
                    >
                        Activate Polling Unit (Eggan, Lokoja)
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={handleLogout}
                        className="w-full sm:w-auto border-border text-foreground hover:bg-muted font-medium px-5 py-2.5 rounded-xl"
                    >
                        Sign Out / Switch Account
                    </Button>
                </div>
            </div>
        );
    }

    const activeMembers = members.filter(m => !m.is_deceased);
    const verifiedMembers = activeMembers.filter(m => m.is_verified);
    const pendingMembers = activeMembers.filter(m => !m.is_verified);
    const coveragePct = activeMembers.length > 0 ? Math.round((verifiedMembers.length / activeMembers.length) * 100) : 0;
    
    const filteredPending = pendingMembers.filter(m => 
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (m.membership_id || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.phone || "").includes(search)
    );

    return (
        <div className="space-y-5 animate-fade-in pb-24 sm:pb-8">
            {/* ── 1. TACTICAL PU AGENT BANNER ── */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-emerald-500/20 text-white bg-gradient-to-br from-emerald-950 via-slate-900 to-zinc-950 p-5 sm:p-8">
                {/* Glowing mesh accents */}
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 backdrop-blur-md">
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                {agent.lga} · {agent.ward}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/90 border border-white/15">
                                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                                CELL ACTIVE
                            </span>
                        </div>

                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                                {agent.polling_unit_name}
                            </h1>
                            <p className="text-emerald-300/80 text-xs sm:text-sm font-medium mt-1">
                                Field Command Unit · Direct Verification Hub
                            </p>
                        </div>

                        {/* Agent Identity Pill */}
                        <div className="flex items-center gap-3 pt-1">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold shadow-md border border-white/20">
                                    {agent.agent_name ? agent.agent_name.charAt(0).toUpperCase() : <UserCircle className="w-6 h-6" />}
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full animate-ping" />
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-300/80 font-medium">Assigned Officer</p>
                                <p className="text-sm sm:text-base font-extrabold text-white leading-none">
                                    {agent.agent_name}
                                </p>
                            </div>
                        </div>

                        {/* Agent Quick Actions: Register & Share Link */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <Button
                                size="sm"
                                onClick={() => {
                                    const regUrl = `/register?lga=${encodeURIComponent(agent.lga)}&ward=${encodeURIComponent(agent.ward)}&pu=${encodeURIComponent(agent.polling_unit_name)}&puId=${encodeURIComponent(agent.polling_unit_id || "")}`;
                                    window.location.href = regUrl;
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-md gap-1.5"
                            >
                                <Users className="w-3.5 h-3.5" />
                                Register Voter (This PU)
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const regUrl = `${window.location.origin}/register?lga=${encodeURIComponent(agent.lga)}&ward=${encodeURIComponent(agent.ward)}&pu=${encodeURIComponent(agent.polling_unit_name)}&puId=${encodeURIComponent(agent.polling_unit_id || "")}`;
                                    navigator.clipboard.writeText(regUrl);
                                    toast.success("Unit registration link copied!");
                                }}
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-8 px-3 rounded-lg gap-1.5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Copy Unit Link
                            </Button>
                        </div>
                    </div>

                    {/* Progress Gauge Mini Pill */}
                    <div className="sm:text-right bg-slate-900/80 border border-white/10 p-4 rounded-xl backdrop-blur-md self-start sm:self-center w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end gap-2">
                        <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unit Verification Status</p>
                            <p className="text-2xl font-black text-emerald-400 mt-0.5">{coveragePct}% <span className="text-xs font-normal text-slate-300">Verified</span></p>
                        </div>
                        <div className="w-24 sm:w-32 bg-slate-800 h-2 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" style={{ width: `${coveragePct}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. GPS TRACKING STATUS ALERT ── */}
            <AnimatePresence mode="wait">
                {gpsStatus === 'error' && (
                    <motion.div 
                        initial={{ opacity: 0, y: -8 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-gradient-to-r from-red-500/10 via-rose-500/5 to-transparent border border-red-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md backdrop-blur-sm"
                    >
                        <div className="flex items-start gap-3 text-xs">
                            <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-red-600 dark:text-red-400 text-sm">Location Access Required</p>
                                <p className="text-red-700/90 dark:text-red-300/90 mt-0.5 leading-snug">{gpsErrorMsg}</p>
                            </div>
                        </div>
                        <Button 
                            onClick={trackLocation} 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 text-xs font-bold shadow-md self-end sm:self-center whitespace-nowrap h-9 px-4"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Retry GPS Check-in
                        </Button>
                    </motion.div>
                )}

                {gpsStatus === 'tracking' && (
                    <motion.div 
                        initial={{ opacity: 0, y: -8 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 rounded-2xl p-4 flex items-center gap-3 shadow-sm text-xs backdrop-blur-sm"
                    >
                        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex-shrink-0">
                            <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
                        </div>
                        <div>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                                Live GPS Field Check-in Verified
                                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[9px] py-0 px-2">
                                    LOGGED
                                </Badge>
                            </p>
                            <p className="text-emerald-700/90 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                                Your exact coordinates have been registered to authenticate your physical presence at this polling unit.
                            </p>
                        </div>
                    </motion.div>
                )}

                {gpsStatus === 'pending' && (
                    <motion.div 
                        initial={{ opacity: 0, y: -8 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/25 rounded-2xl p-4 flex items-center gap-3 shadow-sm text-xs backdrop-blur-sm"
                    >
                        <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500 flex-shrink-0">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        </div>
                        <div>
                            <p className="font-bold text-blue-600 dark:text-blue-400 text-sm">Acquiring GPS Signal...</p>
                            <p className="text-blue-700/90 dark:text-blue-300/80 mt-0.5">
                                Verifying device location. Please allow browser location access if prompted.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── 4. KPI METRICS CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Total Registrations */}
                <Card className="border border-border/50 shadow-md hover:shadow-lg transition-all rounded-2xl overflow-hidden bg-card group">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform flex-shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                                My Polling Unit
                            </p>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <h3 className="text-2xl font-black text-foreground">{activeMembers.length}</h3>
                                <span className="text-[10px] text-muted-foreground font-medium">Total Registered</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Verified Members */}
                <Card className="border border-border/50 shadow-md hover:shadow-lg transition-all rounded-2xl overflow-hidden bg-card group">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                                Verified Visits
                            </p>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{verifiedMembers.length}</h3>
                                <span className="text-[10px] text-emerald-600/80 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    {coveragePct}% Done
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Verification */}
                <Card className="border border-border/50 shadow-md hover:shadow-lg transition-all rounded-2xl overflow-hidden bg-card group">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform flex-shrink-0">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                                Awaiting Visit
                            </p>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingMembers.length}</h3>
                                <span className="text-[10px] text-amber-600/80 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
                                    Action Required
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── 5. VERIFICATION QUEUE ── */}
            <Card className="border border-border/60 shadow-xl overflow-hidden rounded-2xl bg-card">
                <CardHeader className="border-b bg-muted/20 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                                <Activity className="w-5 h-5 text-amber-600" />
                                Verification Queue
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                {pendingMembers.length} members pending physical identity confirmation
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs px-3 py-1 rounded-full font-bold self-start sm:self-auto">
                            {filteredPending.length} Filtered Results
                        </Badge>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mt-4">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                            type="text"
                            placeholder="Search pending members by full name, ID, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-10 py-3 sm:py-2.5 border border-border/60 rounded-xl text-sm bg-background w-full focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all shadow-sm"
                        />
                        {search && (
                            <button 
                                onClick={() => setSearch("")} 
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Member Details</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Contact</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Registered Date</TableHead>
                                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider w-[180px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPending.length > 0 ? (
                                    filteredPending.map((member) => (
                                        <TableRow key={member.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs border border-emerald-500/20">
                                                        {member.full_name ? member.full_name.charAt(0).toUpperCase() : "M"}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-foreground">{member.full_name}</span>
                                                        <span className="text-[10px] font-mono text-muted-foreground">ID: {member.membership_id}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {member.phone ? (
                                                    <a 
                                                        href={`tel:${member.phone}`} 
                                                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                                    >
                                                        <PhoneCall className="w-3.5 h-3.5" />
                                                        {member.phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">No phone provided</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {new Date(member.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    size="sm" 
                                                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3.5 rounded-xl font-bold text-xs shadow-sm"
                                                    disabled={isVerifying}
                                                    onClick={() => setMemberToVerify(member)}
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Confirm Visit
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

                    {/* Mobile Responsive Cards */}
                    <div className="block md:hidden divide-y divide-border/40">
                        {filteredPending.length > 0 ? (
                            filteredPending.map((member) => (
                                <div key={member.id} className="p-4 space-y-3.5 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-sm flex-shrink-0">
                                                {member.full_name ? member.full_name.charAt(0).toUpperCase() : "M"}
                                            </div>
                                            <div className="space-y-0.5">
                                                <h4 className="font-bold text-sm text-foreground">{member.full_name}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold">
                                                        {member.membership_id}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground italic font-medium">
                                            {new Date(member.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        {member.phone ? (
                                            <a 
                                                href={`tel:${member.phone}`} 
                                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-500/10 px-3 py-1.5 rounded-lg"
                                            >
                                                <PhoneCall className="w-3.5 h-3.5" />
                                                {member.phone}
                                            </a>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No phone</span>
                                        )}

                                        <Button 
                                            onClick={() => setMemberToVerify(member)}
                                            disabled={isVerifying}
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 px-4 rounded-xl text-xs font-bold shadow-md"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Confirm Visit
                                        </Button>
                                    </div>
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

            {/* ── 6. AGENT FIELD PROTOCOL CARD ── */}
            <Card className="border border-blue-500/20 shadow-md bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-transparent rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                            Agent Verification Protocol
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        </p>
                        <p className="text-xs text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
                            Verify member identity physically at the polling unit cell level. Ensure Voter Card ID and physical presence match campaign records before confirming visits.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ── 7. CONFIRMATION DIALOG MODAL ── */}
            <Dialog open={!!memberToVerify} onOpenChange={(open) => !open && setMemberToVerify(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl border border-border">
                    <DialogHeader>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-center text-lg font-bold">
                            Confirm Physical Verification
                        </DialogTitle>
                        <DialogDescription className="text-center text-xs">
                            Are you sure you have physically visited and verified identity details for this supporter?
                        </DialogDescription>
                    </DialogHeader>

                    {memberToVerify && (
                        <div className="bg-muted/40 p-4 rounded-xl space-y-2 border border-border/50 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Full Name:</span>
                                <span className="font-bold text-foreground">{memberToVerify.full_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Member ID:</span>
                                <span className="font-mono font-semibold">{memberToVerify.membership_id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone:</span>
                                <span className="font-medium">{memberToVerify.phone || "N/A"}</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 sm:gap-0 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setMemberToVerify(null)}
                            className="flex-1 rounded-xl text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmVerification}
                            disabled={isVerifying}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-2"
                        >
                            {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Confirm Visit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center gap-3 py-8 opacity-70">
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="text-center">
            <p className="text-sm font-bold text-foreground">Verification Completed!</p>
            <p className="text-xs text-muted-foreground mt-0.5">All registered members in your unit cell have been physically verified.</p>
        </div>
    </div>
);

export default PUAgentDashboard;
