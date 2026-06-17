"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUpdateActivity, Activity } from "@/hooks/useActivities";
import { Loader2, CheckCircle2 } from "lucide-react";

interface CompleteActivityFormProps {
    activity: Activity;
    onSuccess: () => void;
    onCancel: () => void;
}

export const CompleteActivityForm = ({ activity, onSuccess, onCancel }: CompleteActivityFormProps) => {
    const updateActivity = useUpdateActivity();
    const [formData, setFormData] = useState({
        actual_attendance: activity.actual_attendance?.toString() || "",
        impact_summary: activity.impact_summary || "",
        notes: activity.notes || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await updateActivity.mutateAsync({
                id: activity.id,
                status: "completed",
                actual_attendance: formData.actual_attendance ? parseInt(formData.actual_attendance) : null,
                impact_summary: formData.impact_summary,
                notes: formData.notes,
            });
            onSuccess();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-success/10 p-4 rounded-lg flex items-center gap-3 text-success mb-4">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">Marking activity as Completed</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="actual_attendance">Actual Attendance</Label>
                <Input
                    id="actual_attendance"
                    type="number"
                    placeholder="e.g. 150"
                    value={formData.actual_attendance}
                    onChange={(e) => setFormData({ ...formData, actual_attendance: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="impact_summary">Impact Summary</Label>
                <Textarea
                    id="impact_summary"
                    placeholder="Describe the outcome and impact of this activity..."
                    className="min-h-[100px]"
                    value={formData.impact_summary}
                    onChange={(e) => setFormData({ ...formData, impact_summary: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                    id="notes"
                    placeholder="Any additional notes or observations..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={updateActivity.isPending} className="bg-success hover:bg-success/90 text-white">
                    {updateActivity.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Complete Activity
                </Button>
            </div>
        </form>
    );
};
