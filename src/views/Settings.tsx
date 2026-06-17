"use client";
import { useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, useUploadAvatar, useUpdatePassword } from "@/hooks/useSettings";
import { PartyBrandingCard } from "@/components/branding/PartyBrandingCard";
import {
    User,
    Mail,
    Phone,
    Lock,
    Shield,
    Building2,
    MapPin,
    Camera,
    Save,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Settings = () => {
    const { role } = useAuth();
    const { data: profile, isLoading: isProfileLoading } = useProfile();
    const updateProfile = useUpdateProfile();
    const uploadAvatar = useUploadAvatar();
    const updatePassword = useUpdatePassword();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        phone_number: "",
    });

    const [passwords, setPasswords] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize form data when profile loads
    useState(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                phone_number: profile.phone_number || "",
            });
        }
    });

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProfile.mutateAsync(formData);
            setIsEditing(false);
        } catch (error) {
            // Error handled in hook
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (passwords.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        try {
            await updatePassword.mutateAsync(passwords.newPassword);
            setPasswords({ newPassword: "", confirmPassword: "" });
        } catch (error) {
            // Error handled in hook
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await uploadAvatar.mutateAsync(file);
            } catch (error) {
                // Error handled in hook
            }
        }
    };

    if (isProfileLoading) {
        return (
            <DashboardLayout title="Settings" subtitle="Loading your preferences...">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const initials = profile?.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    return (
        <DashboardLayout
            title="Account Settings"
            subtitle="Manage your profile, security, and account preferences"
        >
            <div className="max-w-5xl mx-auto space-y-8 pb-12">
                {/* Header Profile Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-navy-deep p-8 text-white shadow-premium"
                >
                    {/* Background Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-success/10 rounded-full -ml-24 -mb-24 blur-3xl" />

                    <div className="relative flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group">
                            <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl transition-transform group-hover:scale-105">
                                <AvatarImage src={profile?.avatar_url || ""} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-danger text-4xl font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadAvatar.isPending}
                                className="absolute bottom-0 right-0 p-2 bg-white text-navy-deep rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                {uploadAvatar.isPending ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Camera className="w-5 h-5" />
                                )}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="text-center md:text-left space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name || "User"}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-white/20 px-3 py-1">
                                    {role?.replace("_", " ").toUpperCase()}
                                </Badge>
                                <span className="text-white/60 flex items-center gap-1.5 text-sm">
                                    <Mail className="w-4 h-4" />
                                    {profile?.email}
                                </span>
                            </div>
                        </div>

                        <div className="ml-auto hidden md:block">
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Account Integrity</p>
                                <div className="flex items-center gap-2 text-success">
                                    <Shield className="w-5 h-5" />
                                    <span className="font-medium">Active & Secure</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className={`grid w-full ${role === "super_admin" ? "max-w-xl grid-cols-3" : "max-w-md grid-cols-2"} p-1 bg-muted/50 rounded-xl mb-8`}>
                        <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <User className="w-4 h-4 mr-2" />
                            Personal Profile
                        </TabsTrigger>
                        <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Lock className="w-4 h-4 mr-2" />
                            Security
                        </TabsTrigger>
                        {role === "super_admin" && (
                            <TabsTrigger value="branding" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Shield className="w-4 h-4 mr-2" />
                                Branding
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="profile" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Personal Information */}
                            <Card className="md:col-span-2 border-navy-deep/5 shadow-premium">
                                <CardHeader className="border-b border-gray-50 bg-gray-50/50 rounded-t-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl">Personal Details</CardTitle>
                                            <CardDescription>Update your personal information and contact details</CardDescription>
                                        </div>
                                        {!isEditing && (
                                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                                Edit Profile
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="full_name">Full Name</Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="full_name"
                                                        className="pl-10"
                                                        value={isEditing ? formData.full_name : profile?.full_name || ""}
                                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                        disabled={!isEditing}
                                                        placeholder="Your full name"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Phone Number</Label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="phone"
                                                        className="pl-10"
                                                        value={isEditing ? formData.phone_number : profile?.phone_number || "Not provided"}
                                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                        disabled={!isEditing}
                                                        placeholder="+234..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email Address</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input id="email" className="pl-10" value={profile?.email || ""} disabled />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground ml-1">Email cannot be changed manually</p>
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <div className="flex justify-end gap-3 pt-4">
                                                <Button variant="ghost" type="button" onClick={() => setIsEditing(false)}>
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={updateProfile.isPending} className="bg-navy-deep hover:bg-navy-deep/90">
                                                    {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Save Changes
                                                </Button>
                                            </div>
                                        )}
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Jurisdictional Info */}
                            <Card className="border-navy-deep/5 shadow-premium h-fit">
                                <CardHeader className="bg-gray-50/50 rounded-t-xl">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        Workplace
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase">LGA</p>
                                                <p className="font-semibold">{profile?.lga || "State Level"}</p>
                                            </div>
                                        </div>
                                        {profile?.ward && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium uppercase">Ward</p>
                                                    <p className="font-semibold">{profile.ward}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-navy-deep/10 flex items-center justify-center text-navy-deep">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase">Account Status</p>
                                                <Badge variant="outline" className="mt-1 text-success border-success/30 bg-success/5">
                                                    {profile?.account_status || "Active"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6">
                        <Card className="max-w-2xl border-navy-deep/5 shadow-premium">
                            <CardHeader className="border-b border-gray-50 bg-gray-50/50 rounded-t-xl">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-danger" />
                                    Change Password
                                </CardTitle>
                                <CardDescription>Ensure your account is using a strong, unique password</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">New Password</Label>
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                placeholder="At least 8 characters"
                                                value={passwords.newPassword}
                                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="Repeat new password"
                                                value={passwords.confirmPassword}
                                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={updatePassword.isPending} className="bg-danger hover:bg-danger/90">
                                        {updatePassword.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Update Password
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Recent Login Info (Mock or real if available) */}
                        <Card className="max-w-2xl border-navy-deep/5 shadow-premium">
                            <CardHeader>
                                <CardTitle className="text-lg">Security Logs</CardTitle>
                                <CardDescription>Recent activity related to your account security</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Shield className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Last Login</p>
                                            <p className="text-xs text-muted-foreground">
                                                {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "Recently"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline">Verified</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {role === "super_admin" && (
                        <TabsContent value="branding" className="space-y-6">
                            <PartyBrandingCard />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </DashboardLayout>
    );
};

export default Settings;
