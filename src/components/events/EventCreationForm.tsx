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
import { useCreateCampaignEvent, EVENT_TYPE_LABELS } from "@/hooks/useCampaignEvents";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";
import { KATSINA_LGAS, getWardsForLga, CAMPAIGN_STATE } from "@/lib/campaign-data";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(3, "Event title is required"),
  type: z.string().min(1, "Please select event type"),
  description: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  lga: z.string().min(1, "Please select an LGA"),
  ward: z.string().optional(),
  scheduled_date: z.string().min(1, "Date is required"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.string().default("planned"),
  expected_attendees: z.string().default("100"),
  notes: z.string().optional(),
  organization_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EventCreationFormProps {
  onSuccess?: () => void;
}

export const EventCreationForm = ({ onSuccess }: EventCreationFormProps) => {
  const createEvent = useCreateCampaignEvent();
  const { role, organizationId: contextOrganizationId } = useAuth();
  const { data: organizations } = useOrganizations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSuperAdmin = role === "super_admin";
  const [availableWards, setAvailableWards] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "planned",
      expected_attendees: "100",
      organization_id: isSuperAdmin ? undefined : contextOrganizationId || undefined,
    },
  });

  // Watch LGA field
  const selectedLga = useWatch({
    control: form.control,
    name: "lga",
  });

  // Update wards when LGA changes
  useEffect(() => {
    if (selectedLga) {
      const wards = getWardsForLga(selectedLga);
      setAvailableWards(wards);
      // Only clear ward if it's no longer in the list or if we're switching LGAs
      // but to be safe and consistent with other forms:
      form.setValue("ward", "");
    } else {
      setAvailableWards([]);
      form.setValue("ward", "");
    }
  }, [selectedLga, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const orgId = isSuperAdmin ? data.organization_id : contextOrganizationId;

      if (!orgId) {
        toast.error("Organization is required");
        setIsSubmitting(false);
        return;
      }

      await createEvent.mutateAsync({
        title: data.title,
        type: data.type,
        description: data.description,
        location: data.location,
        lga: data.lga,
        ward: data.ward,
        scheduled_date: data.scheduled_date,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status,
        expected_attendance: parseInt(data.expected_attendees || "100"),
        notes: data.notes,
        organization_id: orgId,
        state: CAMPAIGN_STATE,
      });
      onSuccess?.();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Event Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Event Title *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Katsina Central Mega Rally" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Organization Select - Super Admin Only */}
          {isSuperAdmin && (
            <FormField
              control={form.control}
              name="organization_id"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Organization *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Event Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="planned">📋 Planned</SelectItem>
                    <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                    <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                    <SelectItem value="completed">✓ Completed</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date */}
          <FormField
            control={form.control}
            name="scheduled_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Time */}
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* LGA */}
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
                      <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Ward */}
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Expected Attendees */}
          <FormField
            control={form.control}
            name="expected_attendees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Attendees</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Time */}
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Katsina Township Stadium" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the event, agenda, and any important details..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes, logistics, requirements..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
