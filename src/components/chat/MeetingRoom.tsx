"use client";
import { useRef, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebRTC } from "@/hooks/useWebRTC";
import { cn } from "@/lib/utils";

interface MeetingRoomProps {
    meetingId: string;
    meetingTitle: string;
    onClose: () => void;
}

const RemoteVideo = ({ stream, name }: { stream: MediaStream; name: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-navy-deep rounded-xl overflow-hidden shadow-lg border border-white/10 group aspect-video">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-medium border border-white/10">
                {name}
            </div>
        </div>
    );
};

export const MeetingRoom = ({ meetingId, meetingTitle, onClose }: MeetingRoomProps) => {
    const {
        localStream,
        remoteStreams,
        isMuted,
        isCameraOff,
        toggleMute,
        toggleCamera
    } = useWebRTC(meetingId);

    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const participantCount = Object.keys(remoteStreams).length + 1;

    return (
        <div className="fixed inset-0 z-[100] bg-navy-deep/95 backdrop-blur-xl flex flex-col text-white animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/20 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                        <Video className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">{meetingTitle}</h2>
                        <div className="flex items-center gap-2 text-xs text-green-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            LIVE • {participantCount} participants
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
                        <Maximize2 className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-4 sm:p-8 flex items-center justify-center overflow-hidden">
                <div className={cn(
                    "grid gap-4 w-full max-w-6xl",
                    participantCount === 1 ? "grid-cols-1" :
                        participantCount === 2 ? "grid-cols-1 md:grid-cols-2" :
                            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                    {/* Local Video */}
                    <div className="relative bg-navy-medium rounded-xl overflow-hidden shadow-2xl border-2 border-green-500/30 group aspect-video">
                        {isCameraOff ? (
                            <div className="w-full h-full flex items-center justify-center bg-navy-deep">
                                <VideoOff className="w-16 h-16 text-white/10" />
                            </div>
                        ) : (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover scale-x-[-1]"
                            />
                        )}
                        <div className="absolute bottom-3 left-3 bg-green-600 px-3 py-1 rounded-full text-white text-[11px] font-bold shadow-sm">
                            YOU (Host)
                        </div>
                        {isMuted && (
                            <div className="absolute top-3 right-3 bg-red-500 p-1.5 rounded-full text-white shadow-lg">
                                <MicOff className="w-3 h-3" />
                            </div>
                        )}
                    </div>

                    {/* Remote Videos */}
                    {Object.entries(remoteStreams).map(([userId, stream]) => (
                        <RemoteVideo key={userId} stream={stream} name={`Participant ${userId.substring(0, 4)}`} />
                    ))}
                </div>
            </div>

            {/* Controls Bar */}
            <div className="p-8 flex justify-center items-center gap-4 bg-gradient-to-t from-black/40 to-transparent">
                <div className="bg-black/40 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 flex items-center gap-6 shadow-2xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className={cn(
                            "w-12 h-12 rounded-full transition-all duration-300",
                            isMuted ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
                        )}
                    >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleCamera}
                        className={cn(
                            "w-12 h-12 rounded-full transition-all duration-300",
                            isCameraOff ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
                        )}
                    >
                        {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </Button>

                    <div className="w-px h-8 bg-white/10 mx-2" />

                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={onClose}
                        className="w-14 h-14 rounded-full bg-power-red hover:bg-red-700 shadow-xl hover:scale-105 transition-transform"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
