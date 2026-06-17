"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChairman, useChairmanCouncillors, useCreateCouncillor } from "@/hooks/useChairmen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Plus, Mail, Phone, MapPin, Calendar, Users } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useChairmanWards } from "@/hooks/useChairmen";
import { toast } from "sonner";

const ManageCouncillors = () => {
    const { data: chairman } = useChairman();
    const { data: councillors, isLoading } = useChairmanCouncillors();
    const { data: wards } = useChairmanWards();
    const createCouncillor = useCreateCouncillor();

    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        ward: "",
        councillor_name: "",
        email: "",
        phone: "",
        password: "",
    });
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [showCredentials, setShowCredentials] = useState(false);
    const [savedCredentials, setSavedCredentials] = useState<{ email: string; password: string } | null>(null);

    const generatePassword = () => {
        const password = `${formData.ward.toLowerCase().replace(/\s+/g, '')}@2026`;
        setGeneratedPassword(password);
        setFormData({ ...formData, password });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.ward || !formData.councillor_name || !formData.email || !formData.password) {
            toast.error("Please fill in all required fields");
            return;
        }

        const result = await createCouncillor.mutateAsync(formData);

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
            setGeneratedPassword("");
        }
    };

    const handleCloseCredentials = () => {
        setShowCredentials(false);
        setSavedCredentials(null);
        setOpen(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto animate-fade-in-up">
                {/* Premium Header Area */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-muted/50 to-transparent p-6 sm:p-8 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-1 bg-primary rounded-full"></div>
                            <span className="text-xs font-bold text-primary tracking-widest uppercase bg-primary/10 px-2 py-0.5 rounded-full">Admin Panel</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                            Manage Councillors
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {chairman?.lga} LGA <span className="opacity-50">•</span> Ward Councillors
                        </p>
                    </div>

                    {/* Decorative background circle */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500 pointer-events-none"></div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 btn-action relative z-10 px-6 py-6 h-auto text-base">
                                <Plus className="mr-2 h-5 w-5" />
                                <span className="font-semibold tracking-wide">Add Councillor</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-border/50 shadow-2xl rounded-2xl">
                            <DialogHeader className="p-6 border-b border-border/50 bg-muted/30 relative overflow-hidden">
                                {/* Decorative gradient */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-3 relative z-10">
                                    <div className="p-2.5 bg-white shadow-sm border border-border/50 rounded-xl">
                                        <Plus className="w-5 h-5 text-primary" />
                                    </div>
                                    Create New Councillor
                                </DialogTitle>
                            </DialogHeader>
                            <div className="p-6">
                                {!showCredentials ? (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="ward">Ward *</Label>
                                            <Select
                                                value={formData.ward}
                                                onValueChange={(value) => setFormData({ ...formData, ward: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select ward" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {wards?.map((ward) => (
                                                        <SelectItem key={ward} value={ward}>
                                                            {ward}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="name">Councillor Name *</Label>
                                            <Input
                                                id="name"
                                                placeholder="Enter full name"
                                                value={formData.councillor_name}
                                                onChange={(e) => setFormData({ ...formData, councillor_name: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="councillor@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="+234..."
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password *</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="password"
                                                    type="text"
                                                    placeholder="Enter password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={generatePassword}
                                                    disabled={!formData.ward}
                                                >
                                                    Generate
                                                </Button>
                                            </div>
                                            {generatedPassword && (
                                                <p className="text-xs text-muted-foreground">
                                                    Generated: {generatedPassword}
                                                </p>
                                            )}
                                        </div>

                                        <Button type="submit" className="w-full btn-action mt-6 py-6 h-auto text-base tracking-wide" disabled={createCouncillor.isPending}>
                                            {createCouncillor.isPending ? "Creating..." : "Create Councillor"}
                                        </Button>
                                    </form>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <h3 className="font-semibold text-green-900 mb-2">Councillor Created!</h3>
                                            <p className="text-sm text-green-700 mb-4">
                                                Save these credentials and share with the councillor:
                                            </p>
                                            <div className="space-y-2 bg-white p-3 rounded border">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium">Email:</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm">{savedCredentials?.email}</span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => copyToClipboard(savedCredentials?.email || "")}
                                                        >
                                                            Copy
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium">Password:</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm">{savedCredentials?.password}</span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => copyToClipboard(savedCredentials?.password || "")}
                                                        >
                                                            Copy
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Button onClick={handleCloseCredentials} className="w-full">
                                            Done
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="mobile-card-shadow border-border/50 hover:shadow-lg transition-all duration-300 overflow-hidden group/card mt-8">
                    <CardHeader className="p-5 sm:p-6 bg-muted/30 border-b border-border/50 group-hover/card:bg-muted/40 transition-colors">
                        <CardTitle className="text-lg sm:text-xl flex items-center gap-2.5">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            Councillors List
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="text-center py-8">Loading councillors...</div>
                        ) : councillors && councillors.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Ward</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {councillors.map((councillor) => (
                                        <TableRow key={councillor.id}>
                                            <TableCell className="font-medium">
                                                {councillor.councillor_name}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    {councillor.ward}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                                        {councillor.email}
                                                    </div>
                                                    {councillor.phone && (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                                            {councillor.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs ${councillor.is_active
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                    }`}>
                                                    {councillor.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(councillor.created_at).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-16 px-6 bg-white flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-border/50">
                                    <Users className="w-10 h-10 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">No Councillors Configured</h3>
                                <p className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                                    Get started by adding your first ward councillor to manage local operations and polling units.
                                </p>
                                <Button onClick={() => setOpen(true)} className="btn-action shadow-md hover:shadow-lg px-8 py-6 h-auto text-base">
                                    <Plus className="mr-2 h-5 w-5" />
                                    <span className="font-semibold tracking-wide">Add First Councillor</span>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default ManageCouncillors;
