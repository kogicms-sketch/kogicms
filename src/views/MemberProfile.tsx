"use client";
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    MapPin,
    Phone,
    Mail,
    Building2,
    Calendar,
    ArrowLeft,
    Award,
    CheckCircle,
    XCircle,
    Clock,
    QrCode,
    User,
    CreditCard,
    Loader2,
    Download,
    ShieldCheck,
    AlertCircle,
    Gift
} from "lucide-react";
import QRCode from "react-qr-code";
import { CAMPAIGN_NAME } from "@/lib/campaign-data";
import { useParty } from "@/contexts/PartyContext";
import { supabase } from "@/integrations/supabase/loose-client";
import { format } from "date-fns";
import { EditMemberModal } from "@/components/members/EditMemberModal";
import { PrintableIDCard } from "@/components/members/PrintableIDCard";
import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { usePUAgent } from "@/hooks/usePUAgent";
import { useVerifyMember } from "@/hooks/useMembers";
import { useMemberIncentives } from "@/hooks/useIncentives";
import { StarAgentButton } from "@/components/members/StarAgentButton";

const MemberProfile = () => {
    const { partyId } = useParty();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const navigate = (path, options?: any) => { if (path === -1) router.back(); else router.push(path); };
    const idCardRef = useRef<HTMLDivElement>(null);
    const [downloadName, setDownloadName] = useState<string>("member");
    const { mutateAsync: verifyMember, isPending: isVerifying } = useVerifyMember();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { data: incentives = [], isLoading: incentivesLoading } = useMemberIncentives({
        member_id: id || undefined
    });
    // Get current user role
    const { data: userProfile, isLoading: userRoleLoading } = useQuery({
        queryKey: ["current-user-role"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            return data;
        }
    });

    // Get agent profile if applicable
    const { data: puAgent, isLoading: puAgentLoading } = usePUAgent();

    const handleDownloadIdCard = useCallback(async () => {
        if (!idCardRef.current) {
            toast.error("ID card not ready");
            return;
        }

        try {
            toast.loading("Generating ID card...", { id: "download-id" });
            const dataUrl = await toPng(idCardRef.current, {
                quality: 1,
                pixelRatio: 2,
            });

            const link = document.createElement("a");
            link.download = `${downloadName.replace(/\s+/g, "_")}-id-card.png`;
            link.href = dataUrl;
            link.click();

            toast.success("ID card downloaded!", { id: "download-id" });
        } catch (error) {
            console.error("ID card download error:", error);
            toast.error("Failed to download ID card", { id: "download-id" });
        }
    }, [downloadName]);

    const { data: member, isLoading, error: memberError } = useQuery({
        queryKey: ["member", id, userProfile?.role, puAgent?.polling_unit_id, puAgent?.polling_unit_name],
        queryFn: async () => {
            if (!id) throw new Error("No member ID");

            let query = supabase
                .from("members")
                .select("*, organizations:organization_id(name)")
                .eq("id", id);

            if (userProfile?.role === "polling_unit_agent") {
                if (puAgent?.polling_unit_id && puAgent?.polling_unit_name) {
                    query = query.or(`polling_unit_id.eq.${puAgent.polling_unit_id},polling_unit.eq.${puAgent.polling_unit_name}`);
                } else if (puAgent?.polling_unit_id) {
                    query = query.eq("polling_unit_id", puAgent.polling_unit_id);
                } else if (puAgent?.polling_unit_name) {
                    query = query.eq("polling_unit", puAgent.polling_unit_name);
                } else {
                    return null;
                }
            }

            const { data, error } = await query.maybeSingle();

            if (error) {
                console.error("Error fetching member:", error);
                throw error;
            }
            return data as any;
        },
        enabled: !!id && !userRoleLoading && (userProfile?.role !== "polling_unit_agent" || !!puAgent?.polling_unit_id || !!puAgent?.polling_unit_name),
        retry: 1,
    });

    const campaignName = partyId === "apc" 
        ? CAMPAIGN_NAME 
        : `${member?.lga || "Kogi State"} Campaign`;

    // Debug log
    console.log("Member query result:", { member, isLoading, memberError, id });

    // Update download name when member loads
    useEffect(() => {
        if (member?.full_name) {
            setDownloadName(member.full_name);
        }
    }, [member?.full_name]);

    const { data: attendanceRecords = [] } = useQuery({
        queryKey: ["member-attendance", id],
        queryFn: async () => {
            if (!id) return [];
            const { data, error } = await supabase
                .from("activity_attendance")
                .select("*, activities(title, scheduled_date)")
                .eq("member_id", id)
                .order("checked_in_at", { ascending: false })
                .limit(10);
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    const handleVerify = async () => {
        if (!id) return;
        try {
            await verifyMember(id);
        } catch (error) {
            console.error("Verification error:", error);
        }
    };

    if (isLoading || userRoleLoading || (userProfile?.role === "polling_unit_agent" && puAgentLoading)) {
        return (
            <DashboardLayout title="Member Profile" subtitle="Loading...">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!member) {
        return (
            <DashboardLayout title="Member Profile" subtitle="Member not found">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Member not found</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                        Go Back
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const initials = member.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const formattedDob = member.date_of_birth
        ? (() => {
            try {
                return format(new Date(member.date_of_birth), "MMM dd, yyyy");
            } catch (e) {
                return "Invalid Date";
            }
        })()
        : "Not provided";

    const formattedJoinDate = (() => {
        try {
            return member.joined_at ? format(new Date(member.joined_at), "MMM dd, yyyy") : "N/A";
        } catch (e) {
            return "N/A";
        }
    })();

    return (
        <DashboardLayout
            title="Member Profile"
            subtitle={`View details for ${member.full_name}`}
        >
            <div className="mb-6 flex items-center justify-between">
                <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4" /> Back to Members
                </Button>
                <div className="flex gap-2 items-center flex-wrap">
                    <StarAgentButton
                        memberId={member.id}
                        initialRole={member.role}
                        initialSocialHandle={member.social_media_handle}
                        size="default"
                    />
                    {!member.is_deceased && (
                        <Button variant="outline" className="gap-2" onClick={handleDownloadIdCard}>
                            <Download className="w-4 h-4" />
                            Download ID Card
                        </Button>
                    )}
                    <Button className="btn-action gap-2" onClick={() => setIsEditModalOpen(true)}>
                        <User className="w-4 h-4" />
                        Edit Profile
                    </Button>
                    {(!member.is_verified && !member.is_deceased && (
                        userProfile?.role === "super_admin" || 
                        (userProfile?.role === "polling_unit_agent" && (puAgent?.polling_unit_id === member.polling_unit_id || puAgent?.polling_unit_name === member.polling_unit))
                    )) && (
                        <Button 
                            onClick={handleVerify}
                            disabled={isVerifying}
                            className="bg-apc-green hover:bg-apc-green/90 text-white gap-2 shadow-lg animate-pulse"
                        >
                            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Verify Field Visit
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: ID Card & Info */}
                <div className="space-y-6">
                    {/* Verification Box for Agents */}
                    {(!member.is_verified && !member.is_deceased && (
                        userProfile?.role === "super_admin" || 
                        (userProfile?.role === "polling_unit_agent" && (puAgent?.polling_unit_id === member.polling_unit_id || puAgent?.polling_unit_name === member.polling_unit))
                    )) && (
                        <Card className="border-l-4 border-l-apc-green bg-green-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-green-800">
                                    <ShieldCheck className="w-5 h-5" />
                                    Field Verification Hub
                                </CardTitle>
                                <CardDescription className="text-green-700/80">
                                    Confirm that this member has been physically met and verified at their polling unit.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    onClick={handleVerify} 
                                    disabled={isVerifying}
                                    className="w-full bg-apc-green hover:bg-apc-green/90 text-white gap-2 h-12 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    Confirm & Verify Support
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                    
                    {!member.is_verified && userProfile?.role === "polling_unit_agent" && puAgent?.polling_unit_id !== member.polling_unit_id && puAgent?.polling_unit_name !== member.polling_unit && (
                        <Card className="border-l-4 border-l-orange-400 bg-orange-50/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800">
                                    <AlertCircle className="w-4 h-4" />
                                    Verification Restricted
                                </CardTitle>
                                <CardDescription className="text-xs text-orange-700">
                                    Only the agent assigned to Polling Unit <b>{member.polling_unit || "N/A"}</b> can verify this member.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                    
                    {member.is_verified && (
                        <Card className="border-l-4 border-l-green-600 bg-green-50/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-green-800">
                                    <CheckCircle className="w-4 h-4" />
                                    Verified On-Ground
                                </CardTitle>
                                <CardDescription className="text-xs text-green-600">
                                    This member is a confirmed supporter and has been verified by a campaign agent.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}

                    {/* Digital ID Card */}
                    <Card className="overflow-hidden border-navy-deep/20 shadow-premium bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                        <div className="bg-navy-deep p-4 text-white text-center">
                            <h3 className="font-bold text-lg">{campaignName}</h3>
                            <p className="text-xs opacity-90">Official Member ID</p>
                        </div>
                        <CardContent className="flex flex-col items-center pt-8 pb-8">
                            <Avatar className="w-32 h-32 border-4 border-white shadow-lg mb-4">
                                <AvatarFallback className="text-4xl bg-navy-deep text-white">{initials}</AvatarFallback>
                            </Avatar>

                            <h2 className="text-2xl font-bold text-navy-deep dark:text-white mb-1">{member.full_name}</h2>
                            <div className="flex flex-wrap justify-center gap-2 mb-2">
                                <Badge variant="secondary" className="bg-navy-deep/10 text-navy-deep">
                                    {member.role || "Member"}
                                </Badge>
                                {member.is_deceased ? (
                                    <Badge variant="destructive" className="bg-red-600 text-white gap-1 animate-pulse">
                                        <AlertCircle className="w-3 h-3" /> Deceased
                                    </Badge>
                                ) : member.is_verified ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 gap-1">
                                        <ShieldCheck className="w-3 h-3" /> Verified Support
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 gap-1">
                                        <Clock className="w-3 h-3" /> Verification Pending
                                    </Badge>
                                )}
                            </div>
                            {member.gender?.toLowerCase() === "male" ? (
                                <Badge variant="secondary" className="mb-4 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50 capitalize">
                                    Male
                                </Badge>
                            ) : member.gender?.toLowerCase() === "female" ? (
                                <Badge variant="secondary" className="mb-4 bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/50 capitalize">
                                    Female
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="mb-4 capitalize">Gender: N/A</Badge>
                            )}

                            <div className="w-full space-y-3 mb-6">
                                <div className="flex items-center justify-between text-sm border-b border-border pb-2">
                                    <span className="text-muted-foreground">Member ID</span>
                                    <span className="font-mono font-medium">{member.membership_id || `DR-${member.id.slice(0, 8).toUpperCase()}`}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm border-b border-border pb-2">
                                    <span className="text-muted-foreground">Date of Birth</span>
                                    <span className="font-medium">{formattedDob}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm border-b border-border pb-2">
                                    <span className="text-muted-foreground">LGA</span>
                                    <span className="font-medium">{member.lga || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm border-b border-border pb-2">
                                    <span className="text-muted-foreground">Ward</span>
                                    <span className="font-medium">{member.ward || "N/A"}</span>
                                </div>
                                {member.polling_unit && (
                                    <div className="flex items-center justify-between text-sm border-b border-border pb-2">
                                        <span className="text-muted-foreground">Polling Unit</span>
                                        <span className="font-medium">{member.polling_unit}</span>
                                    </div>
                                )}
                            </div>

                            {/* QR Code */}
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                <div className="h-auto w-0 max-w-full" style={{ width: "128px" }}>
                                    <QRCode
                                        size={256}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        value={`DR-MEMBER-${member.id}`}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Scan to verify membership</p>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium">Email Address</p>
                                    <p className="text-sm text-muted-foreground truncate">{member.email || "Not provided"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Phone Number</p>
                                    <p className="text-sm text-muted-foreground">{member.phone || "Not provided"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Organization</p>
                                    <p className="text-sm text-muted-foreground">{(member.organizations as any)?.name || "N/A"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Date Joined</p>
                                    <p className="text-sm text-muted-foreground">{formattedJoinDate}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Voter Card & Tabs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Voter Card Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Voter Card Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Voter Card ID</p>
                                            <p className="text-lg font-semibold font-mono">{member.voters_card_id || "Not provided"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Gender</p>
                                            <p className="text-lg font-semibold capitalize">{member.gender || "Not provided"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                                            <p className="text-lg font-semibold">{formattedDob}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center">
                                    {member.voters_card_image_url ? (
                                        <div className="relative group">
                                            <img
                                                src={member.voters_card_image_url}
                                                alt="Voter Card"
                                                className="max-w-full max-h-48 rounded-lg border border-border shadow-sm object-contain"
                                            />
                                            <a
                                                href={member.voters_card_image_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                            >
                                                <span className="text-white text-sm font-medium">View Full Size</span>
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="w-full h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                                            <div className="text-center">
                                                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-sm text-muted-foreground">No voter card image uploaded</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Demographics & Occupation */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Demographics & Occupation
                            </CardTitle>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setIsEditModalOpen(true)}
                              className="h-8 text-xs font-bold gap-1 text-primary hover:bg-primary/10 border-primary/30"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-primary" />
                              <span>Edit Bank Account</span>
                            </Button>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-border">
                                    <span className="text-sm text-muted-foreground">Marital Status</span>
                                    <span className="text-sm font-semibold">{member.marital_status || "Not provided"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border">
                                    <span className="text-sm text-muted-foreground">Primary Occupation</span>
                                    <span className="text-sm font-semibold">{member.occupation || "Not provided"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border">
                                    <span className="text-sm text-muted-foreground">Bank Name</span>
                                    <span className="text-sm font-bold text-foreground">{member.bank_name || <span className="text-red-500 italic text-xs">Not provided</span>}</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-border">
                                    <span className="text-sm text-muted-foreground">Account Number</span>
                                    <span className="text-sm font-mono font-extrabold text-foreground">{member.account_number || <span className="text-red-500 italic text-xs">Not provided</span>}</span>
                                </div>
                                {member.occupation?.toLowerCase() === "student" && (
                                    <>
                                        <div className="flex justify-between items-center py-2 border-b border-border">
                                            <span className="text-sm text-muted-foreground">School Name</span>
                                            <span className="text-sm font-semibold">{member.school_name || "Not provided"}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-border">
                                            <span className="text-sm text-muted-foreground">Level / Year</span>
                                            <span className="text-sm font-semibold">{member.school_level || "Not provided"}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="text-3xl font-bold text-navy-deep">{member.activity_count || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">Activities Attended</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="text-3xl font-bold text-success">{attendanceRecords.length > 0 ? "Active" : "New"}</p>
                                <p className="text-xs text-muted-foreground mt-1">Status</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="text-3xl font-bold text-primary">{member.state}</p>
                                <p className="text-xs text-muted-foreground mt-1">State</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-lg px-3 py-1">
                                    {member.status}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">Member Status</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="attendance" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
                            <TabsTrigger value="welfare">Received Incentives</TabsTrigger>
                        </TabsList>

                        <TabsContent value="attendance" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Attendance Record</CardTitle>
                                    <CardDescription>Detailed log of event check-ins.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {attendanceRecords.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No attendance records yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {attendanceRecords.map((record: any) => (
                                                <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle className="w-5 h-5 text-success" />
                                                        <div>
                                                            <p className="font-medium text-sm">{record.activities?.title || "Activity"}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {record.activities?.scheduled_date
                                                                    ? format(new Date(record.activities.scheduled_date), "MMM dd, yyyy")
                                                                    : "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Clock className="w-3 h-3" />
                                                        <span>
                                                            {record.checked_in_at
                                                                ? format(new Date(record.checked_in_at), "hh:mm a")
                                                                : "--"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="welfare" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Received Incentives</CardTitle>
                                    <CardDescription>Palliatives, grants, and scholarships handed over to this member.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {incentivesLoading ? (
                                        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading incentives history...
                                        </div>
                                    ) : incentives.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No incentives assigned or received yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {incentives.map((inc: any) => (
                                                <div key={inc.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 gap-4 transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-lg ${inc.status === 'disbursed' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                                            <Gift className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-foreground">{inc.batch?.name || "Incentive Package"}</p>
                                                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                                                Item: <span className="text-foreground font-semibold">{inc.batch?.item_name}</span>
                                                                {inc.batch?.amount_per_member > 0 && ` (₦${Number(inc.batch.amount_per_member).toLocaleString()})`}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                                Funded by: <span className="font-semibold">{inc.batch?.funder_name}</span> ({inc.batch?.funder_role?.replace('_', ' ')})
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 md:self-center">
                                                        <div className="text-right mr-2 hidden md:block">
                                                            <p className="text-xs text-muted-foreground">Status</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                {inc.status === 'disbursed' 
                                                                    ? `Disbursed: ${format(new Date(inc.disbursed_at), "MMM dd, yyyy")}`
                                                                    : `Allocated: ${format(new Date(inc.allocated_at), "MMM dd, yyyy")}`
                                                                }
                                                            </p>
                                                        </div>
                                                        <Badge variant={inc.status === 'disbursed' ? 'default' : 'secondary'} className={inc.status === 'disbursed' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-amber-100 hover:bg-amber-200 text-amber-800'}>
                                                            {inc.status === 'disbursed' ? 'Disbursed' : 'Allocated'}
                                                        </Badge>
                                                        {inc.status === 'disbursed' && (
                                                            <Badge variant="outline" className={
                                                                inc.audit_status === 'verified' 
                                                                    ? 'border-green-600 text-green-600' 
                                                                    : inc.audit_status === 'flagged' 
                                                                    ? 'border-red-600 text-red-600' 
                                                                    : 'border-orange-500 text-orange-600'
                                                            }>
                                                                {inc.audit_status === 'verified' 
                                                                    ? 'Verified (Audited)' 
                                                                    : inc.audit_status === 'flagged' 
                                                                    ? 'Flagged' 
                                                                    : 'Pending Audit'
                                                                }
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {member && (
                <EditMemberModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    member={member as any}
                />
            )}

            {/* Hidden Printable Card */}
            {member && !member.is_deceased && (
                <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
                    <PrintableIDCard ref={idCardRef} member={member as any} />
                </div>
            )}
        </DashboardLayout>
    );
};

export default MemberProfile;
