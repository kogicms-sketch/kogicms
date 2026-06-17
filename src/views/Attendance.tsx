"use client";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    Search,
    Clock,
    Filter,
    ChevronRight,
    CheckCircle
} from "lucide-react";
import { CheckInModal } from "@/components/attendance/CheckInModal";
import { useActivities } from "@/hooks/useAttendance";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const Attendance = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
    const { data: userOrg } = useUserOrganization();

    // Fetch real activities
    const { data: activities, isLoading } = useActivities(userOrg?.id);

    // Filter sessions based on search
    const filteredSessions = activities?.filter(session => {
        return session.title.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];

    // Calculate Stats
    const totalCheckIns = activities?.reduce((acc, curr) => acc + (curr.attendance_count || 0), 0) || 0;
    const avgAttendance = activities?.length
        ? (activities.reduce((acc, curr) => acc + ((curr.attendance_count || 0) / (curr.expected_attendance || 1)), 0) / activities.length) * 100
        : 0;

    return (
        <DashboardLayout
            title="Attendance"
            subtitle="Manage event check-ins and attendance records"
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="kpi-card">
                    <p className="text-sm text-muted-foreground">Average Attendance</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-2xl font-bold text-foreground">
                            {isLoading ? <Skeleton className="h-8 w-20" /> : `${avgAttendance.toFixed(1)}%`}
                        </p>
                        {/* <p className="text-xs text-success mb-1">+2.4%</p> */}
                    </div>
                </div>
                <div className="kpi-card">
                    <p className="text-sm text-muted-foreground">Total Check-ins</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-2xl font-bold text-foreground">
                            {isLoading ? <Skeleton className="h-8 w-20" /> : totalCheckIns}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">All time</p>
                    </div>
                </div>
                {/* Placeholder for third KPI until we have more data logic */}
                <div className="kpi-card opacity-50">
                    <p className="text-sm text-muted-foreground">Absence Rate</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-2xl font-bold text-foreground">-</p>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium pl-10 w-full sm:w-80"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" /> Filter
                    </Button>
                    <Button
                        className="btn-action gap-2"
                        onClick={() => setIsCheckInModalOpen(true)}
                    >
                        <CheckCircle className="w-4 h-4" /> Start Check-in
                    </Button>
                    <CheckInModal isOpen={isCheckInModalOpen} onClose={() => setIsCheckInModalOpen(false)} />
                </div>
            </div>

            {/* Sessions List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground">Recent Sessions</h3>
                </div>
                <div className="divide-y divide-border">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading activities...</div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No activities found.</div>
                    ) : (
                        filteredSessions.map((session) => (
                            <div key={session.id} className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Calendar className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-foreground">{session.title}</h4>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {session.scheduled_date ? format(new Date(session.scheduled_date), 'MMM dd, yyyy') : 'Date TBD'} • {session.start_time}
                                            </span>
                                            {/* <span className="hidden sm:inline">•</span>
                                            <span className="text-navy-deep font-medium">{session.organization_id}</span> */}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-foreground">{session.attendance_count}/{session.expected_attendance || '-'}</p>
                                        <p className="text-xs text-muted-foreground">Attendance</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-success">
                                            {session.expected_attendance
                                                ? Math.round(((session.attendance_count || 0) / session.expected_attendance) * 100) + "%"
                                                : "-"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Rate</p>
                                    </div>
                                    <Button variant="ghost" size="icon">
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Attendance;
