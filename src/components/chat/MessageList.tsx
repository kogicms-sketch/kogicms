"use client";
import { Message } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Check, CheckCheck, Mic, Play, Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MeetingCard } from "./MeetingCard";

// ── Inline voice player ────────────────────────────────────────────────────
const VoicePlayer = ({ url, isMe }: { url: string; isMe: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onloadedmetadata = () => setDuration(audio.duration);
        audio.ontimeupdate = () => setProgress(audio.currentTime / (audio.duration || 1));
        audio.onended = () => { setIsPlaying(false); setProgress(0); };
        return () => { audio.pause(); };
    }, [url]);

    const toggle = () => {
        if (!audioRef.current) return;
        if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
        else { audioRef.current.play(); setIsPlaying(true); }
    };

    const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className={cn("flex items-center gap-2 min-w-[180px] py-1", isMe ? "flex-row-reverse" : "flex-row")}>
            <button
                onClick={toggle}
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                    isMe ? "bg-green-600 text-white" : "bg-navy-deep text-white"
                )}
            >
                {isPlaying
                    ? <Pause className="w-3.5 h-3.5" />
                    : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="flex-1 flex flex-col gap-1">
                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-current rounded-full transition-all duration-100" style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="flex items-center gap-1 text-[10px] opacity-60">
                    <Mic className="w-2.5 h-2.5" />
                    <span className="font-mono">{fmt(duration)}</span>
                </div>
            </div>
        </div>
    );
};

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    onJoinMeeting: (meetingId: string) => void;
}

export const MessageList = ({ messages, isLoading, onJoinMeeting }: MessageListProps) => {
    const { user } = useAuth();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (isLoading) {
        return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading messages...</div>;
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">👋</span>
                </div>
                <p>No messages yet. Start the conversation!</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]/30" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: "overlay" }}>
            {messages.map((message) => {
                const isMe = message.user_id === user?.id;
                return (
                    <div
                        key={message.id}
                        className={cn(
                            "flex items-end gap-2 max-w-[80%]",
                            isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                    >
                        {!isMe && (
                            <Avatar className="w-6 h-6 mb-1 border border-white shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
                                <AvatarImage src={message.sender?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] bg-navy-light text-white">
                                    {message.sender?.full_name?.substring(0, 2).toUpperCase() || "Uk"}
                                </AvatarFallback>
                            </Avatar>
                        )}

                        <div
                            className={cn(
                                "relative px-3 py-2 rounded-2xl shadow-sm text-sm break-words group",
                                isMe
                                    ? "bg-[#d9fdd3] text-gray-800 rounded-br-none"
                                    : "bg-white text-gray-800 rounded-bl-none"
                            )}
                        >
                            {/* Name shows only for others in groups (not implemented yet, but good practice) */}
                            {!isMe && (
                                <p className="text-[10px] font-bold text-orange-600 mb-0.5 leading-tight">
                                    {message.sender?.full_name || "Unknown"}
                                </p>
                            )}

                            {/* Voice message */}
                            {message.attachment_type === 'voice' && (message.attachment_url || message.content) && (
                                <VoicePlayer url={message.attachment_url || message.content!} isMe={isMe} />
                            )}

                            {/* Image attachment */}
                            {message.attachment_url && message.attachment_type === 'image' && (
                                <img
                                    src={message.attachment_url}
                                    alt="attachment"
                                    className="max-w-[240px] max-h-[240px] rounded-lg mb-1 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                />
                            )}

                            {/* Virtual Meeting Card */}
                            {message.attachment_type === 'meeting' && message.meeting_id && (
                                <div className="mb-2">
                                    <MeetingCard
                                        meetingId={message.meeting_id}
                                        title={message.content?.split(': ')[1] || "Virtual Meeting"}
                                        description={message.content?.split(': ')[0] || null}
                                        scheduledAt={message.created_at} // Fallback to created_at if scheduled_at isn't fetched
                                        isMe={isMe}
                                        onJoin={onJoinMeeting}
                                    />
                                </div>
                            )}

                            {/* Text content (skip if it's a voice URL or meeting) */}
                            {message.attachment_type !== 'voice' && message.attachment_type !== 'meeting' && (
                                <p className="whitespace-pre-wrap leading-relaxed">
                                    {message.content}
                                </p>
                            )}

                            <div className={cn(
                                "flex items-center justify-end gap-1 mt-1 opacity-60",
                                isMe ? "" : "text-gray-500"
                            )}>
                                <span className="text-[10px]">
                                    {format(new Date(message.created_at), "HH:mm")}
                                </span>
                                {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
};
