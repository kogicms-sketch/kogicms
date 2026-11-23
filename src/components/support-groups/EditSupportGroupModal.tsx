"use client";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_STATE, KOGI_LGAS, getWardsForLga } from "@/lib/campaign-data";
import type { SupportGroupWithStats } from "@/hooks/useSupportGroups";

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

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

interface Props {
  group: SupportGroupWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditSupportGroupModal = ({ group, open, onOpenChange }: Props) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    type: "",
    description: "",
    lga: "",
    ward: "",
    leader_name: "",
    leader_phone: "",
    leader_email: "",
    member_target: "100",
    verification_status: "pending",
  });

  useEffect(() => {
    if (group) {
      setForm({
        name: group.name || "",
        type: group.type || "",
        description: group.description || "",
        lga: group.lga || "",
        ward: group.ward || "",
        leader_name: group.leader_name || "",
        leader_phone: group.leader_phone || "",
        leader_email: group.leader_email || "",
        member_target: String(group.member_target ?? 100),
        verification_status: group.verification_status || "pending",
      });
    }
  }, [group]);

  const wards = form.lga ? getWardsForLga(form.lga) : [];

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!group) throw new Error("No group");
      const { error } = await supabase
        .from("organizations")
        .update({
          name: form.name,
          type: form.type,
          description: form.description || null,
          lga: form.lga,
          ward: form.ward || null,
          leader_name: form.leader_name,
          leader_phone: form.leader_phone,
          leader_email: form.leader_email || null,
          member_target: parseInt(form.member_target || "100"),
          verification_status: form.verification_status,
        })
        .eq("id", group.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-groups"] });
      toast.success("Support group updated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Support Group</DialogTitle>
          <DialogDescription>Update group information and status.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2">
            <Label>Group Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>

          <div>
            <Label>Group Type *</Label>
            <Select value={form.type} onValueChange={(v) => update("type", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {GROUP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Members</Label>
            <Input
              type="number"
              value={form.member_target}
              onChange={(e) => update("member_target", e.target.value)}
            />
          </div>

          <div>
            <Label>LGA *</Label>
            <Select value={form.lga} onValueChange={(v) => { update("lga", v); update("ward", ""); }}>
              <SelectTrigger><SelectValue placeholder="Select LGA" /></SelectTrigger>
              <SelectContent>
                {KOGI_LGAS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ward</Label>
            <Select
              value={form.ward}
              onValueChange={(v) => update("ward", v)}
              disabled={!form.lga || wards.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.lga ? "Select Ward" : "Select LGA first"} />
              </SelectTrigger>
              <SelectContent>
                {wards.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              className="min-h-[90px]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div>
            <Label>Leader Name *</Label>
            <Input value={form.leader_name} onChange={(e) => update("leader_name", e.target.value)} />
          </div>

          <div>
            <Label>Leader Phone *</Label>
            <Input value={form.leader_phone} onChange={(e) => update("leader_phone", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Leader Email</Label>
            <Input
              type="email"
              value={form.leader_email}
              onChange={(e) => update("leader_email", e.target.value)}
            />
          </div>

          <div>
            <Label>Verification Status</Label>
            <Select value={form.verification_status} onValueChange={(v) => update("verification_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>State</Label>
            <Input value={CAMPAIGN_STATE} disabled />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.type || !form.lga || !form.leader_name || !form.leader_phone}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
