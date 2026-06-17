"use client";
import { useState, useRef, useEffect, Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Smile, X, Loader2, Mic, AlertCircle } from "lucide-react";
import { AudioRecorder } from "./AudioRecorder";
import { MessageType } from "@/hooks/useChat";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Error boundary to prevent AudioRecorder crashes from blanking the page
class RecorderErrorBoundary extends Component<
    { children: ReactNode; onReset: () => void },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-2xl w-full">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-600 flex-1">Recording failed. Please try again.</span>
                    <Button variant="ghost" size="sm" onClick={() => { this.setState({ hasError: false }); this.props.onReset(); }}>
                        Close
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}


interface ChatInputProps {
    onSendMessage: (content?: string, file?: File | Blob, type?: MessageType) => void;
    isSending: boolean;
}

export const ChatInput = ({ onSendMessage, isSending }: ChatInputProps) => {
    const { user } = useAuth();
    const [message, setMessage] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploadingVoice, setIsUploadingVoice] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [message]);

    const handleSend = () => {
        if ((!message.trim() && !file) || isSending) return;

        let type: MessageType = null;
        if (file) {
            if (file.type.startsWith("image/")) type = "image";
            else if (file.type.startsWith("audio/")) type = "voice";
            else type = "file";
        }

        onSendMessage(message, file || undefined, type);
        setMessage("");
        setFile(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setMessage((prev) => prev + emojiData.emoji);
    };

    // Delegate voice send to the parent (useChat hook)
    const handleVoiceSend = async (blob: Blob, _duration: number) => {
        if (!user) return;
        setIsRecording(false);
        onSendMessage(undefined, blob, "voice");
    };

    // If recording mode is active, show the recorder in place of the input
    if (isRecording) {
        return (
            <div className="p-3 bg-gray-50 border-t">
                <RecorderErrorBoundary onReset={() => setIsRecording(false)}>
                    <AudioRecorder
                        onSend={handleVoiceSend}
                        onCancel={() => setIsRecording(false)}
                        isSending={isUploadingVoice}
                    />
                </RecorderErrorBoundary>
            </div>
        );
    }

    return (
        <div className="p-3 bg-gray-50 border-t flex items-end gap-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {/* File Button */}
            <Button
                variant="ghost"
                size="icon"
                className={cn("text-gray-500 hover:text-navy-deep hover:bg-gray-200 transition-colors", file && "text-power-red")}
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
            >
                <Paperclip className="w-5 h-5" />
            </Button>

            {/* Emoji Button */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-yellow-500 hover:bg-gray-200 transition-colors"
                        title="Emoji"
                    >
                        <Smile className="w-5 h-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="p-0 border-none shadow-xl w-auto">
                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        width={300}
                        height={400}
                        lazyLoadEmojis={true}
                    />
                </PopoverContent>
            </Popover>

            {/* Input Area */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 focus-within:border-navy-light focus-within:ring-1 focus-within:ring-navy-light transition-all shadow-sm flex flex-col relative">
                {file && (
                    <div className="px-3 pt-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-navy-deep truncate max-w-[200px]">
                            {file.name}
                        </span>
                        <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="min-h-[40px] max-h-[120px] w-full resize-none border-none bg-transparent py-3 px-4 text-sm focus-visible:ring-0 placeholder:text-gray-400"
                    rows={1}
                />
            </div>

            {/* Mic Button — shows when no text typed */}
            {!message.trim() && !file ? (
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-navy-deep text-white hover:bg-navy-medium shadow-md flex-shrink-0 transition-all"
                    onClick={() => setIsRecording(true)}
                    title="Record voice message"
                >
                    <Mic className="w-5 h-5" />
                </Button>
            ) : (
                /* Send Button */
                <Button
                    onClick={handleSend}
                    disabled={(!message.trim() && !file) || isSending}
                    size="icon"
                    className={cn(
                        "rounded-full w-10 h-10 transition-all shadow-md flex-shrink-0",
                        (message.trim() || file) ? "bg-power-red hover:bg-red-600 text-white" : "bg-gray-200 text-gray-400"
                    )}
                >
                    {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Send className="w-5 h-5 ml-0.5" />
                    )}
                </Button>
            )}
        </div>
    );
};
