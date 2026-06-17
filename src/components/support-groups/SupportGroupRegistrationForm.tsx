"use client";
import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_STATE, KATSINA_LGAS, getWardsForLga } from "@/lib/campaign-data";
import { Loader2, Eye, EyeOff, UserPlus, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/loose-client";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters"),
  type: z.string().min(1, "Please select a group type"),
  focus_level: z.string().min(1, "Please select geographic focus"),
  description: z.string().optional(),
  state: z.string().default(CAMPAIGN_STATE),
  lga: z.string().optional(),
  ward: z.string().optional(),
  leader_name: z.string().min(2, "Leader name is required"),
  leader_phone: z.string().min(10, "Valid phone number is required"),
  leader_email: z.string().email("Valid email is required").optional().or(z.literal("")),
  member_target: z.string().optional(),
  // Admin credentials
  create_admin: z.boolean().default(false),
  admin_email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  admin_password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  admin_confirm_password: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (data.create_admin) {
    return data.admin_password === data.admin_confirm_password;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["admin_confirm_password"],
}).refine((data) => {
  if (data.create_admin) {
    return data.admin_email && data.admin_email.length > 0;
  }
  return true;
}, {
  message: "Admin email is required when creating admin account",
  path: ["admin_email"],
}).refine((data) => {
  if (data.create_admin) {
    return data.admin_password && data.admin_password.length >= 8;
  }
  return true;
}, {
  message: "Password must be at least 8 characters",
  path: ["admin_password"],
}).refine((data) => {
  if (data.focus_level === 'LGA' || data.focus_level === 'Ward') {
    return !!data.lga && data.lga.length > 0;
  }
  return true;
}, {
  message: "LGA is required for LGA or Ward level focus",
  path: ["lga"],
}).refine((data) => {
  if (data.focus_level === 'Ward') {
    return !!data.ward && data.ward.length > 0;
  }
  return true;
}, {
  message: "Ward is required for Ward level focus",
  path: ["ward"],
});

type FormData = z.infer<typeof formSchema>;

const GROUP_TYPES = [
  { value: "youth_association", label: "Youth Association" },
  { value: "women_group", label: "Women's Group" },
  { value: "professional_body", label: "Professional Body" },
  { value: "traders_association", label: "Traders Association" },
  { value: "community_development", label: "Community Development Union" },
  { value: "religious_group", label: "Religious Organization" },
  { value: "student_union", label: "Student Union" },
  { value: "political_movement", label: "Political Movement" },
  { value: "other", label: "Other" },
];

interface SupportGroupRegistrationFormProps {
  onSuccess?: () => void;
}

export const SupportGroupRegistrationForm = ({ onSuccess }: SupportGroupRegistrationFormProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [availableWards, setAvailableWards] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      state: CAMPAIGN_STATE,
      member_target: "100",
      create_admin: false,
      focus_level: "State",
      lga: "",
      ward: "",
    },
  });

  const focusLevel = useWatch({
    control: form.control,
    name: "focus_level",
  });

  // Watch LGA field to update wards
  const selectedLga = useWatch({
    control: form.control,
    name: "lga",
  });

  const createAdmin = useWatch({
    control: form.control,
    name: "create_admin",
  });

  // Update wards when LGA changes
  useEffect(() => {
    if (selectedLga) {
      const wards = getWardsForLga(selectedLga);
      setAvailableWards(wards);
      // Reset ward when LGA changes
      form.setValue("ward", "");
    } else {
      setAvailableWards([]);
      form.setValue("ward", "");
    }
  }, [selectedLga, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Step 1: Create the support group
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: data.name,
          type: data.type,
          focus_level: data.focus_level,
          description: data.description,
          state: data.state,
          lga: data.lga || null,
          ward: data.ward || null,
          leader_name: data.leader_name,
          leader_email: data.leader_email || data.admin_email,
          leader_phone: data.leader_phone,
          member_target: parseInt(data.member_target || "100"),
          verification_status: "pending",
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(`Failed to create support group: ${orgError.message}`);
      }

      // Step 2: Create admin if requested
      if (data.create_admin && data.admin_email && data.admin_password) {
        try {
          const { data: rpcData, error: rpcError } = await (supabase as any).rpc('create_support_group_admin', {
            org_id: orgData.id,
            admin_email: data.admin_email,
            admin_password: data.admin_password,
            admin_name: data.leader_name,
            admin_phone: data.leader_phone || null
          });

          if (rpcError) throw rpcError;

          // Check if the RPC returned a custom error object
          if (rpcData && !(rpcData as any).success) {
            throw new Error((rpcData as any).error || "Failed to create admin account");
          }

          toast.success("Support group and admin account created successfully!");
        } catch (adminError: any) {
          console.error("Admin creation failed:", adminError);
          toast.warning(`Support group created, but admin creation failed: ${adminError.message}. Please create admin manually.`);
        }
      } else {
        toast.success("Support group created successfully!");
      }

      queryClient.invalidateQueries({ queryKey: ["support-groups"] });
      onSuccess?.();
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register support group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Group Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Group Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Dikko Awareness Forum" {...field} />
                </FormControl>
                <FormDescription>
                  The official name of your support group
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Group Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GROUP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Geographic Focus */}
          <FormField
            control={form.control}
            name="focus_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Geographical Focus *</FormLabel>
                <Select onValueChange={(val) => {
                  field.onChange(val);
                  if (val === "National" || val === "State") {
                    form.setValue("lga", "");
                    form.setValue("ward", "");
                  } else if (val === "LGA") {
                    form.setValue("ward", "");
                  }
                }} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select geographic focus" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="State">State</SelectItem>
                    <SelectItem value="LGA">Local Government Area (LGA)</SelectItem>
                    <SelectItem value="Ward">Ward</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Member Target */}
          <FormField
            control={form.control}
            name="member_target"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Members</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="100" {...field} />
                </FormControl>
                <FormDescription>
                  How many members do you aim to recruit?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* LGA */}
          {(focusLevel === "LGA" || focusLevel === "Ward") && (
            <FormField
              control={form.control}
              name="lga"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LGA *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select LGA" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {KATSINA_LGAS.map((lga) => (
                        <SelectItem key={lga} value={lga}>
                          {lga}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Ward - Now a dropdown based on LGA */}
          {focusLevel === "Ward" && (
            <FormField
              control={form.control}
              name="ward"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!selectedLga || availableWards.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedLga ? "Select Ward" : "Select LGA first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableWards.map((ward) => (
                        <SelectItem key={ward} value={ward}>
                          {ward}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedLga
                      ? `${availableWards.length} wards available`
                      : "Select an LGA first to see available wards"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your group, mission, and activities..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Group Leader Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Group Leader Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="leader_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leader Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name of group leader" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leader_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leader Phone *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 08012345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leader_email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Leader Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Admin Login Credentials Section */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-navy-deep" />
            <h3 className="text-lg font-semibold">Admin Login Credentials</h3>
          </div>

          <FormField
            control={form.control}
            name="create_admin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Create admin account for this support group
                  </FormLabel>
                  <FormDescription>
                    The group leader will be able to log in and manage the group.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {createAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="admin_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email *</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 8 characters"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin_confirm_password"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="btn-action"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              "Register Support Group"
            )}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Your registration will be reviewed and verified by the campaign team.
          You will be notified once approved.
        </p>
      </form>
    </Form>
  );
};
