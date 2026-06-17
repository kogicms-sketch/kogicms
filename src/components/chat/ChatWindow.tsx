"use client";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ChatSidebar } from "./ChatSidebar";
import { useChat, markChannelRead, Channel } from "@/hooks/useChat";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Hash, Crown, Building2, Shield, Users, MessageCircle, Video } from "lucide-react";
import { CreateMeetingModal } from "./CreateMeetingModal";
import { MeetingRoom } from "./MeetingRoom";
import { useMeetings } from "@/hooks/useMeetings";
import { Button } from "@/components/ui/button";

const GROUP_ICONS: Record<string, React.ReactNode> = {
    "General Chat": <Hash className="w-5 h-5 text-apc-green" />,
    "LGA Chairmen": <Crown className="w-5 h-5 text-yellow-500" />,
    "Ward Councillors": <Building2 className="w-5 h-5 text-blue-500" />,
    "Polling Unit Agents": <Shield className="w-5 h-5 text-purple-500" />,
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
    "General Chat": "Open to all users",
    "LGA Chairmen": "LGA Chairmen only",
    "Ward Councillors": "Ward Councillors only",
    "Polling Unit Agents": "Polling Unit Agents only",
};

export const ChatWindow = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [activeDisplayName, setActiveDisplayName] = useState<string | null>(null);
    const [activeMeeting, setActiveMeeting] = useState<{ id: string; title: string } | null>(null);

    const { messages, isLoading, sendMessage } = useChat(activeChannel?.id || null);

    const handleSelectChannel = (channel: Channel, displayName?: string) => {
        setActiveChannel(channel);
        setActiveDisplayName(displayName || channel.name);
        // Mark channel as read immediately when opened
        markChannelRead(channel.id).then(() => {
            queryClient.invalidateQueries({ queryKey: ["unread-counts", user?.id] });
        });
    };

    const channelDisplayName = activeDisplayName || activeChannel?.name || null;
    const isDM = activeChannel?.type === 'dm';
    const isGroup = activeChannel?.type === 'general' || activeChannel?.type === 'group';

    const getChannelIcon = () => {
        if (!activeChannel) return null;
        if (isDM) return <MessageCircle className="w-5 h-5 text-apc-green" />;
        return GROUP_ICONS[activeChannel.name] || <Users className="w-5 h-5 text-apc-green" />;
    };

    const getChannelSubtitle = () => {
        if (!activeChannel) return "Choose a channel from the sidebar";
        if (isDM) return "Private conversation";
        return GROUP_DESCRIPTIONS[activeChannel.name] || "Group channel";
    };

    return (
        <div className="flex h-full bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Sidebar - Desktop */}
            <ChatSidebar
                activeChannelId={activeChannel?.id || null}
                activeChannelName={channelDisplayName}
                onSelectChannel={handleSelectChannel}
            />

            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Header */}
                <div className="p-4 border-b bg-white flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Trigger */}
                        <div className="md:hidden">
                            <ChatSidebar
                                activeChannelId={activeChannel?.id || null}
                                activeChannelName={channelDisplayName}
                                onSelectChannel={handleSelectChannel}
                                isMobile
                            />
                        </div>

                        {activeChannel && (
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100">
                                {getChannelIcon()}
                            </div>
                        )}

                        <div>
                            <h2 className="font-semibold text-lg text-navy-deep truncate">
                                {channelDisplayName || "Select a Chat"}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {getChannelSubtitle()}
                            </p>
                        </div>
                    </div>

                    {activeChannel && !isDM && (
                        <div className="flex items-center gap-2">
                            <CreateMeetingModal channelId={activeChannel.id}>
                                <Button variant="outline" size="sm" className="hidden sm:flex border-navy-light/30 text-navy-deep hover:bg-navy-light/10 gap-2 font-semibold">
                                    <Video className="w-4 h-4" />
                                    New Meeting
                                </Button>
                            </CreateMeetingModal>
                            <div className="sm:hidden">
                                <CreateMeetingModal channelId={activeChannel.id} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages / Empty State */}
                {activeChannel ? (
                    <>
                        <MessageList
                            messages={messages}
                            isLoading={isLoading}
                            onJoinMeeting={(id) => {
                                const msgWithMeeting = messages.find(m => m.meeting_id === id);
                                setActiveMeeting({
                                    id,
                                    title: msgWithMeeting?.content?.split(': ')[1] || "Meeting Room"
                                });
                            }}
                        />
                        <ChatInput
                            onSendMessage={(content, file, type) => sendMessage.mutate({ content, file, type })}
                            isSending={sendMessage.isPending}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
                        <div className="p-8 text-center max-w-md">
                            <div className="w-16 h-16 rounded-full bg-apc-green/10 flex items-center justify-center mx-auto mb-4">
                                <MessageSquareIcon className="w-8 h-8 text-apc-green" />
                            </div>
                            <h3 className="text-xl font-bold text-navy-deep mb-2">Welcome to DR Chat</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Select a <strong>group</strong> to chat with your team, or click{" "}
                                <strong>New Direct Message</strong> to start a private conversation.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Meeting Room Overlay */}
            {activeMeeting && (
                <MeetingRoom
                    meetingId={activeMeeting.id}
                    meetingTitle={activeMeeting.title}
                    onClose={() => setActiveMeeting(null)}
                />
            )}
        </div>
    );
};

// Inline icon to avoid import issues
const MessageSquareIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);
