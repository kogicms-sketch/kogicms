"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChairman, useChangePassword } from "@/hooks/useChairmen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Lock, User, Mail, Phone, Calendar, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ChairmanSettings = () => {
    const { data: chairman } = useChairman();
    const changePassword = useChangePassword();

    const [passwords, setPasswords] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (passwords.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        await changePassword.mutateAsync(passwords.newPassword);
        setPasswords({ newPassword: "", confirmPassword: "" });
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-4xl">
                <div className="border-b pb-4">
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your account and preferences
                    </p>
                </div>

                {chairman?.must_change_password && (
                    <Alert variant="destructive">
                        <Lock className="h-4 w-4" />
                        <AlertDescription>
                            You must change your password to continue using the system.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Profile Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Full Name
                                </Label>
                                <Input value={chairman?.chairman_name || ""} disabled />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    LGA
                                </Label>
                                <Input value={chairman?.lga || ""} disabled />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email
                                </Label>
                                <Input value={chairman?.email || ""} disabled />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Phone
                                </Label>
                                <Input value={chairman?.phone || "Not set"} disabled />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Election Date
                                </Label>
                                <Input
                                    value={chairman?.election_date
                                        ? new Date(chairman.election_date).toLocaleDateString()
                                        : "Not set"}
                                    disabled
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Sworn In Date
                                </Label>
                                <Input
                                    value={chairman?.sworn_in_date
                                        ? new Date(chairman.sworn_in_date).toLocaleDateString()
                                        : "Not set"}
                                    disabled
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Change Password */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Change Password
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Enter new password (min 8 characters)"
                                    value={passwords.newPassword}
                                    onChange={(e) =>
                                        setPasswords({ ...passwords, newPassword: e.target.value })
                                    }
                                    required
                                    minLength={8}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Re-enter new password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) =>
                                        setPasswords({ ...passwords, confirmPassword: e.target.value })
                                    }
                                    required
                                    minLength={8}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={changePassword.isPending}
                                className="w-full md:w-auto"
                            >
                                {changePassword.isPending ? "Changing..." : "Change Password"}
                            </Button>
                        </form>

                        {chairman?.last_password_change && (
                            <p className="text-sm text-muted-foreground mt-4">
                                Last changed: {new Date(chairman.last_password_change).toLocaleString()}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Account Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Account Type:</span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                LGA Chairman
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Status:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${chairman?.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                {chairman?.is_active ? "Active" : "Inactive"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Party:</span>
                            <span className="text-sm">{chairman?.party || "N/A"}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default ChairmanSettings;
