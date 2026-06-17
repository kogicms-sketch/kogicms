"use client";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Video, Loader2 } from "lucide-react";
import { useMeetings } from "@/hooks/useMeetings";

interface CreateMeetingModalProps {
    channelId: string;
    children?: React.ReactNode;
}

export function CreateMeetingModal({ channelId, children }: CreateMeetingModalProps) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        time: "12:00",
    });

    const { createMeeting } = useMeetings(channelId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

        await createMeeting.mutateAsync({
            title: formData.title,
            description: formData.description || null,
            scheduled_at: scheduledAt,
            status: 'scheduled'
        });

        setOpen(false);
        setFormData({
            title: "",
            description: "",
            date: new Date().toISOString().split('T')[0],
            time: "12:00",
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-navy-deep">
                        <Video className="w-5 h-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="w-12 h-12 bg-navy-light/10 rounded-full flex items-center justify-center mb-4 text-navy-deep">
                        <Video className="w-6 h-6" />
                    </div>
                    <DialogTitle className="text-xl font-bold">Schedule Virtual Meeting</DialogTitle>
                    <DialogDescription>
                        Set a date and time for your team meeting. All channel members will be invited.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="title">Meeting Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Weekly Strategy Sync"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="border-gray-200 focus:border-navy-light"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Agenda (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="What will we discuss?"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="border-gray-200 focus:border-navy-light resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="date"
                                    type="date"
                                    required
                                    className="pl-9 border-gray-200"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Time</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="time"
                                    type="time"
                                    required
                                    className="pl-9 border-gray-200"
                                    value={formData.time}
                                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 mt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-navy-deep hover:bg-navy-medium gap-2 min-w-[140px]"
                            disabled={createMeeting.isPending}
                        >
                            {createMeeting.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Video className="w-4 h-4" />
                            )}
                            Schedule Meeting
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
