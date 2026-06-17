"use client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    MessageSquare, Users, Crown, Building2, Shield,
    Menu, Plus, MessageCircle, Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyChannels, useUnreadCounts, Channel } from "@/hooks/useChat";
import { NewDMModal } from "./NewDMModal";

interface DmPartner {
    channelId: string;
    partnerName: string;
    partnerAvatar: string | null;
    partnerRole: string | null;
}

interface ChatSidebarProps {
    activeChannelId: string | null;
    activeChannelName: string | null;
    onSelectChannel: (channel: Channel, displayName?: string) => void;
    isMobile?: boolean;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
    "General Chat": <Hash className="w-4 h-4 mr-2 text-apc-green flex-shrink-0" />,
    "LGA Chairmen": <Crown className="w-4 h-4 mr-2 text-yellow-400 flex-shrink-0" />,
    "Ward Councillors": <Building2 className="w-4 h-4 mr-2 text-blue-400 flex-shrink-0" />,
    "Polling Unit Agents": <Shield className="w-4 h-4 mr-2 text-purple-400 flex-shrink-0" />,
};

const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

// Unread badge component
const UnreadBadge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
        <span className={cn(
            "ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center",
            "bg-apc-green text-white animate-in fade-in zoom-in-75 duration-200"
        )}>
            {count > 99 ? "99+" : count}
        </span>
    );
};

export const ChatSidebar = ({ activeChannelId, activeChannelName, onSelectChannel, isMobile }: ChatSidebarProps) => {
    const { user, role } = useAuth();
    const { channels } = useMyChannels();
    const unreadCounts = useUnreadCounts();
    const [dmPartners, setDmPartners] = useState<DmPartner[]>([]);
    const [showNewDM, setShowNewDM] = useState(false);

    // Separate group channels from DM channels
    const groupChannels = channels.filter(c => c.type === 'general' || c.type === 'group');
    const dmChannels = channels.filter(c => c.type === 'dm');

    // Total unread across all channels (for mobile trigger badge)
    const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

    // Fetch DM partner info for each DM channel
    useEffect(() => {
        if (!user || dmChannels.length === 0) {
            setDmPartners([]);
            return;
        }

        const fetchPartners = async () => {
            const partners: DmPartner[] = [];
            for (const ch of dmChannels) {
                try {
                    const { data } = await (supabase as any).rpc("get_dm_partner_info", {
                        channel_id_param: ch.id,
                    });
                    if (data) {
                        const p = data as any;
                        partners.push({
                            channelId: ch.id,
                            partnerName: p.full_name || "Unknown",
                            partnerAvatar: p.avatar_url || null,
                            partnerRole: p.role || null,
                        });
                    }
                } catch (err) {
                    console.error("Error fetching DM partner:", err);
                }
            }
            setDmPartners(partners);
        };

        fetchPartners();
    }, [user, dmChannels.length, dmChannels.map(c => c.id).join(",")]);

    const handleNewDMChannel = (channel: Channel, partnerName: string) => {
        onSelectChannel(channel, partnerName);
        setDmPartners(prev => {
            const exists = prev.find(p => p.channelId === channel.id);
            if (exists) return prev;
            return [...prev, { channelId: channel.id, partnerName, partnerAvatar: null, partnerRole: null }];
        });
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-navy-deep text-white">
            {/* Header */}
            <div className="p-4 border-b border-navy-medium">
                <h2 className="font-bold text-xl text-white tracking-wide flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-apc-green" />
                    DR Chat
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                    {role === 'super_admin' ? 'Super Admin' :
                        role === 'lga_chairman' ? 'LGA Chairman' :
                            role === 'councillor' ? 'Councillor' :
                                role === 'member' ? 'Member' : 'User'}
                </p>
            </div>

            <ScrollArea className="flex-1 py-3">
                {/* GROUP CHANNELS */}
                <div className="px-3 mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                        Groups
                    </h3>
                    <div className="space-y-0.5">
                        {groupChannels.length === 0 && (
                            <p className="text-xs text-gray-500 px-2 py-1">No groups available</p>
                        )}
                        {groupChannels.map((ch) => {
                            const isActive = activeChannelId === ch.id;
                            const unread = unreadCounts[ch.id] || 0;
                            return (
                                <Button
                                    key={ch.id}
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start text-left h-9 px-2 text-sm transition-all",
                                        isActive
                                            ? "bg-apc-green/20 text-white border-l-2 border-apc-green"
                                            : unread > 0
                                                ? "text-white font-semibold hover:bg-navy-medium"
                                                : "text-gray-300 hover:bg-navy-medium hover:text-white"
                                    )}
                                    onClick={() => onSelectChannel(ch, ch.name)}
                                >
                                    {GROUP_ICONS[ch.name] || <Users className="w-4 h-4 mr-2 opacity-70 flex-shrink-0" />}
                                    <span className="truncate flex-1">{ch.name}</span>
                                    <UnreadBadge count={unread} />
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* DIRECT MESSAGES */}
                <div className="px-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Direct Messages
                        </h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-5 h-5 text-gray-400 hover:text-apc-green hover:bg-transparent"
                            onClick={() => setShowNewDM(true)}
                            title="New Direct Message"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-0.5">
                        {dmPartners.length === 0 && (
                            <button
                                onClick={() => setShowNewDM(true)}
                                className="w-full text-left px-2 py-2 text-xs text-gray-500 hover:text-gray-300 flex items-center gap-2 rounded-lg transition-colors"
                            >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Start a conversation
                            </button>
                        )}
                        {dmPartners.map((partner) => {
                            const isActive = activeChannelId === partner.channelId;
                            const unread = unreadCounts[partner.channelId] || 0;
                            return (
                                <Button
                                    key={partner.channelId}
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start text-left h-10 px-2 text-sm transition-all",
                                        isActive
                                            ? "bg-apc-green/20 text-white border-l-2 border-apc-green"
                                            : unread > 0
                                                ? "text-white font-semibold hover:bg-navy-medium"
                                                : "text-gray-300 hover:bg-navy-medium hover:text-white"
                                    )}
                                    onClick={() => {
                                        const ch = dmChannels.find(c => c.id === partner.channelId);
                                        if (ch) onSelectChannel(ch, partner.partnerName);
                                    }}
                                >
                                    <div className="relative mr-2 flex-shrink-0">
                                        <Avatar className="w-6 h-6">
                                            <AvatarFallback className="bg-navy-medium text-white text-xs">
                                                {getInitials(partner.partnerName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Online dot placeholder */}
                                    </div>
                                    <span className="truncate flex-1">{partner.partnerName}</span>
                                    <UnreadBadge count={unread} />
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>

            {/* New DM Button at bottom */}
            <div className="p-3 border-t border-navy-medium">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-navy-medium text-sm"
                    onClick={() => setShowNewDM(true)}
                >
                    <Plus className="w-4 h-4 mr-2 text-apc-green" />
                    New Direct Message
                </Button>
            </div>

            {/* New DM Modal */}
            <NewDMModal
                open={showNewDM}
                onClose={() => setShowNewDM(false)}
                onSelectChannel={handleNewDMChannel}
            />
        </div>
    );

    if (isMobile) {
        return (
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden relative">
                        <Menu className="w-5 h-5 text-navy-deep" />
                        {totalUnread > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {totalUnread > 9 ? "9+" : totalUnread}
                            </span>
                        )}
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 border-r-navy-medium bg-navy-deep">
                    <SidebarContent />
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <div className="hidden md:flex w-72 h-full border-r border-gray-200 flex-shrink-0">
            <SidebarContent />
        </div>
    );
};
