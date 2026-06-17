"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, MessageCircle } from "lucide-react";
import { useAllUsers, Channel, UserProfile } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin",
    org_admin: "Org Admin",
    lga_chairman: "LGA Chairman",
    councillor: "Councillor",
    member: "Member",
};

const ROLE_COLORS: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700",
    org_admin: "bg-blue-100 text-blue-700",
    lga_chairman: "bg-green-100 text-green-700",
    councillor: "bg-yellow-100 text-yellow-700",
    member: "bg-gray-100 text-gray-600",
};

interface NewDMModalProps {
    open: boolean;
    onClose: () => void;
    onSelectChannel: (channel: Channel, partnerName: string) => void;
}

export const NewDMModal = ({ open, onClose, onSelectChannel }: NewDMModalProps) => {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState<string | null>(null);
    const { data: users = [], isLoading } = useAllUsers();

    const filtered = users.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        ROLE_LABELS[u.role || ""]?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelectUser = async (user: UserProfile) => {
        setLoading(user.id);
        try {
            const { data, error } = await (supabase as any).rpc("get_or_create_dm_channel", {
                other_user_id: user.id,
            });

            if (error) throw error;

            const channel = data as unknown as Channel;
            onSelectChannel(channel, user.full_name || "Unknown");
            onClose();
        } catch (err: any) {
            console.error("Failed to create DM:", err);
            toast.error("Failed to start conversation: " + (err.message || err));
        } finally {
            setLoading(null);
        }
    };

    const getInitials = (name: string | null) => {
        if (!name) return "?";
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-apc-green" />
                        New Private Message
                    </DialogTitle>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                        autoFocus
                    />
                </div>

                <ScrollArea className="h-72">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">No users found</p>
                    ) : (
                        <div className="space-y-1 pr-2">
                            {filtered.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    disabled={loading === user.id}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
                                >
                                    <Avatar className="w-9 h-9 flex-shrink-0">
                                        <AvatarFallback className="bg-navy-deep text-white text-xs font-bold">
                                            {getInitials(user.full_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {user.full_name || "Unknown"}
                                        </p>
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs mt-0.5 ${ROLE_COLORS[user.role || ""] || "bg-gray-100 text-gray-600"}`}
                                        >
                                            {ROLE_LABELS[user.role || ""] || user.role || "User"}
                                        </Badge>
                                    </div>
                                    {loading === user.id && (
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
