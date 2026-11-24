"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    useChairman,
    useChairmanCouncillors,
    useChairmanWards,
    useCreateCouncillor,
    useDeleteCouncillor,
    CouncillorRecord
} from "@/hooks/useChairmen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Plus,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Users,
    ShieldCheck,
    AlertCircle,
    Copy,
    Check,
    Search,
    UserCheck,
    UserX,
    Trash2,
    RefreshCw,
    Share2,
    Lock
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { KOGI_LGAS } from "@/lib/campaign-data";

const ManageCouncillors = () => {
    const { role } = useAuth();
    const { data: chairman } = useChairman();

    const isSuperAdmin = role === "super_admin" || role === "org_admin";

    const [selectedLga, setSelectedLga] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("admin_selected_lga") || localStorage.getItem("councillor_lga") || "Lokoja";
        }
        return "Lokoja";
    });

    const activeLga = (!isSuperAdmin && chairman?.lga) ? chairman.lga : (selectedLga || chairman?.lga || "Lokoja");

    const { data: councillors = [], isLoading: councillorsLoading } = useChairmanCouncillors(activeLga);
    const { data: wards = [], isLoading: wardsLoading } = useChairmanWards(activeLga);
    const createCouncillor = useCreateCouncillor(activeLga);
    const deleteCouncillor = useDeleteCouncillor(activeLga);

    const handleLgaChange = (newLga: string) => {
        setSelectedLga(newLga);
        if (typeof window !== "undefined") {
            localStorage.setItem("admin_selected_lga", newLga);
        }
    };

    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "vacant">("all");

    const [formData, setFormData] = useState({
        ward: "",
        councillor_name: "",
        email: "",
        phone: "",
        password: "",
    });

    const [showCredentials, setShowCredentials] = useState(false);
    const [savedCredentials, setSavedCredentials] = useState<{
        email: string;
        password: string;
        ward: string;
        lga: string;
        name: string;
    } | null>(null);

    // Auto-generate password and email based on selected ward
    const handleWardSelect = (ward: string) => {
        const cleanWard = ward.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanLga = activeLga.toLowerCase().replace(/[^a-z0-9]/g, "");
        const suggestedEmail = `${cleanWard}.${cleanLga}@apm.ng`;
        const suggestedPassword = `${cleanWard}@2026`;

        setFormData(prev => ({
            ...prev,
            ward,
            email: prev.email || suggestedEmail,
            password: prev.password || suggestedPassword,
        }));
    };

    const generatePassword = () => {
        if (!formData.ward) {
            toast.error("Please select a ward first");
            return;
        }
        const cleanWard = formData.ward.toLowerCase().replace(/[^a-z0-9]/g, "");
        const generated = `${cleanWard}@2026`;
        setFormData(prev => ({ ...prev, password: generated }));
        toast.info(`Generated: ${generated}`);
    };

    const normKey = (s: string) => (s || "").toLowerCase().replace(/ward/gi, "").replace(/[^a-z0-9]/g, "");

    const openAssignForWard = (wardName: string) => {
        const normW = normKey(wardName);
        const existing = councillors.find(c => {
            const cW = normKey(c.ward);
            return cW === normW || cW.includes(normW) || normW.includes(cW);
        });
        const cleanWard = wardName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanLga = activeLga.toLowerCase().replace(/[^a-z0-9]/g, "");

        setFormData({
            ward: wardName,
            councillor_name: existing?.councillor_name || "",
            email: existing?.email || `${cleanWard}.${cleanLga}@apm.ng`,
            phone: existing?.phone || "",
            password: `${cleanWard}@2026`,
        });
        setOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.ward || !formData.councillor_name || !formData.email || !formData.password) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            const result = await createCouncillor.mutateAsync({
                ...formData,
                lga: activeLga,
            });

            if (result.success && result.credentials) {
                setSavedCredentials(result.credentials);
                setShowCredentials(true);
                setFormData({
                    ward: "",
                    councillor_name: "",
                    email: "",
                    phone: "",
                    password: "",
                });
            }
        } catch (err: any) {
            toast.error(err?.message || "Failed to assign ward admin");
        }
    };

    const handleCloseCredentials = () => {
        setShowCredentials(false);
        setSavedCredentials(null);
        setOpen(false);
    };

    const copyToClipboard = (text: string, label: string = "Copied") => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    const shareViaWhatsApp = () => {
        if (!savedCredentials) return;
        const message = `*KOGI APM - WARD ADMIN CREDENTIALS*\n\n` +
            `Hello *${savedCredentials.name}*,\n` +
            `You have been appointed as the Ward Admin (Councillor) for *${savedCredentials.ward} Ward*, *${savedCredentials.lga} LGA*.\n\n` +
            `*Login Details:*\n` +
            `• Email: ${savedCredentials.email}\n` +
            `• Password: ${savedCredentials.password}\n` +
            `• Portal URL: ${typeof window !== 'undefined' ? window.location.origin : ''}/login\n\n` +
            `_Nigeria First - Allied Peoples' Movement (APM)_`;

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
    };

    // Build unified ward list with assigned councillor info
    const wardStatusList = useMemo(() => {
        return wards.map((wardName) => {
            const normW = normKey(wardName);
            const assigned = councillors.find(c => {
                const cW = normKey(c.ward);
                return cW === normW || cW.includes(normW) || normW.includes(cW);
            });
            return {
                wardName,
                isAssigned: !!assigned,
                councillor: assigned || null,
            };
        });
    }, [wards, councillors]);

    // Filtered wards
    const filteredWards = useMemo(() => {
        return wardStatusList.filter((item) => {
            // Status filter
            if (statusFilter === "assigned" && !item.isAssigned) return false;
            if (statusFilter === "vacant" && item.isAssigned) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchWard = item.wardName.toLowerCase().includes(q);
                const matchName = item.councillor?.councillor_name.toLowerCase().includes(q) || false;
                const matchEmail = item.councillor?.email.toLowerCase().includes(q) || false;
                const matchPhone = item.councillor?.phone?.toLowerCase().includes(q) || false;
                return matchWard || matchName || matchEmail || matchPhone;
            }
            return true;
        });
    }, [wardStatusList, searchQuery, statusFilter]);

    const totalWardsCount = wards.length;
    const assignedCount = wardStatusList.filter(w => w.isAssigned).length;
    const vacantCount = Math.max(0, totalWardsCount - assignedCount);
    const coveragePct = totalWardsCount > 0 ? Math.round((assignedCount / totalWardsCount) * 100) : 0;

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto animate-fade-in-up">
                {/* ── HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/50 p-6 sm:p-8 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {isSuperAdmin ? "State Command Portal" : "LGA Executive Portal"}
                            </span>
                            {isSuperAdmin ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground font-semibold">LGA:</span>
                                    <Select value={activeLga} onValueChange={handleLgaChange}>
                                        <SelectTrigger className="h-8 text-xs font-bold border-emerald-300 text-emerald-800 bg-white shadow-sm w-36">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {KOGI_LGAS.map((lga) => (
                                                <SelectItem key={lga} value={lga} className="text-xs font-medium">
                                                    {lga} LGA
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white font-semibold">
                                    {activeLga} LGA
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900">
                            Manage Ward Admins (Councillors)
                        </h1>
                        <p className="text-muted-foreground font-medium mt-1.5 flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            Official Ward Leadership & Administrative Assignment for {activeLga} LGA
                        </p>
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-5 text-base">
                                    <Plus className="mr-2 h-5 w-5" />
                                    Assign Ward Admin
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-border/50 shadow-2xl rounded-2xl">
                                <DialogHeader className="p-6 border-b border-border/50 bg-emerald-50/50 relative overflow-hidden">
                                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                                        <div className="p-2.5 bg-white shadow-sm border border-emerald-200 rounded-xl text-emerald-600">
                                            <UserCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span>Assign Ward Admin</span>
                                            <p className="text-xs font-normal text-muted-foreground mt-0.5">
                                                Jurisdiction: <strong className="text-emerald-700">{activeLga} LGA</strong>
                                            </p>
                                        </div>
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="p-6">
                                    {!showCredentials ? (
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="ward" className="text-xs font-bold uppercase text-gray-700">
                                                    Ward * ({activeLga} LGA)
                                                </Label>
                                                <Select
                                                    value={formData.ward}
                                                    onValueChange={handleWardSelect}
                                                >
                                                    <SelectTrigger id="ward" className="w-full bg-white border-gray-200">
                                                        <SelectValue placeholder="Select electoral ward" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-64">
                                                        {wards.map((ward) => {
                                                            const isAssigned = councillors.some(c => {
                                                                const cW = normKey(c.ward);
                                                                const wN = normKey(ward);
                                                                return cW === wN || cW.includes(wN) || wN.includes(cW);
                                                            });
                                                            return (
                                                                <SelectItem key={ward} value={ward}>
                                                                    <div className="flex items-center justify-between gap-4 w-full">
                                                                        <span>{ward}</span>
                                                                        {isAssigned && (
                                                                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                                                                Already Assigned
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-xs font-bold uppercase text-gray-700">
                                                    Ward Admin Full Name *
                                                </Label>
                                                <Input
                                                    id="name"
                                                    placeholder="e.g. Ibrahim Musa Bello"
                                                    value={formData.councillor_name}
                                                    onChange={(e) => setFormData({ ...formData, councillor_name: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-xs font-bold uppercase text-gray-700">
                                                    Login Email *
                                                </Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="ward.admin@apm.ng"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="phone" className="text-xs font-bold uppercase text-gray-700">
                                                    Phone Number (WhatsApp)
                                                </Label>
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    placeholder="08012345678"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Label htmlFor="password" className="text-xs font-bold uppercase text-gray-700">
                                                        Login Password *
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={generatePassword}
                                                        className="text-xs text-emerald-700 hover:text-emerald-800 h-6 px-2"
                                                    >
                                                        <RefreshCw className="w-3 h-3 mr-1" />
                                                        Auto Generate
                                                    </Button>
                                                </div>
                                                <div className="relative">
                                                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                                    <Input
                                                        id="password"
                                                        type="text"
                                                        placeholder="Enter or generate password"
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        className="pl-9 font-mono text-sm"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 h-auto text-base mt-6"
                                                disabled={createCouncillor.isPending}
                                            >
                                                {createCouncillor.isPending ? "Assigning Admin..." : "Confirm & Assign Ward Admin"}
                                            </Button>
                                        </form>
                                    ) : (
                                        <div className="space-y-5">
                                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                                                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                                                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                                    Ward Admin Assigned Successfully!
                                                </div>
                                                <p className="text-xs text-emerald-700">
                                                    Copy or share these credentials with the Ward Admin so they can log in to their Ward Dashboard.
                                                </p>

                                                <div className="bg-white p-3.5 rounded-lg border border-emerald-100 space-y-2.5">
                                                    <div className="flex justify-between items-center text-xs border-b pb-2">
                                                        <span className="text-gray-500 font-medium">Ward & LGA:</span>
                                                        <span className="font-bold text-gray-900">{savedCredentials?.ward} Ward, {savedCredentials?.lga}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs border-b pb-2">
                                                        <span className="text-gray-500 font-medium">Full Name:</span>
                                                        <span className="font-bold text-gray-900">{savedCredentials?.name}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs border-b pb-2">
                                                        <span className="text-gray-500 font-medium">Email:</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-gray-900">{savedCredentials?.email}</span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => copyToClipboard(savedCredentials?.email || "", "Email")}
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500 font-medium">Password:</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                                {savedCredentials?.password}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => copyToClipboard(savedCredentials?.password || "", "Password")}
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={shareViaWhatsApp}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-5"
                                                >
                                                    <Share2 className="w-4 h-4 mr-2" />
                                                    Share via WhatsApp
                                                </Button>
                                                <Button
                                                    onClick={handleCloseCredentials}
                                                    variant="outline"
                                                    className="px-6 py-5"
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* ── METRIC SUMMARY CARDS ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-emerald-600 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Total Wards in LGA
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                                {totalWardsCount}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                INEC Electoral Wards
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-blue-50/50 to-white shadow-sm">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Assigned Admins
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700">
                                {assignedCount}
                            </div>
                            <p className="text-[11px] text-blue-600 mt-0.5 font-medium">
                                Active Ward Leaders
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Vacant Wards
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
                                {vacantCount}
                            </div>
                            <p className="text-[11px] text-amber-600 mt-0.5 font-medium">
                                Awaiting Assignment
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-600 bg-gradient-to-br from-purple-50/50 to-white shadow-sm">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Ward Coverage
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl sm:text-3xl font-extrabold text-purple-700">
                                {coveragePct}%
                            </div>
                            <p className="text-[11px] text-purple-600 mt-0.5 font-medium">
                                Admin staffing rate
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── FILTER & SEARCH BAR ── */}
                <Card className="border border-border/50 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <div className="relative w-full sm:w-96">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                <Input
                                    placeholder="Search by ward name, admin name, phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 text-sm bg-muted/20"
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Status:</span>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(val: any) => setStatusFilter(val)}
                                >
                                    <SelectTrigger className="w-full sm:w-44 text-sm bg-white">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Wards ({totalWardsCount})</SelectItem>
                                        <SelectItem value="assigned">Assigned ({assignedCount})</SelectItem>
                                        <SelectItem value="vacant">Vacant ({vacantCount})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── WARDS LIST & ADMIN ASSIGNMENT TABLE ── */}
                <Card className="border border-border/50 shadow-md overflow-hidden">
                    <CardHeader className="p-5 sm:p-6 bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-emerald-600" />
                                {activeLga} LGA Wards & Assigned Administrators
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Every ward strictly mapped to {activeLga} LGA with real-time assignment controls
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold hidden sm:inline-flex">
                            {assignedCount} of {totalWardsCount} Assigned
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        {wardsLoading || councillorsLoading ? (
                            <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                                <span>Loading wards and administrator roster...</span>
                            </div>
                        ) : filteredWards.length === 0 ? (
                            <div className="text-center py-12 text-sm text-muted-foreground">
                                No wards match your current filter.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead className="font-bold text-xs uppercase text-gray-700">Ward Name</TableHead>
                                            <TableHead className="font-bold text-xs uppercase text-gray-700">Status</TableHead>
                                            <TableHead className="font-bold text-xs uppercase text-gray-700">Ward Admin / Councillor</TableHead>
                                            <TableHead className="font-bold text-xs uppercase text-gray-700">Contact</TableHead>
                                            <TableHead className="font-bold text-xs uppercase text-gray-700">Assigned Date</TableHead>
                                            <TableHead className="font-bold text-xs uppercase text-gray-700 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredWards.map(({ wardName, isAssigned, councillor }) => (
                                            <TableRow key={wardName} className="hover:bg-muted/20 transition-colors">
                                                <TableCell className="font-semibold text-gray-900 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${isAssigned ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                                        <span>{wardName}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {isAssigned ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                            Assigned
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                            <AlertCircle className="w-3 h-3 text-amber-600" />
                                                            Vacant
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    {isAssigned && councillor ? (
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-sm">
                                                                {councillor.councillor_name}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <Mail className="w-3 h-3" />
                                                                {councillor.email}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">
                                                            No admin appointed
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    {isAssigned && councillor?.phone ? (
                                                        <div className="flex items-center gap-1 text-xs text-gray-700">
                                                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>{councillor.phone}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    {isAssigned && councillor?.created_at ? (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(councillor.created_at).toLocaleDateString()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    {isAssigned && councillor ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                                                onClick={() => openAssignForWard(wardName)}
                                                            >
                                                                Edit / Reassign
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => {
                                                                    if (confirm(`Are you sure you want to remove the Ward Admin for ${wardName} Ward?`)) {
                                                                        deleteCouncillor.mutate(councillor.id);
                                                                    }
                                                                }}
                                                                title="Remove Admin"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                            onClick={() => openAssignForWard(wardName)}
                                                        >
                                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                                            Assign Admin
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default ManageCouncillors;
