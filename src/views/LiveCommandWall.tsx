import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorizedLgas } from "@/hooks/useAuthorizedLgas";
import { useLiveStreaming } from "@/hooks/useLiveStreaming";
import { supabase } from "@/integrations/supabase/loose-client";
import { useQuery } from "@tanstack/react-query";
import {
    Search,
    Video,
    Volume2,
    Mic,
    Maximize2,
    Minimize2,
    MapPin,
    AlertCircle,
    User,
    Wifi,
    Grid,
    SearchCheck,
    Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toast } from "sonner";

interface LiveStream {
    id: string;
    agent_id: string;
    agent_name: string;
    polling_unit_id: string | null;
    polling_unit_code: string | null;
    polling_unit_name: string | null;
    ward: string;
    lga: string;
    status: string;
    created_at: string;
}

export default function LiveCommandWall() {
    const { user, role } = useAuth();
    const { data: authorizedLgas = [] } = useAuthorizedLgas();
    const [streams, setStreams] = useState<LiveStream[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedWard, setSelectedWard] = useState("all");
    const [selectedLga, setSelectedLga] = useState("all");
    const [fullscreenStream, setFullscreenStream] = useState<LiveStream | null>(null);

    const {
        remoteStreams,
        intercomActive,
        connectToAgent,
        disconnectFromAgent,
        startIntercom,
        stopIntercom
    } = useLiveStreaming();

    // Fetch councillor details if applicable (to filter by ward)
    const { data: councillor } = useQuery({
        queryKey: ["councillor-ward-info", user?.id],
        queryFn: async () => {
            if (role !== "councillor" || !user) return null;
            const { data, error } = await supabase
                .from("councillors")
                .select("ward, lga")
                .eq("user_id", user.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: role === "councillor" && !!user
    });

    // 1. Subscribe to Live Streams database registry in Realtime
    useEffect(() => {
        const fetchInitialStreams = async () => {
            const { data, error } = await supabase
                .from("live_streams")
                .select("*")
                .eq("status", "active");
            if (error) {
                console.error("Error fetching live streams:", error);
            } else {
                setStreams(data || []);
            }
        };

        fetchInitialStreams();

        const channel = supabase
            .channel("live-streams-registry-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "live_streams" },
                (payload) => {
                    const { eventType, new: newRow, old: oldRow } = payload;
                    if (eventType === "INSERT") {
                        if (newRow.status === "active") {
                            setStreams(prev => {
                                if (prev.some(s => s.id === newRow.id)) return prev;
                                return [...prev, newRow as LiveStream];
                            });
                        }
                    } else if (eventType === "UPDATE") {
                        if (newRow.status === "active") {
                            setStreams(prev => prev.map(s => s.id === newRow.id ? (newRow as LiveStream) : s));
                        } else {
                            setStreams(prev => prev.filter(s => s.id !== newRow.id));
                        }
                    } else if (eventType === "DELETE") {
                        setStreams(prev => prev.filter(s => s.id !== oldRow.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // 2. Determine geographic filters based on user access privileges
    const filteredStreams = streams.filter(stream => {
        // Match Search Query
        const matchSearch = (stream.polling_unit_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (stream.polling_unit_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (stream.agent_name || "").toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchSearch) return false;

        // Role-based Access filters
        if (role === "councillor" && councillor) {
            // Councillor can only view feeds from their specific ward and LGA
            return stream.lga === councillor.lga && stream.ward === councillor.ward;
        }

        // Check authorized LGAs (derived from Senatorial, Rep, LGA Chairmen, etc.)
        const isGlobalScope = authorizedLgas.includes("ALL");
        if (!isGlobalScope && authorizedLgas.length > 0) {
            const hasLgaAccess = authorizedLgas.includes(stream.lga);
            if (!hasLgaAccess) return false;
        }

        // Additional manual page filter options
        if (selectedLga !== "all" && stream.lga !== selectedLga) return false;
        if (selectedWard !== "all" && stream.ward !== selectedWard) return false;

        return true;
    });

    // Wards and LGAs available for filters
    const availableLgas = Array.from(new Set(streams.map(s => s.lga))).sort();
    const availableWards = Array.from(new Set(streams.filter(s => selectedLga === "all" || s.lga === selectedLga).map(s => s.ward))).sort();

    return (
        <DashboardLayout
            title="Command Video Wall"
            subtitle="CCTV Live Election Surveillance Matrix"
        >
            <div className="bg-slate-950 text-slate-100 min-h-[75vh] p-4 sm:p-6 rounded-2xl border border-slate-900 shadow-2xl space-y-6">
                
                {/* ─── Header & Search bar ────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/60">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search Polling Unit Name, Code, or Agent..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 rounded-lg focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* LGA Selector (only shown to roles with multi-LGA access or global access) */}
                        {(authorizedLgas.includes("ALL") || authorizedLgas.length > 1) && (
                            <select
                                value={selectedLga}
                                onChange={(e) => { setSelectedLga(e.target.value); setSelectedWard("all"); }}
                                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-emerald-500 transition-colors"
                            >
                                <option value="all">All LGAs</option>
                                {availableLgas.map(lga => (
                                    <option key={lga} value={lga}>{lga}</option>
                                ))}
                            </select>
                        )}

                        {/* Ward Selector */}
                        {role !== "councillor" && (
                            <select
                                value={selectedWard}
                                onChange={(e) => setSelectedWard(e.target.value)}
                                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-emerald-500 transition-colors"
                            >
                                <option value="all">All Wards</option>
                                {availableWards.map(ward => (
                                    <option key={ward} value={ward}>{ward}</option>
                                ))}
                            </select>
                        )}

                        <Badge className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono px-2.5 py-1 flex items-center gap-1.5 rounded-md">
                            <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" />
                            {filteredStreams.length} Active Feeds
                        </Badge>
                    </div>
                </div>

                {/* ─── CCTV Survelliance Grid ─────────────────────────────────────── */}
                {filteredStreams.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredStreams.map(stream => (
                            <CCTVGridItem
                                key={stream.id}
                                stream={stream}
                                remoteStream={remoteStreams[stream.agent_id]}
                                connectToAgent={connectToAgent}
                                disconnectFromAgent={disconnectFromAgent}
                                onFullscreen={() => setFullscreenStream(stream)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/10 rounded-xl border border-dashed border-slate-800">
                        <Video className="w-12 h-12 text-slate-700 mb-4 animate-pulse" />
                        <h3 className="text-base font-bold text-slate-300 mb-1">No Active Streams</h3>
                        <p className="text-xs text-slate-500 max-w-sm px-4">
                            There are currently no polling unit agents broadcasting in this region. Active streams will appear here automatically.
                        </p>
                    </div>
                )}
            </div>

            {/* ─── Fullscreen Monitor Overlay with VoIP Intercom ──────────────── */}
            {fullscreenStream && (
                <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in">
                    <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Fullscreen Video Element */}
                        <div className="relative flex-1 bg-slate-950 aspect-video w-full overflow-hidden flex items-center justify-center">
                            <FullscreenVideoPlayer
                                remoteStream={remoteStreams[fullscreenStream.agent_id]}
                            />
                            
                            {/* Surrounding Video Overlay Details */}
                            <div className="absolute top-4 left-4 flex items-center gap-3">
                                <Badge className="bg-red-600 text-white font-mono text-[10px] animate-pulse uppercase px-2 py-0.5 rounded flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                    LIVE MONITOR
                                </Badge>
                                <div className="text-white text-xs bg-slate-900/80 px-2.5 py-1 rounded backdrop-blur-sm border border-slate-800 font-mono">
                                    Agent: {fullscreenStream.agent_name}
                                </div>
                            </div>

                            {/* Fullscreen close button */}
                            <Button
                                size="icon"
                                onClick={() => setFullscreenStream(null)}
                                className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-full"
                            >
                                <Minimize2 className="w-4.5 h-4.5" />
                            </Button>

                            {/* Alert when admin speaking */}
                            {intercomActive[fullscreenStream.agent_id] && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600/90 border border-emerald-400 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-bounce backdrop-blur shadow-lg text-xs font-bold uppercase tracking-wider">
                                    <Mic className="w-4 h-4 text-white animate-pulse" />
                                    Intercom Connected - You are speaking
                                </div>
                            )}
                        </div>

                        {/* Control bar */}
                        <div className="p-4 md:p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="space-y-1 text-center sm:text-left">
                                <h2 className="text-lg font-extrabold text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                                    <MapPin className="w-5 h-5 text-red-500" />
                                    {fullscreenStream.polling_unit_name}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Ward: <span className="text-slate-200">{fullscreenStream.ward}</span> · LGA: <span className="text-slate-200">{fullscreenStream.lga}</span>
                                </p>
                            </div>

                            {/* Two-way Intercom Control Button */}
                            <Button
                                onPointerDown={() => startIntercom(fullscreenStream.agent_id)}
                                onPointerUp={() => stopIntercom(fullscreenStream.agent_id)}
                                onPointerLeave={() => stopIntercom(fullscreenStream.agent_id)}
                                onMouseDown={() => startIntercom(fullscreenStream.agent_id)}
                                onMouseUp={() => stopIntercom(fullscreenStream.agent_id)}
                                onMouseLeave={() => stopIntercom(fullscreenStream.agent_id)}
                                onTouchStart={(e) => { e.preventDefault(); startIntercom(fullscreenStream.agent_id); }}
                                onTouchEnd={() => stopIntercom(fullscreenStream.agent_id)}
                                className={`w-full sm:w-auto h-12 px-6 font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 select-none active:scale-95 ${
                                    intercomActive[fullscreenStream.agent_id]
                                        ? "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-400 border shadow-emerald-600/20"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                }`}
                            >
                                <Mic className={`w-4.5 h-4.5 ${intercomActive[fullscreenStream.agent_id] ? "animate-pulse" : ""}`} />
                                Hold to Talk / Connect Intercom
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── CCTV GRID CARD ITEM (WITH VIEWPORT LAZY LOADING) ─────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
interface CCTVGridItemProps {
    stream: LiveStream;
    remoteStream: MediaStream | undefined;
    connectToAgent: (agentId: string) => Promise<void>;
    disconnectFromAgent: (agentId: string) => void;
    onFullscreen: () => void;
}

function CCTVGridItem({
    stream,
    remoteStream,
    connectToAgent,
    disconnectFromAgent,
    onFullscreen
}: CCTVGridItemProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    const videoRef = useCallback((node: HTMLVideoElement | null) => {
        if (node && remoteStream) {
            node.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // 1. Intersection Observer for lazy loading stream
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
            },
            { threshold: 0.1, rootMargin: "100px" }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    // 2. Establish WebRTC connection when in viewport
    useEffect(() => {
        if (isIntersecting) {
            connectToAgent(stream.agent_id);
        } else {
            disconnectFromAgent(stream.agent_id);
        }

        return () => {
            disconnectFromAgent(stream.agent_id);
        };
    }, [isIntersecting, stream.agent_id, connectToAgent, disconnectFromAgent]);

    return (
        <Card
            ref={containerRef}
            className="group relative overflow-hidden bg-slate-900 border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 shadow-md hover:shadow-xl rounded-xl"
        >
            <CardContent className="p-0">
                {/* Video container */}
                <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                    {remoteStream ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 text-slate-600 text-xs">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Connecting feed...</span>
                        </div>
                    )}

                    {/* Quality badge / indicator */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <Badge className="bg-red-600 text-white font-bold text-[9px] uppercase px-1.5 py-0.5 rounded-sm tracking-wider">
                            Live
                        </Badge>
                        {remoteStream && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        )}
                    </div>

                    {/* Action buttons (fullscreen trigger) */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={onFullscreen}
                            className="w-7 h-7 bg-slate-900/90 border border-slate-800 text-slate-200 rounded shadow hover:bg-slate-800 hover:text-white"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                    
                    {/* Location label */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono bg-slate-950/80 backdrop-blur-sm border border-slate-800/70 p-1.5 rounded text-slate-300 leading-none">
                        <span className="truncate max-w-[80%] font-bold text-slate-200">
                            {stream.polling_unit_name}
                        </span>
                        <span className="text-slate-400">
                            PU
                        </span>
                    </div>
                </div>

                {/* Footer details card */}
                <div className="p-3 space-y-1 border-t border-slate-800 bg-slate-900/60">
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono uppercase">
                        <MapPin className="w-3 h-3 text-red-500" />
                        {stream.ward} Ward · {stream.lga}
                    </p>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-slate-300 font-medium truncate max-w-[70%]">
                            <User className="w-3 h-3 text-emerald-500" />
                            <span className="truncate">{stream.agent_name}</span>
                        </div>
                        <span className="text-[8px] font-mono text-slate-500">
                            {new Date(stream.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── FULLSCREEN VIDEO ELEMENT ────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
interface FullscreenVideoPlayerProps {
    remoteStream: MediaStream | undefined;
}

function FullscreenVideoPlayer({ remoteStream }: FullscreenVideoPlayerProps) {
    const videoRef = useCallback((node: HTMLVideoElement | null) => {
        if (node && remoteStream) {
            node.srcObject = remoteStream;
        }
    }, [remoteStream]);

    if (!remoteStream) {
        return (
            <div className="flex flex-col items-center gap-2 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-xs font-mono tracking-widest uppercase">Connecting high fidelity stream...</p>
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
        />
    );
}
