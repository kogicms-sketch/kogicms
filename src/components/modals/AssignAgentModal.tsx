"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/loose-client";
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

const formSchema = z.z.object({
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

const AssignAgentModal = ({
    isOpen,
    onClose,
    onSuccess,
    councillorId,
    pollingUnit,
}: AssignAgentModalProps) => {
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
            const { data, error } = await supabase.rpc("create_polling_unit_agent" as any, {
                p_councillor_id: councillorId,
                p_polling_unit_id: pollingUnit.id.startsWith('static-') 
                    ? null 
                    : (pollingUnit.id.startsWith('virtual-') 
                        ? pollingUnit.id.replace('virtual-', '') 
                        : pollingUnit.id),
                p_polling_unit_name: pollingUnit.name,
                p_ward: pollingUnit.ward,
                p_lga: pollingUnit.lga,
                p_agent_name: values.name,
                p_email: values.email,
                p_password: values.password,
                p_phone: values.phone,
            });

            if (error) throw error;

            const typedData = data as any;
            if (!typedData.success) {
                throw new Error(typedData.error || "Failed to create agent");
            }

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
                                                <Input placeholder="John Doe" {...field} />
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
                                                <Input placeholder="agent@example.com" type="email" {...field} />
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
                                    <Button type="submit" disabled={isLoading} className="w-full">
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
                            <DialogTitle>Agent Created Successfully!</DialogTitle>
                            <DialogDescription>
                                Please share these credentials with the agent. This is the only time the password will be shown.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-muted rounded-lg space-y-2 font-mono text-sm relative">
                                <p><span className="text-muted-foreground">Email:</span> {credentials.email}</p>
                                <p><span className="text-muted-foreground">Password:</span> {credentials.password}</p>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-2 right-2"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleClose} className="w-full">
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AssignAgentModal;
