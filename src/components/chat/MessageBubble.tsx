"use client";
import { Message } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { FileIcon, Play, Pause } from "lucide-react";
import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface MessageBubbleProps {
    message: Message;
    isMe: boolean;
}

export const MessageBubble = ({ message, isMe }: MessageBubbleProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className={cn("flex gap-3 mb-4", isMe ? "flex-row-reverse" : "flex-row")}>
            <Avatar className="w-8 h-8">
                <AvatarImage src={message.sender?.avatar_url || ""} />
                <AvatarFallback>{message.sender?.full_name?.substring(0, 2).toUpperCase() || "?"}</AvatarFallback>
            </Avatar>

            <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">{message.sender?.full_name || "Unknown"}</span>
                    <span className="text-[10px] text-gray-400">{format(new Date(message.created_at), "HH:mm")}</span>
                </div>

                <div
                    className={cn(
                        "p-3 rounded-2xl",
                        isMe
                            ? "bg-navy-deep text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-800 rounded-tl-none"
                    )}
                >
                    {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}

                    {message.attachment_type === "image" && message.attachment_url && (
                        <img
                            src={message.attachment_url}
                            alt="Attachment"
                            className="rounded-lg mt-2 max-w-full max-h-[200px] object-cover"
                        />
                    )}

                    {message.attachment_type === "file" && message.attachment_url && (
                        <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                "flex items-center gap-2 p-2 rounded-lg mt-1 text-sm underline",
                                isMe ? "bg-white/10 hover:bg-white/20" : "bg-white hover:bg-gray-50"
                            )}
                        >
                            <FileIcon className="w-4 h-4" />
                            Download File
                        </a>
                    )}

                    {message.attachment_type === "voice" && message.attachment_url && (
                        <div className="flex items-center gap-2 mt-1 min-w-[150px]">
                            <button onClick={toggleAudio} className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <div className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full bg-white", isPlaying && "animate-pulse")}
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <audio
                                ref={audioRef}
                                src={message.attachment_url}
                                onEnded={() => setIsPlaying(false)}
                                className="hidden"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
