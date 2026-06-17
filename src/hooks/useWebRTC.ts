import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PeerConnection {
    id: string;
    pc: RTCPeerConnection;
    stream?: MediaStream;
}

export const useWebRTC = (meetingId: string | null) => {
    const { user } = useAuth();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<{ [userId: string]: MediaStream }>({});
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    const pcsRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<any>(null);

    const iceServers = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
        ],
    };

    // ─── Initialize Local Stream ───────────────────────────────────────────────
    const startLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            setLocalStream(stream);
            localStreamRef.current = stream;
            return stream;
        } catch (error) {
            console.error("Error accessing media devices:", error);
            toast.error("Could not access camera/microphone");
            return null;
        }
    }, []);

    const stopLocalStream = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            setLocalStream(null);
            localStreamRef.current = null;
        }
    }, []);

    // ─── Signaling Helpers ─────────────────────────────────────────────────────
    const sendSignal = useCallback((targetUserId: string, payload: any) => {
        if (channelRef.current) {
            channelRef.current.send({
                type: "broadcast",
                event: "signal",
                payload: {
                    from: user?.id,
                    to: targetUserId,
                    ...payload,
                },
            });
        }
    }, [user]);

    // ─── Create Peer Connection ────────────────────────────────────────────────
    const createPC = useCallback((targetUserId: string, isOfferor: boolean) => {
        if (pcsRef.current[targetUserId]) return pcsRef.current[targetUserId];

        const pc = new RTCPeerConnection(iceServers);
        pcsRef.current[targetUserId] = pc;

        // Add local tracks to PC
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle remote stream
        pc.ontrack = (event) => {
            setRemoteStreams(prev => ({
                ...prev,
                [targetUserId]: event.streams[0],
            }));
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal(targetUserId, { candidate: event.candidate });
            }
        };

        // If offeror, create and send offer
        if (isOfferor) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    sendSignal(targetUserId, { sdp: pc.localDescription });
                } catch (err) {
                    console.error("Error creating offer:", err);
                }
            };
        }

        return pc;
    }, [sendSignal]);

    // ─── Main Effect: Join Meeting & Listen for Signals ────────────────────────
    useEffect(() => {
        if (!meetingId || !user) return;

        const joinMeeting = async () => {
            const stream = await startLocalStream();
            if (!stream) return;

            const channelName = `meeting:${meetingId}`;
            const channel = supabase.channel(channelName);
            channelRef.current = channel;

            channel
                .on("broadcast", { event: "signal" }, async ({ payload }) => {
                    const { from, to, sdp, candidate } = payload;

                    // Only process signals intended for me
                    if (to !== user.id) return;

                    let pc = pcsRef.current[from];

                    if (sdp) {
                        if (!pc) pc = createPC(from, false);

                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

                        if (sdp.type === "offer") {
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            sendSignal(from, { sdp: pc.localDescription });
                        }
                    } else if (candidate) {
                        if (!pc) pc = createPC(from, false);
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                })
                .on("presence", { event: "join" }, ({ newPresences }) => {
                    // When someone joins, the person who was already there acts as offeror
                    newPresences.forEach((presence: any) => {
                        if (presence.user_id !== user.id) {
                            createPC(presence.user_id, true);
                        }
                    });
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED") {
                        await channel.track({ user_id: user.id });
                    }
                });
        };

        joinMeeting();

        return () => {
            stopLocalStream();
            Object.values(pcsRef.current).forEach(pc => pc.close());
            pcsRef.current = {};
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            setRemoteStreams({});
        };
    }, [meetingId, user, startLocalStream, stopLocalStream, createPC]);

    // ─── Controls ─────────────────────────────────────────────────────────────
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsCameraOff(!isCameraOff);
        }
    };

    return {
        localStream,
        remoteStreams,
        isMuted,
        isCameraOff,
        toggleMute,
        toggleCamera,
    };
};
