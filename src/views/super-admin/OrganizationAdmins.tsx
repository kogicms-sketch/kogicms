"use client";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Search,
    Building2,
    Loader2,
    ShieldAlert,
    History,
    Phone,
    CheckCircle,
} from "lucide-react";
import { useOrganizationAdmins, OrganizationAdmin } from "@/hooks/useOrganizationAdmins";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import { supabase } from "@/integrations/supabase/loose-client";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

const OrganizationAdmins = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: admins = [], isLoading, refetch, error, isError } = useOrganizationAdmins();
    const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

    const filteredAdmins = admins.filter((admin) => {
        return (
            (admin.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (admin.organization_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (admin.phone_number?.toLowerCase() || "").includes(searchQuery.toLowerCase())
        );
    });

    return (
        <DashboardLayout
            title="Support Group Admins"
            subtitle="Manage support group administrators, track activities and control access"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search admins by name, phone or support group..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium pl-10 w-full"
                    />
                </div>
                <div className="flex gap-2">
                    {/* Export or Filter buttons could go here */}
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : isError ? (
                <div className="p-8 text-center bg-muted/20 rounded-xl border border-destructive/20">
                    <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load admins</h3>
                    <p className="text-muted-foreground mb-4">
                        {(error as Error)?.message || "An unknown error occurred."}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                        Please ensure you have run the database migration.
                    </p>
                    <Button onClick={() => refetch()} variant="outline">Try Again</Button>
                </div>
            ) : filteredAdmins.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    No support group admins found matches your filters.
                </div>
            ) : (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                                <th className="p-4">Admin</th>
                                <th className="p-4">Support Group</th>
                                <th className="p-4">Phone Number</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Registered</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAdmins.map((admin) => (
                                <AdminRow key={admin.id} admin={admin} refetch={refetch} setSelectedHistory={setSelectedAdminId} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* History Sheet */}
            <HistorySheet adminId={selectedAdminId} onClose={() => setSelectedAdminId(null)} />
        </DashboardLayout>
    );
};

const AdminRow = ({ admin, refetch, setSelectedHistory }: { admin: OrganizationAdmin, refetch: () => void, setSelectedHistory: (id: string) => void }) => {
    const { toast } = useToast();
    const [suspensionReason, setSuspensionReason] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const toggleStatus = async () => {
        setIsUpdating(true);
        const newStatus = admin.account_status === "active" ? "suspended" : "active";

        // Prepare update object
        const updateData: any = { account_status: newStatus };

        // Logic for suspension reason
        if (newStatus === 'suspended') {
            if (!suspensionReason.trim()) {
                toast({
                    title: "Reason Required",
                    description: "Please provide a reason for suspending this admin.",
                    variant: "destructive"
                });
                setIsUpdating(false);
                return;
            }
            updateData.suspension_reason = suspensionReason;
        } else {
            // Clear reason/log reactivation
            updateData.suspension_reason = null;
        }

        try {
            const { error } = await supabase
                .from("profiles")
                .update(updateData)
                .eq("id", admin.id);

            if (error) throw error;

            // Log security alert via function if needed, or rely on auto-triggers. 
            // Previous audit triggers handle basic status change, but not reason detail specifically if separate.
            // Our previous migration auto-logs status change.

            toast({
                title: `Admin ${newStatus === 'active' ? 'Activated' : 'Deactivated'}`,
                description: `Successfully ${newStatus === 'active' ? 'activated' : 'suspended'} ${admin.full_name}'s account.`,
                variant: newStatus === 'active' ? "default" : "destructive",
            });
            refetch();
            setSuspensionReason(""); // Reset
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update admin status. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <tr className="hover:bg-muted/30 transition-colors">
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 border">
                        <AvatarFallback className="bg-navy-light text-white text-xs">
                            {(admin.full_name || "NA").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{admin.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{admin.role?.replace('_', ' ')}</p>
                    </div>
                </div>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{admin.organization_name || "No Group"}</span>
                </div>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-2 font-mono text-xs">
                    <Phone className="w-3 h-3" />
                    {admin.phone_number || "N/A"}
                </div>
            </td>
            <td className="p-4">
                <div className="flex flex-col gap-1">
                    <Badge variant={admin.account_status === 'active' ? 'default' : 'destructive'} className="capitalize w-fit">
                        {admin.account_status}
                    </Badge>
                    {/* Show reason if suspended */}
                    {admin.account_status === 'suspended' && (admin as any).suspension_reason && (
                        <span className="text-[10px] text-destructive max-w-[150px] truncate" title={(admin as any).suspension_reason}>
                            {(admin as any).suspension_reason}
                        </span>
                    )}
                </div>
            </td>
            <td className="p-4 text-muted-foreground">
                {admin.created_at ? format(new Date(admin.created_at), "MMM d, yyyy") : "-"}
            </td>
            <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedHistory(admin.id)}
                        title="View History"
                    >
                        <History className="w-4 h-4 text-muted-foreground" />
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant={admin.account_status === 'active' ? "ghost" : "outline"}
                                size="sm"
                                className={admin.account_status === 'active' ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-green-600 hover:text-green-700"}
                            >
                                {admin.account_status === 'active' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                <span className="ml-2 hidden lg:inline">{admin.account_status === 'active' ? 'Deactivate' : 'Activate'}</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action will {admin.account_status === 'active' ? 'prevent' : 'allow'} <strong>{admin.full_name}</strong> {admin.account_status === 'active' ? 'from accessing' : 'to access'} the dashboard.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            {/* Input for Suspension Reason */}
                            {admin.account_status === 'active' && (
                                <div className="py-4">
                                    <label className="text-sm font-medium mb-1 block">Reason for Suspension (Required)</label>
                                    <textarea
                                        className="w-full p-2 border rounded-md text-sm bg-background min-h-[80px]"
                                        placeholder="E.g., Suspicious activity, device mismatch..."
                                        value={suspensionReason}
                                        onChange={(e) => setSuspensionReason(e.target.value)}
                                    />
                                </div>
                            )}

                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setSuspensionReason("")}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        // Prevent closing if validation fails
                                        if (admin.account_status === 'active' && !suspensionReason.trim()) {
                                            e.preventDefault();
                                            toast({ title: "Required", description: "Please enter a reason.", variant: "destructive" });
                                            return;
                                        }
                                        toggleStatus();
                                    }}
                                    className={admin.account_status === 'active' ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : (admin.account_status === 'active' ? 'Deactivate' : 'Activate')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </td>
        </tr>
    );
};

const HistorySheet = ({ adminId, onClose }: { adminId: string | null, onClose: () => void }) => {
    const { data: logs, isLoading } = useAdminAuditLogs(adminId);

    return (
        <Sheet open={!!adminId} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Activity History</SheetTitle>
                    <SheetDescription>
                        Recent changes and actions for this admin.
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6 h-full">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : !logs || logs.length === 0 ? (
                        <div className="text-center text-muted-foreground p-4">No activity logs found.</div>
                    ) : (
                        <ScrollArea className="h-[calc(100vh-10rem)] pr-4">
                            <div className="space-y-6 pl-2 border-l border-border ml-2">
                                {logs.map((log) => (
                                    <div key={log.id} className="relative pb-4">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border border-border bg-background" />
                                        <div className="text-sm font-medium mb-1 flex items-center gap-2">
                                            <span className="capitalize">{log.action_type.replace('_', ' ').toLowerCase()}</span>
                                            <span className="text-xs font-normal text-muted-foreground ml-auto">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                                            {log.action_type === 'PHONE_CHANGE' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">From</span>
                                                        <span className="text-destructive font-mono">{log.details.old_phone || 'None'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">To</span>
                                                        <span className="text-green-600 font-mono">{log.details.new_phone}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {log.action_type === 'STATUS_CHANGE' && (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{log.details.old_status}</Badge>
                                                    <span>→</span>
                                                    <Badge variant={log.details.new_status === 'active' ? 'default' : 'destructive'}>{log.details.new_status}</Badge>
                                                </div>
                                            )}
                                            {!['PHONE_CHANGE', 'STATUS_CHANGE'].includes(log.action_type) && (
                                                <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                                            )}
                                        </div>
                                        <div className="mt-1 text-[10px] text-muted-foreground text-right italic">
                                            By: {log.performer_name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default OrganizationAdmins;
