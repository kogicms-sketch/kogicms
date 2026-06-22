"use client";
import { useState, useEffect } from "react";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
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
import { Card, CardContent } from "@/components/ui/card";
import { CAMPAIGN_STATE, KATSINA_LGAS, getWardsForLga, getConstituencyForLga } from "@/lib/campaign-data";
import { Loader2, Eye, EyeOff, UserPlus, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/loose-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";

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
  // Candidate alignments (1 to 3)
  alignments: z.array(z.object({
    candidate_race: z.enum(['governorship', 'senatorial', 'house_of_reps', 'state_assembly', 'lga_chairman'], { required_error: "Please select a candidate race" }),
    candidate_id: z.string().optional().nullable(),
    senatorial_zone: z.string().optional().nullable(),
    federal_constituency: z.string().optional().nullable(),
    lga: z.string().optional().nullable(),
  })).min(1, "At least one candidate alignment is required").max(3, "Maximum of 3 alignments allowed"),
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
}).refine((data) => {
  // Validate candidate choice for non-governorship races
  for (let i = 0; i < data.alignments.length; i++) {
    const align = data.alignments[i];
    if (align.candidate_race !== 'governorship' && (!align.candidate_id || align.candidate_id.length === 0)) {
      return false;
    }
  }
  return true;
}, {
  message: "Candidate choice is required for each alignment",
  path: ["alignments"],
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

  const { user } = useAuth();

  // Fetch candidate pools
  const { data: senatorialCandidates } = useQuery({
    queryKey: ["senatorial-leaders-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senatorial_leaders")
        .select("user_id, leader_name, zone_name, zone_code, lga_list");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const { data: federalRepCandidates } = useQuery({
    queryKey: ["federal-reps-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("federal_reps")
        .select("user_id, rep_name, constituency_name, constituency_code, lga_list");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const { data: assemblyCandidates } = useQuery({
    queryKey: ["house-assembly-members-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("house_assembly_members")
        .select("user_id, member_name, lga");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const { data: chairmanCandidates } = useQuery({
    queryKey: ["lga-chairmen-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lga_chairmen")
        .select("user_id, chairman_name, lga");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      state: CAMPAIGN_STATE,
      member_target: "100",
      create_admin: false,
      focus_level: "State",
      lga: "",
      ward: "",
      alignments: [
        {
          candidate_race: "governorship",
          candidate_id: "",
          senatorial_zone: "",
          federal_constituency: "",
          lga: "",
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "alignments"
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

  const handleCandidateChange = (index: number, candId: string) => {
    const race = form.getValues(`alignments.${index}.candidate_race`);
    form.setValue(`alignments.${index}.candidate_id`, candId);
    
    if (race === 'senatorial') {
      const match = senatorialCandidates?.find(c => c.user_id === candId);
      if (match) {
        form.setValue(`alignments.${index}.senatorial_zone`, match.zone_name);
        form.setValue(`alignments.${index}.federal_constituency`, "");
        form.setValue(`alignments.${index}.lga`, "");
      }
    } else if (race === 'house_of_reps') {
      const match = federalRepCandidates?.find(c => c.user_id === candId);
      if (match) {
        form.setValue(`alignments.${index}.federal_constituency`, match.constituency_name);
        form.setValue(`alignments.${index}.lga`, "");
        // Find Senatorial Zone from first LGA in constituent list
        if (match.lga_list && match.lga_list.length > 0) {
          const mapped = getConstituencyForLga(match.lga_list[0]);
          if (mapped) {
            form.setValue(`alignments.${index}.senatorial_zone`, mapped.senatorial_zone);
          }
        }
      }
    } else if (race === 'state_assembly') {
      const match = assemblyCandidates?.find(c => c.user_id === candId);
      if (match) {
        form.setValue(`alignments.${index}.lga`, match.lga);
        const mapped = getConstituencyForLga(match.lga);
        if (mapped) {
          form.setValue(`alignments.${index}.senatorial_zone`, mapped.senatorial_zone);
          form.setValue(`alignments.${index}.federal_constituency`, mapped.federal_constituency);
        }
      }
    } else if (race === 'lga_chairman') {
      const match = chairmanCandidates?.find(c => c.user_id === candId);
      if (match) {
        form.setValue(`alignments.${index}.lga`, match.lga);
        const mapped = getConstituencyForLga(match.lga);
        if (mapped) {
          form.setValue(`alignments.${index}.senatorial_zone`, mapped.senatorial_zone);
          form.setValue(`alignments.${index}.federal_constituency`, mapped.federal_constituency);
        }
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const firstAlign = data.alignments[0];
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
          candidate_race: firstAlign.candidate_race,
          candidate_id: firstAlign.candidate_race === 'governorship' ? null : firstAlign.candidate_id || null,
          senatorial_zone: firstAlign.senatorial_zone || null,
          federal_constituency: firstAlign.federal_constituency || null,
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(`Failed to create support group: ${orgError.message}`);
      }

      // Step 1.5: Save alignments to support_group_candidate_alignments
      const alignmentsToInsert = data.alignments.map(align => ({
        organization_id: orgData.id,
        candidate_id: align.candidate_race === 'governorship' ? null : align.candidate_id || null,
        candidate_race: align.candidate_race,
        senatorial_zone: align.senatorial_zone || null,
        federal_constituency: align.federal_constituency || null,
        lga: align.lga || null,
      }));

      const { error: alignError } = await supabase
        .from("support_group_candidate_alignments")
        .insert(alignmentsToInsert);

      if (alignError) {
        throw new Error(`Failed to save candidate alignments: ${alignError.message}`);
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

        </div>

        {/* Candidate Alignments Section */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-navy-deep">Candidate Alignments</h3>
              <p className="text-xs text-muted-foreground">Select between 1 and 3 campaigns this group actively drives</p>
            </div>
            {fields.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({
                  candidate_race: "governorship",
                  candidate_id: "",
                  senatorial_zone: "",
                  federal_constituency: "",
                  lga: "",
                })}
                className="text-xs font-semibold"
              >
                + Add Alignment
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const alignRace = form.watch(`alignments.${index}.candidate_race`);
              const alignZone = form.watch(`alignments.${index}.senatorial_zone`);
              const alignConst = form.watch(`alignments.${index}.federal_constituency`);
              const alignLga = form.watch(`alignments.${index}.lga`);
              const alignId = form.watch(`alignments.${index}.candidate_id`);
              
              return (
                <Card key={field.id} className="p-4 border border-border relative bg-card shadow-sm">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="absolute right-2 top-2 text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </Button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Race Select */}
                    <FormField
                      control={form.control}
                      name={`alignments.${index}.candidate_race`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Alignment #{index + 1} *</FormLabel>
                          <Select onValueChange={(val: any) => {
                            field.onChange(val);
                            form.setValue(`alignments.${index}.candidate_id`, "");
                            form.setValue(`alignments.${index}.senatorial_zone`, "");
                            form.setValue(`alignments.${index}.federal_constituency`, "");
                            form.setValue(`alignments.${index}.lga`, "");
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select campaign alignment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="governorship">Governor Campaign</SelectItem>
                              <SelectItem value="senatorial">Senatorial Campaign</SelectItem>
                              <SelectItem value="house_of_reps">House of Reps Campaign</SelectItem>
                              <SelectItem value="state_assembly">State Assembly Campaign</SelectItem>
                              <SelectItem value="lga_chairman">LGA Chairman Campaign</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Candidate Select */}
                    {alignRace !== "governorship" && (
                      <FormField
                        control={form.control}
                        name={`alignments.${index}.candidate_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Candidate *</FormLabel>
                            <Select 
                              onValueChange={(val) => {
                                field.onChange(val);
                                handleCandidateChange(index, val);
                              }} 
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose candidate" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {alignRace === "senatorial" && senatorialCandidates?.map((c) => (
                                  <SelectItem key={c.user_id} value={c.user_id}>
                                    {c.leader_name} ({c.zone_name})
                                  </SelectItem>
                                ))}
                                {alignRace === "house_of_reps" && federalRepCandidates?.map((c) => (
                                  <SelectItem key={c.user_id} value={c.user_id}>
                                    {c.rep_name} ({c.constituency_name})
                                  </SelectItem>
                                ))}
                                {alignRace === "state_assembly" && assemblyCandidates?.map((c) => (
                                  <SelectItem key={c.user_id} value={c.user_id}>
                                    {c.member_name} ({c.lga} Assembly)
                                  </SelectItem>
                                ))}
                                {alignRace === "lga_chairman" && chairmanCandidates?.map((c) => (
                                  <SelectItem key={c.user_id} value={c.user_id}>
                                    {c.chairman_name} ({c.lga} Chairman)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Auto-tagging Indicator */}
                  {alignRace !== "governorship" && (alignZone || alignConst || alignLga) && (
                    <div className="mt-3 p-2 bg-[hsl(var(--apc-green))]/10 border border-[hsl(var(--apc-green))]/20 rounded text-xs text-[hsl(var(--apc-green))] flex items-start gap-1">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold">Auto-tagging:</span> Group aligned to{" "}
                        {alignZone && <span className="font-semibold">{alignZone} Senatorial Zone</span>}
                        {alignConst && <span className="font-semibold">, {alignConst} Federal Constituency</span>}
                        {alignLga && <span className="font-semibold">, {alignLga} LGA</span>}.
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
