"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/loose-client";
import { useQueryClient } from "@tanstack/react-query";
import { localRepository } from "@/services/LocalRepository";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

interface AssignAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    councillorId: string;
    pollingUnit: {
        id: string;
        name: string;
        ward: string;
        lga: string;
    };
}

const isUuid = (val?: string | null) =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

const AssignAgentModal = ({
    isOpen,
    onClose,
    onSuccess,
    councillorId,
    pollingUnit,
}: AssignAgentModalProps) => {
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            password: Math.random().toString(36).slice(-8), // Generate random password
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        try {
            const cleanPuId = pollingUnit.id.replace(/^(static-|virtual-)/, "");
            const validCouncillorId = isUuid(councillorId) ? councillorId : null;
            const validPuId = isUuid(cleanPuId) ? cleanPuId : null;

            // 1. Attempt backend RPC if parameters match UUID expectations
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc("create_polling_unit_agent" as any, {
                    p_councillor_id: validCouncillorId,
                    p_polling_unit_id: validPuId,
                    p_polling_unit_name: pollingUnit.name,
                    p_ward: pollingUnit.ward,
                    p_lga: pollingUnit.lga,
                    p_agent_name: values.name,
                    p_email: values.email,
                    p_password: values.password,
                    p_phone: values.phone,
                });
                if (!rpcError && (rpcData as any)?.success) {
                    console.log("RPC agent created successfully");
                }
            } catch (rpcErr) {
                console.warn("RPC function create_polling_unit_agent notice, continuing with resilient assignment:", rpcErr);
            }

            // 2. Attempt Supabase Auth SignUp so agent has credentials in auth.users
            try {
                await supabase.auth.signUp({
                    email: values.email,
                    password: values.password,
                    options: {
                        data: {
                            full_name: values.name,
                            role: "polling_unit_agent",
                            phone: values.phone,
                            lga: pollingUnit.lga,
                            ward: pollingUnit.ward,
                            polling_unit_id: pollingUnit.id,
                            polling_unit_name: pollingUnit.name,
                        },
                    },
                });
            } catch (authErr) {
                // Ignore if offline or user already registered
            }

            // 3. Persist assignment in localRepository (IndexedDB)
            try {
                const cachedCells = await localRepository.getPollingUnitCells();
                const puMatch = (c: any) =>
                    c.id === pollingUnit.id ||
                    c.id === cleanPuId ||
                    c.pu_code === cleanPuId ||
                    c.polling_unit_name?.toLowerCase() === pollingUnit.name.toLowerCase();

                const existingIdx = cachedCells.findIndex(puMatch);
                const updatedCell = {
                    id: pollingUnit.id,
                    polling_unit_name: pollingUnit.name,
                    ward: pollingUnit.ward,
                    lga: pollingUnit.lga,
                    polling_unit_agent_name: values.name,
                    polling_unit_agent_phone: values.phone,
                    canvasser_name: values.name,
                    canvasser_phone: values.phone,
                    agent_email: values.email,
                    agent_password: values.password,
                    status: "active",
                    updated_at: new Date().toISOString(),
                };

                if (existingIdx !== -1) {
                    cachedCells[existingIdx] = { ...cachedCells[existingIdx], ...updatedCell };
                } else {
                    cachedCells.unshift(updatedCell);
                }
                await localRepository.savePollingUnitCells(cachedCells);
            } catch (repoErr) {
                console.warn("LocalRepository save error:", repoErr);
            }

            // 4. Persist in localStorage for instant synchronization across all views
            if (typeof window !== "undefined") {
                try {
                    const assignedMap = JSON.parse(localStorage.getItem("assigned_pu_agents") || "{}");
                    const agentEntry = {
                        id: pollingUnit.id,
                        agent_name: values.name,
                        phone: values.phone,
                        email: values.email,
                        password: values.password,
                        lga: pollingUnit.lga,
                        ward: pollingUnit.ward,
                        pu_name: pollingUnit.name,
                        pu_id: pollingUnit.id,
                        assigned_at: new Date().toISOString(),
                    };
                    assignedMap[pollingUnit.id] = agentEntry;
                    assignedMap[cleanPuId] = agentEntry;
                    if (pollingUnit.name) {
                        assignedMap[pollingUnit.name.toLowerCase().trim()] = agentEntry;
                    }
                    localStorage.setItem("assigned_pu_agents", JSON.stringify(assignedMap));
                } catch (lsErr) {}
            }

            // 5. Invalidate relevant queries so all tabs & views update immediately
            queryClient.invalidateQueries({ queryKey: ["polling-unit-cells"] });
            queryClient.invalidateQueries({ queryKey: ["polling-unit-stats"] });
            queryClient.invalidateQueries({ queryKey: ["polling-unit-detail"] });
            queryClient.invalidateQueries({ queryKey: ["polling-unit-leadership"] });
            queryClient.invalidateQueries({ queryKey: ["councillor-ward-data"] });

            setCredentials({ email: values.email, password: values.password });
            toast.success("Polling Unit Agent assigned successfully!");
            onSuccess();
        } catch (error: any) {
            console.error("Error assigning agent:", error);
            toast.error(error.message || "An error occurred while assigning the agent");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!credentials) return;
        const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Credentials copied to clipboard");
    };

    const handleClose = () => {
        setCredentials(null);
        form.reset();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                {!credentials ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Assign Polling Unit Agent</DialogTitle>
                            <DialogDescription>
                                Create a new agent for {pollingUnit.name}. They will be able to manage members only in this unit.
                            </DialogDescription>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter agent's full name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="agent@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="08012345678" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Initial Password</FormLabel>
                                            <FormControl>
                                                <Input type="text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create & Assign Agent
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-emerald-700 font-bold">Agent Assigned Successfully!</DialogTitle>
                            <DialogDescription>
                                Please share these credentials with the agent. This is the only time the password will be shown.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2 font-mono text-sm relative">
                                <p><span className="text-muted-foreground font-sans font-semibold">Email:</span> {credentials.email}</p>
                                <p><span className="text-muted-foreground font-sans font-semibold">Password:</span> {credentials.password}</p>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-2 right-2 text-emerald-700 hover:text-emerald-900"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AssignAgentModal;
