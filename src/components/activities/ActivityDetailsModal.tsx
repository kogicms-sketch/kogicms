"use client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityWithOrganization } from "@/hooks/useActivities";
import { useActivityMedia } from "@/hooks/useActivityMedia";
import { format } from "date-fns";
import { MapPin, Users, Clock, Calendar, CheckCircle2, FileImage } from "lucide-react";
import { useState } from "react";
import { CompleteActivityForm } from "./CompleteActivityForm";
import { ActivityMediaUpload } from "./ActivityMediaUpload";

interface ActivityDetailsModalProps {
    activity: ActivityWithOrganization | null;
    isOpen: boolean;
    onClose: () => void;
}

export const ActivityDetailsModal = ({ activity, isOpen, onClose }: ActivityDetailsModalProps) => {
    const [activeTab, setActiveTab] = useState("details");
    const { media } = useActivityMedia(activity?.id);
    const [showCompleteForm, setShowCompleteForm] = useState(false);

    if (!activity) return null;

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "MMM dd, yyyy");
        } catch {
            return dateStr;
        }
    };

    const statusColors = {
        planned: "bg-navy-deep/10 text-navy-deep border-navy-deep/20",
        ongoing: "bg-power-red/10 text-power-red border-power-red/20",
        completed: "bg-success/10 text-success border-success/20",
        cancelled: "bg-muted text-muted-foreground border-border",
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-2xl font-bold text-navy-deep mb-2">{activity.title}</DialogTitle>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className={statusColors[activity.status as keyof typeof statusColors]}>
                                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                                </Badge>
                                <Badge variant="secondary">{activity.type}</Badge>
                            </div>
                        </div>
                        {activity.status !== "completed" && !showCompleteForm && (
                            <Button className="bg-success hover:bg-success/90 text-white gap-2" onClick={() => setShowCompleteForm(true)}>
                                <CheckCircle2 className="w-4 h-4" />
                                Mark as Completed
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    {showCompleteForm ? (
                        <CompleteActivityForm
                            activity={activity}
                            onSuccess={() => {
                                setShowCompleteForm(false);
                                // Optional: Switch to media tab or show success message? 
                                // The hook invalidateQueries will update the parent list, 
                                // and this modal (if it re-renders with fresh data) will show 'completed'
                            }}
                            onCancel={() => setShowCompleteForm(false)}
                        />
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="media" className="gap-2">
                                    Media Gallery
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{media?.length || 0}</Badge>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-6">
                                {/* Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Calendar className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Date</p>
                                                <p className="text-muted-foreground">{formatDate(activity.scheduled_date)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Clock className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Time</p>
                                                <p className="text-muted-foreground">
                                                    {activity.start_time?.slice(0, 5) || "-"} - {activity.end_time?.slice(0, 5) || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Location</p>
                                                <p className="text-muted-foreground">{activity.location}</p>
                                                {(activity.lga || activity.ward) && (
                                                    <p className="text-xs text-muted-foreground">{activity.ward}, {activity.lga}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Users className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Attendance</p>
                                                <p className="text-muted-foreground">
                                                    {activity.actual_attendance ? (
                                                        <span className="font-semibold text-foreground">{activity.actual_attendance} (Actual)</span>
                                                    ) : (
                                                        <span>{activity.expected_attendance || 0} (Expected)</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h3 className="font-semibold mb-2">Description</h3>
                                    <div className="bg-muted/30 p-4 rounded-lg text-sm text-foreground/80 leading-relaxed">
                                        {activity.description || "No description provided."}
                                    </div>
                                </div>

                                {/* Impact Summary */}
                                {activity.impact_summary && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Impact Summary</h3>
                                        <div className="bg-success/5 p-4 rounded-lg text-sm text-foreground/80 leading-relaxed border border-success/10">
                                            {activity.impact_summary}
                                        </div>
                                    </div>
                                )}
                                {/* Notes */}
                                {activity.notes && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Internal Notes</h3>
                                        <div className="bg-yellow-50 p-4 rounded-lg text-sm text-foreground/80 leading-relaxed border border-yellow-100">
                                            {activity.notes}
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="media" className="space-y-6">
                                {activity.status === "completed" ? (
                                    <ActivityMediaUpload activityId={activity.id} />
                                ) : (
                                    <div className="bg-muted/50 p-6 rounded-lg text-center text-muted-foreground border border-dashed text-sm">
                                        Mark activity as completed to upload media.
                                    </div>
                                )}

                                {/* Gallery Grid */}
                                {media && media.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                                        {media.map((item) => (
                                            <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-black/5 border">
                                                {item.type === 'image' ? (
                                                    <img src={item.url} alt="Activity media" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                ) : (
                                                    <video src={item.url} className="w-full h-full object-cover" controls />
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[10px] text-white/90 truncate">Uploaded {formatDate(item.created_at)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileImage className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No media uploaded yet.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
