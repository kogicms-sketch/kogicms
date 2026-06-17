"use client";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Video, Users, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMeetingInvitation } from "@/hooks/useMeetings";
import { cn } from "@/lib/utils";

interface MeetingCardProps {
    meetingId: string;
    title: string;
    description: string | null;
    scheduledAt: string;
    isMe: boolean;
    onJoin: (meetingId: string) => void;
}

export const MeetingCard = ({ meetingId, title, description, scheduledAt, isMe, onJoin }: MeetingCardProps) => {
    const { invitation, stats, updateRSVP } = useMeetingInvitation(meetingId);
    const date = new Date(scheduledAt);
    const isUpcoming = date > new Date();

    // Status color mapping
    const statusColors = {
        accepted: "bg-green-100 text-green-700 border-green-200",
        declined: "bg-red-100 text-red-700 border-red-200",
        pending: "bg-gray-100 text-gray-700 border-gray-200"
    };

    return (
        <Card className={cn(
            "p-0 overflow-hidden border shadow-sm w-[280px] sm:w-[320px]",
            isMe ? "border-green-200" : "border-gray-200"
        )}>
            {/* Header with Background Gradient */}
            <div className={cn(
                "px-4 py-3 text-white flex justify-between items-start",
                isMe ? "bg-gradient-to-r from-green-600 to-green-700" : "bg-gradient-to-r from-navy-deep to-navy-medium"
            )}>
                <div>
                    <Badge variant="outline" className="text-[10px] bg-white/20 text-white border-none mb-1">
                        VIRTUAL MEETING
                    </Badge>
                    <h4 className="font-bold text-base leading-tight">{title}</h4>
                </div>
                <Video className="w-5 h-5 opacity-80" />
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 bg-white">
                {description && (
                    <p className="text-xs text-gray-600 line-clamp-2 italic border-l-2 border-gray-100 pl-2">
                        {description}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>{format(date, "MMM dd, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span>{format(date, "HH:mm")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                        <Users className="w-3.5 h-3.5 text-green-500" />
                        <span>{stats?.accepted || 0} accepted / {stats?.total || 0} invited</span>
                    </div>
                </div>

                {/* RSVP Status Tag */}
                {invitation && (
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                        <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Your Status:</span>
                        <Badge variant="outline" className={cn("px-2 py-0 text-[10px] capitalize", statusColors[invitation.status])}>
                            {invitation.status}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-3 py-3 border-t flex gap-2">
                {!isUpcoming || invitation?.status === 'accepted' ? (
                    <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-1.5 text-xs font-bold shadow-sm"
                        onClick={() => onJoin(meetingId)}
                    >
                        <Video className="w-3.5 h-3.5" />
                        JOIN NOW
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-[11px] h-8 border-green-200 text-green-700 hover:bg-green-50 gap-1"
                            onClick={() => updateRSVP.mutate('accepted')}
                            disabled={updateRSVP.isPending}
                        >
                            {updateRSVP.isPending && updateRSVP.variables === 'accepted' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                            Accept
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-[11px] h-8 border-red-100 text-red-600 hover:bg-red-50 gap-1"
                            onClick={() => updateRSVP.mutate('declined')}
                            disabled={updateRSVP.isPending}
                        >
                            {updateRSVP.isPending && updateRSVP.variables === 'declined' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <X className="w-3.5 h-3.5" />
                            )}
                            Decline
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
};
