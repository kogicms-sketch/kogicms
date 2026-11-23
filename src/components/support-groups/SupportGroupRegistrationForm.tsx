"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { CAMPAIGN_STATE, KOGI_LGAS, getWardsForLga } from "@/lib/campaign-data";
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useParty } from "@/contexts/PartyContext";
import { supabase } from "@/integrations/supabase/loose-client";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { saveLocalSupportGroup, LOCAL_STORAGE_SG_ADMINS_KEY } from "@/hooks/useSupportGroups";

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
  const router = useRouter();
  const { partyId } = useParty();
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
      description: "",
      leader_name: "",
      leader_phone: "",
      leader_email: "",
      admin_email: "",
      admin_password: "",
      admin_confirm_password: "",
    },
  });

  const focusLevel = useWatch({
    control: form.control,
    name: "focus_level",
  });

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
      form.setValue("ward", "");
    } else {
      setAvailableWards([]);
      form.setValue("ward", "");
    }
  }, [selectedLga, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const newGroupId = `sg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newGroupData = {
        id: newGroupId,
        name: data.name,
        type: data.type,
        focus_level: data.focus_level,
        description: data.description || "",
        state: data.state || CAMPAIGN_STATE,
        lga: data.lga || null,
        ward: data.ward || null,
        leader_name: data.leader_name,
        leader_email: data.leader_email || data.admin_email || null,
        leader_phone: data.leader_phone,
        member_target: parseInt(data.member_target || "100"),
        verification_status: "verified",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        kpi_score: 85,
        social_media_score: 60,
        member_count: 0,
        activities_count: 0,
      };

      // 1. Save to local storage for instant offline/online access
      const savedGroup = saveLocalSupportGroup(newGroupData);

      // 2. If admin account is requested, save credentials
      if (data.create_admin && data.admin_email && data.admin_password) {
        if (typeof window !== "undefined") {
          try {
            const rawAdmins = localStorage.getItem(LOCAL_STORAGE_SG_ADMINS_KEY);
            const adminsList = rawAdmins ? JSON.parse(rawAdmins) : [];
            adminsList.push({
              id: `admin_${Date.now()}`,
              organization_id: savedGroup.id,
              user_id: `user_${Date.now()}`,
              email: data.admin_email,
              name: data.leader_name,
              phone: data.leader_phone,
              role: "org_admin",
              created_at: new Date().toISOString(),
            });
            localStorage.setItem(LOCAL_STORAGE_SG_ADMINS_KEY, JSON.stringify(adminsList));

            // Also add to mock_users for instant login capability
            const rawMock = localStorage.getItem("mock_users");
            const mockUsers = rawMock ? JSON.parse(rawMock) : [];
            mockUsers.push({
              id: `user_${Date.now()}`,
              email: data.admin_email.toLowerCase().trim(),
              password: data.admin_password,
              full_name: data.leader_name,
              role: "org_admin",
              organization_id: savedGroup.id,
              state: data.state || CAMPAIGN_STATE,
              lga: data.lga || null,
              ward: data.ward || null,
            });
            localStorage.setItem("mock_users", JSON.stringify(mockUsers));
          } catch (e) {
            console.warn("Could not save admin credentials to local cache:", e);
          }
        }
      }

      // 3. Resilient background sync to Supabase (timeout after 1.2s to prevent UI hang)
      const timeoutSync = new Promise<void>((resolve) => setTimeout(resolve, 1200));
      const syncSupabase = async () => {
        try {
          await supabase
            .from("organizations")
            .insert({
              id: savedGroup.id,
              name: data.name,
              type: data.type,
              focus_level: data.focus_level,
              description: data.description,
              state: data.state,
              lga: data.lga || null,
              ward: data.ward || null,
              leader_name: data.leader_name,
              leader_email: data.leader_email || data.admin_email || null,
              leader_phone: data.leader_phone,
              member_target: parseInt(data.member_target || "100"),
              verification_status: "verified",
              category: "support_group",
            });

          if (data.create_admin && data.admin_email && data.admin_password) {
            await supabase.auth.signUp({
              email: data.admin_email,
              password: data.admin_password,
              options: {
                data: {
                  full_name: data.leader_name,
                  role: "org_admin",
                  organization_id: savedGroup.id,
                  state: data.state || CAMPAIGN_STATE,
                  lga: data.lga || null,
                  ward: data.ward || null,
                }
              }
            });
          }
        } catch (e) {
          console.warn("Background Supabase insert skipped:", e);
        }
      };

      await Promise.race([syncSupabase(), timeoutSync]);

      queryClient.invalidateQueries({ queryKey: ["support-groups"] });
      queryClient.invalidateQueries({ queryKey: ["user-organization"] });
      toast.success(`Support group "${data.name}" registered successfully!`);
      
      onSuccess?.();
      
      // Navigate directly to the real Support Group Dashboard
      router.push(`/support-groups/detail?id=${savedGroup.id}`);
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
                  <Input 
                    placeholder="e.g., Grassroots Development Forum" 
                    {...field} 
                  />
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
                      {KOGI_LGAS.map((lga) => (
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

          {/* Ward - dropdown based on LGA */}
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
                      ? `${availableWards.length} wards available in ${selectedLga}`
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
                  className="min-h-[90px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Group Leader Information */}
        <div className="border-t pt-5">
          <h3 className="text-base font-semibold mb-3">Group Leader Information</h3>

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
        <div className="border-t pt-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold">Admin Login Credentials</h3>
          </div>

          <FormField
            control={form.control}
            name="create_admin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3.5 mb-3 bg-muted/20">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    Create admin account for this support group
                  </FormLabel>
                  <FormDescription>
                    The group leader will be able to log into the Support Group Command Center.
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
        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="btn-action bg-[hsl(var(--apc-green))] hover:bg-[hsl(var(--apc-green))]/90 text-white font-semibold"
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
      </form>
    </Form>
  );
};
