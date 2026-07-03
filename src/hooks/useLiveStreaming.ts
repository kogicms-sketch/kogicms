import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

interface LiveStreamRegistry {
    id: string;
    agent_id: string;
    agent_name: string;
    polling_unit_id: string | null;
    polling_unit_code: string | null;
    polling_unit_name: string | null;
    ward: string;
    lga: string;
    status: string;
}

const iceServers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

export const useLiveStreaming = () => {
    const { user } = useAuth();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [activeBroadcast, setActiveBroadcast] = useState<LiveStreamRegistry | null>(null);
    const [isIntercomSpeaking, setIsIntercomSpeaking] = useState(false);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

    // References for Broadcaster (Agent)
    const pcsRef = useRef<{ [viewerId: string]: RTCPeerConnection }>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const agentChannelRef = useRef<RealtimeChannel | null>(null);
    const qualityLevelRef = useRef<"high" | "medium" | "low">("high");

    // References for Viewer (Admin)
    const viewerPcsRef = useRef<{ [agentId: string]: RTCPeerConnection }>({});
    const viewerChannelsRef = useRef<{ [agentId: string]: RealtimeChannel }>({});
    const [remoteStreams, setRemoteStreams] = useState<{ [agentId: string]: MediaStream }>({});
    const [intercomActive, setIntercomActive] = useState<{ [agentId: string]: boolean }>({});
    const adminMicTrackRef = useRef<MediaStreamTrack | null>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // ─── BROADCASTER (AGENT) CORE LOGIC ──────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    // Apply specific video constraints for Adaptive Bitrate (ABR)
    const applyVideoConstraints = async (level: "high" | "medium" | "low") => {
        if (!localStreamRef.current) return;
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (!videoTrack) return;

        let constraints: MediaTrackConstraints = {};
        if (level === "low") {
            constraints = { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 10 } };
        } else if (level === "medium") {
            constraints = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } };
        } else {
            constraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } };
        }

        try {
            await videoTrack.applyConstraints(constraints);
            qualityLevelRef.current = level;
            console.log(`[ABR] Video constraints applied: ${level}`);
        } catch (err) {
            console.warn("[ABR] Failed to apply video constraints:", err);
        }
    };

    // Start Live Broadcast
    const startBroadcast = async (agentInfo: {
        agent_name: string;
        polling_unit_id: string | null;
        polling_unit_code: string | null;
        polling_unit_name: string | null;
        ward: string;
        lga: string;
    }) => {
        if (!user) return null;

        try {
            if (typeof window !== "undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
                throw new Error("Camera/microphone access is blocked. Ensure you are on a secure origin (localhost or HTTPS).");
            }
            // 1. Get Camera and Microphone Stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 24 }
                },
                audio: true,
            });

            setLocalStream(stream);
            localStreamRef.current = stream;
            qualityLevelRef.current = "high";

            // 2. Register Active Stream in Supabase Table
            const { data, error } = await supabase
                .from("live_streams")
                .upsert({
                    agent_id: user.id,
                    agent_name: agentInfo.agent_name,
                    polling_unit_id: agentInfo.polling_unit_id,
                    polling_unit_code: agentInfo.polling_unit_code,
                    polling_unit_name: agentInfo.polling_unit_name,
                    ward: agentInfo.ward,
                    lga: agentInfo.lga,
                    status: "active",
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            setActiveBroadcast(data);

            // 3. Connect to Supabase Realtime Signaling Channel
            const channelName = `live-signaling:${user.id}`;
            const channel = supabase.channel(channelName);
            agentChannelRef.current = channel;

            // Helper to send signals to specific viewer admins
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sendAgentSignal = (viewerId: string, payload: any) => {
                channel.send({
                    type: "broadcast",
                    event: "signal",
                    payload: {
                        from: user.id,
                        to: viewerId,
                        ...payload,
                    },
                });
            };

            // Set up local RTCPeerConnection for a viewer
            const createAgentPC = (viewerId: string) => {
                if (pcsRef.current[viewerId]) return pcsRef.current[viewerId];

                const pc = new RTCPeerConnection(iceServers);
                pcsRef.current[viewerId] = pc;

                // Add local stream tracks
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        pc.addTrack(track, localStreamRef.current!);
                    });
                }

                // Gather and send ICE candidates to the viewer
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        sendAgentSignal(viewerId, { candidate: event.candidate });
                    }
                };

                // Handle incoming audio track for the intercom
                pc.ontrack = (event) => {
                    if (event.track.kind === "audio") {
                        // Play admin voice
                        const audio = new Audio();
                        audio.srcObject = event.streams[0];
                        audio.play().catch(e => console.warn("Failed to play intercom audio:", e));
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                        pc.close();
                        delete pcsRef.current[viewerId];
                    }
                };

                return pc;
            };

            // Handle WebRTC signals from viewers
            channel
                .on("broadcast", { event: "signal" }, async ({ payload }) => {
                    const { from: viewerId, to, sdp, candidate, type } = payload;

                    if (to !== user.id) return; // Ignore messages not meant for me

                    // Handle audio active indicators
                    if (type === "intercom-audio-active") {
                        setIsIntercomSpeaking(true);
                        toast("Command Centre is speaking...");
                        return;
                    }
                    if (type === "intercom-audio-inactive") {
                        setIsIntercomSpeaking(false);
                        return;
                    }

                    let pc = pcsRef.current[viewerId];

                    if (sdp) {
                        if (!pc) pc = createAgentPC(viewerId);
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

                        if (sdp.type === "offer") {
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            sendAgentSignal(viewerId, { sdp: pc.localDescription });
                        }
                    } else if (candidate) {
                        if (!pc) pc = createAgentPC(viewerId);
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                })
                .subscribe((status) => {
                    if (status === "SUBSCRIBED") {
                        console.log(`Agent signaling channel active: ${channelName}`);
                    }
                });

            toast.success("Broadcast started successfully!");
            return data;

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error("Error starting broadcast:", error);
            toast.error(`Broadcast failed: ${errorMsg}`);
            stopBroadcast();
            return null;
        }
    };

    // Toggle Camera (Front vs Environment)
    const toggleCameraFacing = async () => {
        if (!activeBroadcast || !user) return;
        const newFacing = facingMode === "user" ? "environment" : "user";
        setFacingMode(newFacing);

        // Stop current tracks and restart camera capture
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => track.stop());
            try {
                const newVideoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: newFacing,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 24 }
                    }
                });
                
                const newVideoTrack = newVideoStream.getVideoTracks()[0];
                localStreamRef.current.addTrack(newVideoTrack);

                // Replace video track in all active peer connections
                Object.values(pcsRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === "video");
                    if (sender && newVideoTrack) {
                        sender.replaceTrack(newVideoTrack);
                    }
                });

                // Update local state preview
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                await applyVideoConstraints(qualityLevelRef.current);
                toast.info(`Swapped to ${newFacing === "user" ? "front" : "rear"} camera`);
            } catch (err) {
                console.error("Error swapping camera:", err);
                toast.error("Failed to access selected camera");
            }
        }
    };

    // Stop Live Broadcast
    const stopBroadcast = async () => {
        if (user) {
            try {
                await supabase
                    .from("live_streams")
                    .update({ status: "inactive" })
                    .eq("agent_id", user.id);
            } catch (e) {
                console.warn("Failed to mark stream inactive in DB:", e);
            }
        }

        // Close peer connections
        Object.values(pcsRef.current).forEach(pc => pc.close());
        pcsRef.current = {};

        // Stop media tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setLocalStream(null);
        setActiveBroadcast(null);
        setIsIntercomSpeaking(false);

        // Cleanup channel
        if (agentChannelRef.current) {
            supabase.removeChannel(agentChannelRef.current);
            agentChannelRef.current = null;
        }

        toast.info("Broadcast stopped");
    };

    // Adaptive Bitrate Loop
    useEffect(() => {
        if (!activeBroadcast) return;

        const abrInterval = setInterval(async () => {
            let totalPacketsLost = 0;
            let totalPacketsSent = 0;
            let maxRtt = 0;

            const pcs = Object.values(pcsRef.current);
            if (pcs.length === 0) return;

            for (const pc of pcs) {
                try {
                    const stats = await pc.getStats();
                    stats.forEach(report => {
                        if (report.type === "outbound-rtp" && report.kind === "video") {
                            totalPacketsSent += report.packetsSent || 0;
                            totalPacketsLost += report.packetsLost || 0;
                        }
                        if (report.type === "candidate-pair" && report.state === "succeeded") {
                            const rtt = (report.currentRoundTripTime || 0) * 1000; // convert to ms
                            if (rtt > maxRtt) maxRtt = rtt;
                        }
                    });
                } catch (e) {
                    // Ignore stats errors
                }
            }

            const packetLossPct = totalPacketsSent > 0 ? (totalPacketsLost / (totalPacketsSent + totalPacketsLost)) * 100 : 0;
            
            // ABR Logic rules
            if (packetLossPct > 10 || maxRtt > 400) {
                if (qualityLevelRef.current !== "low") {
                    await applyVideoConstraints("low");
                }
            } else if (packetLossPct > 4 || maxRtt > 250) {
                if (qualityLevelRef.current !== "medium") {
                    await applyVideoConstraints("medium");
                }
            } else {
                if (qualityLevelRef.current !== "high") {
                    await applyVideoConstraints("high");
                }
            }
        }, 5000);

        return () => clearInterval(abrInterval);
    }, [activeBroadcast]);

    // Handle App visibility/background optimizations
    useEffect(() => {
        if (!activeBroadcast) return;

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                console.log("[Broadcast] Tab hidden. Conserving resource, keeping audio active.");
                // In background, we apply low constraints for video to preserve bandwidth
                await applyVideoConstraints("low");
            } else {
                console.log("[Broadcast] Tab active. Scaling quality back up.");
                await applyVideoConstraints("high");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [activeBroadcast]);


    // ─────────────────────────────────────────────────────────────────────────
    // ─── VIEWER (ADMIN) CORE LOGIC ───────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    // Connect viewer to agent stream
    const connectToAgent = useCallback(async (agentId: string) => {
        if (!user || viewerPcsRef.current[agentId]) return;

        try {
            // 1. Establish RTCPeerConnection
            const pc = new RTCPeerConnection(iceServers);
            viewerPcsRef.current[agentId] = pc;

            // Add audio/video transceivers for receiving only
            pc.addTransceiver("video", { direction: "recvonly" });
            pc.addTransceiver("audio", { direction: "recvonly" });

            // Create signaling channel
            const channelName = `live-signaling:${agentId}`;
            const channel: import('@supabase/supabase-js').RealtimeChannel = supabase.channel(channelName);
            viewerChannelsRef.current[agentId] = channel;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sendViewerSignal = (payload: any) => {
                channel.send({
                    type: "broadcast",
                    event: "signal",
                    payload: {
                        from: user.id,
                        to: agentId,
                        ...payload,
                    },
                });
            };

            // Set up Admin Mic Track for Intercom (initially added but disabled)
            let micStream: MediaStream | null = null;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const micTrack = micStream.getAudioTracks()[0];
                if (micTrack) {
                    micTrack.enabled = false; // Muted by default
                    adminMicTrackRef.current = micTrack;
                    pc.addTrack(micTrack, micStream);
                }
            } catch (micErr) {
                console.warn("Could not load admin microphone initially. Intercom will prompt when used.", micErr);
            }

            // Gather local ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sendViewerSignal({ candidate: event.candidate });
                }
            };

            // Capture remote stream
            pc.ontrack = (event) => {
                setRemoteStreams(prev => ({
                    ...prev,
                    [agentId]: event.streams[0]
                }));
            };

            let isSubscribed = false;
            let pendingNegotiation = false;

            const triggerNegotiation = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    sendViewerSignal({ sdp: pc.localDescription });
                } catch (err) {
                    console.error("Error generating offer:", err);
                }
            };

            // Handshake negotiation
            pc.onnegotiationneeded = async () => {
                if (isSubscribed) {
                    await triggerNegotiation();
                } else {
                    pendingNegotiation = true;
                }
            };

            // Listen for agent signals
            channel
                .on("broadcast", { event: "signal" }, async ({ payload }) => {
                    const { from, to, sdp, candidate } = payload;
                    if (to !== user.id || from !== agentId) return;

                    if (sdp) {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    } else if (candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED") {
                        console.log(`Viewer subscribed to agent: ${agentId}`);
                        isSubscribed = true;
                        if (pendingNegotiation) {
                            pendingNegotiation = false;
                            await triggerNegotiation();
                        }
                    }
                });

        } catch (err) {
            console.error("Failed to connect to agent stream:", err);
        }
    }, [user]);

    // Disconnect viewer from agent stream
    const disconnectFromAgent = useCallback((agentId: string) => {
        const pc = viewerPcsRef.current[agentId];
        if (pc) {
            pc.close();
            delete viewerPcsRef.current[agentId];
        }

        const channel = viewerChannelsRef.current[agentId];
        if (channel) {
            supabase.removeChannel(channel);
            delete viewerChannelsRef.current[agentId];
        }

        setRemoteStreams(prev => {
            const copy = { ...prev };
            delete copy[agentId];
            return copy;
        });

        setIntercomActive(prev => {
            const copy = { ...prev };
            delete copy[agentId];
            return copy;
        });
    }, []);

    // Intercom Actions
    const startIntercom = async (agentId: string) => {
        let micTrack = adminMicTrackRef.current;

        // If mic track doesn't exist, request it now
        if (!micTrack) {
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                micTrack = micStream.getAudioTracks()[0];
                if (micTrack) {
                    adminMicTrackRef.current = micTrack;
                    const pc = viewerPcsRef.current[agentId];
                    if (pc) {
                        pc.addTrack(micTrack, micStream);
                    }
                }
            } catch (err) {
                toast.error("Could not access microphone for intercom");
                return;
            }
        }

        if (micTrack) {
            micTrack.enabled = true; // Unmute
            setIntercomActive(prev => ({ ...prev, [agentId]: true }));

            // Notify agent that command center is speaking
            const channel = viewerChannelsRef.current[agentId];
            if (channel && user) {
                channel.send({
                    type: "broadcast",
                    event: "signal",
                    payload: {
                        from: user.id,
                        to: agentId,
                        type: "intercom-audio-active"
                    }
                });
            }
        }
    };

    const stopIntercom = (agentId: string) => {
        const micTrack = adminMicTrackRef.current;
        if (micTrack) {
            micTrack.enabled = false; // Mute
            setIntercomActive(prev => ({ ...prev, [agentId]: false }));

            // Notify agent that command center stopped speaking
            const channel = viewerChannelsRef.current[agentId];
            if (channel && user) {
                channel.send({
                    type: "broadcast",
                    event: "signal",
                    payload: {
                        from: user.id,
                        to: agentId,
                        type: "intercom-audio-inactive"
                    }
                });
            }
        }
    };

    // Cleanup hook on unmount
    useEffect(() => {
        const activePcs = pcsRef.current;
        const activeChannel = agentChannelRef.current;
        const activeViewerPcs = viewerPcsRef.current;
        const activeViewerChannels = viewerChannelsRef.current;
        const activeLocalStream = localStreamRef.current;
        return () => {
            // Cleanup agent connections
            if (activeLocalStream) {
                activeLocalStream.getTracks().forEach(track => track.stop());
            }
            Object.values(activePcs).forEach(pc => pc.close());
            if (activeChannel) {
                supabase.removeChannel(activeChannel);
            }

            // Cleanup viewer connections
            Object.values(activeViewerPcs).forEach(pc => pc.close());
            Object.values(activeViewerChannels).forEach(ch => supabase.removeChannel(ch));
        };
    }, []);

    return {
        // Broadcaster items
        localStream,
        activeBroadcast,
        isIntercomSpeaking,
        facingMode,
        startBroadcast,
        stopBroadcast,
        toggleCameraFacing,

        // Viewer items
        remoteStreams,
        intercomActive,
        connectToAgent,
        disconnectFromAgent,
        startIntercom,
        stopIntercom
    };
};
