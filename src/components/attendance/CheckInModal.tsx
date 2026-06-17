"use client";
import { useState, useMemo } from "react";
import { X, QrCode, Search, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCheckIn, useActivities } from "@/hooks/useAttendance";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CheckInModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CheckInModal = ({ isOpen, onClose }: CheckInModalProps) => {
    const [memberId, setMemberId] = useState("");
    const [selectedActivityId, setSelectedActivityId] = useState<string>("");

    // Hooks
    const { data: userOrg } = useUserOrganization();
    const { data: activities } = useActivities(userOrg?.id);
    const checkInMutation = useCheckIn();

    // Auto-select the first active or upcoming activity
    // (In a real app, logic might be "happening today")
    useMemo(() => {
        if (activities && activities.length > 0 && !selectedActivityId) {
            setSelectedActivityId(activities[0].id);
        }
    }, [activities, selectedActivityId]);

    if (!isOpen) return null;

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedActivityId) {
            toast.error("Please select an event first.");
            return;
        }

        checkInMutation.mutate({
            activityId: selectedActivityId,
            memberId: memberId
        }, {
            onSuccess: () => {
                setMemberId(""); // Clear input on success
                // Keep modal open for rapid check-ins
            }
        });
    };

    const selectedActivity = activities?.find(a => a.id === selectedActivityId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Event Check-in</h2>
                        <p className="text-sm text-muted-foreground">Scan QR or enter Member ID</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Event Method Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Event</label>
                        <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select an event" />
                            </SelectTrigger>
                            <SelectContent>
                                {activities?.map((activity) => (
                                    <SelectItem key={activity.id} value={activity.id}>
                                        {activity.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Active Event Indicator */}
                    {selectedActivity && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                            <p className="text-xs text-primary font-medium uppercase tracking-wider">Checking In For</p>
                            <p className="font-bold text-foreground">{selectedActivity.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{selectedActivity.scheduled_date} • {selectedActivity.start_time}</p>
                        </div>
                    )}


                    {/* Scanner Placeholder */}
                    {/* <div className="aspect-square bg-black rounded-lg relative overflow-hidden flex items-center justify-center group cursor-pointer">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3')] bg-cover opacity-20 transition-opacity group-hover:opacity-30" />
                        <div className="relative z-10 flex flex-col items-center gap-2 text-white/80">
                            <QrCode className="w-12 h-12" />
                            <p className="text-sm font-medium">Click to Activate Camera</p>
                        </div>
                        <div className="absolute inset-8 border-2 border-white/50 rounded-lg" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-power-red/50 shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-[scan_2s_linear_infinite]" />
                    </div> 
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
                        </div>
                    </div>
                    */}

                    <form onSubmit={handleCheckIn} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                required
                                className="input-premium pl-9 w-full"
                                placeholder="Member ID (e.g. 00234)"
                                value={memberId}
                                onChange={(e) => setMemberId(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="btn-command" disabled={checkInMutation.isPending || !memberId}>
                            {checkInMutation.isPending ? "..." : "Check In"}
                        </Button>
                    </form>

                </div>
            </div>
        </div>
    );
};
