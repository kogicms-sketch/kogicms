"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";
import { useCreateMaterialRequest } from "@/hooks/useCampaignEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface RequestMaterialModalProps {
  supportGroupId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RequestMaterialModal({
  supportGroupId,
  isOpen,
  onOpenChange,
  onSuccess
}: RequestMaterialModalProps) {
  const { user } = useAuth();
  const createRequestMutation = useCreateMaterialRequest();

  // Form State
  const [itemType, setItemType] = useState("Campaign T-Shirts");
  const [customItemType, setCustomItemType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch current user's profile for requester name/phone and group LGA/Ward details
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, lga, ward")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch support group info to get its LGA/Ward
  const { data: group } = useQuery({
    queryKey: ["support-group-info", supportGroupId],
    queryFn: async () => {
      if (!supportGroupId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("lga, ward")
        .eq("id", supportGroupId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!supportGroupId
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedItem = itemType === "Other" ? customItemType : itemType;
    if (!selectedItem || !quantity) return;

    try {
      const payload = {
        support_group_id: supportGroupId,
        requester_id: user?.id,
        requester_name: profile?.full_name || user?.email || "Support Group Leader",
        requester_phone: profile?.phone || "",
        lga: group?.lga || profile?.lga || "",
        ward: group?.ward || profile?.ward || "",
        materials: { [selectedItem]: parseInt(quantity) },
        notes: notes,
        status: "pending"
      };

      await createRequestMutation.mutateAsync(payload);
      
      // Reset form
      setItemType("Campaign T-Shirts");
      setCustomItemType("");
      setQuantity("");
      setNotes("");
      
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      // Toast shown by hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Campaign Materials</DialogTitle>
          <DialogDescription>
            Submit a request for supplies or funding to your assigned candidate campaign.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Material Type / Item</label>
            <select
              className="w-full border rounded-md p-2 bg-background text-sm"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            >
              <option value="Campaign T-Shirts">Campaign T-Shirts</option>
              <option value="Campaign Caps">Campaign Caps</option>
              <option value="Flyers & Leaflets">Flyers & Leaflets</option>
              <option value="Banners & Posters">Banners & Posters</option>
              <option value="Megaphones & PA systems">Megaphones & PA systems</option>
              <option value="Cash / Financial Support">Cash / Financial Support</option>
              <option value="Other">Other / Custom Item</option>
            </select>
          </div>

          {itemType === "Other" && (
            <div className="space-y-2 animate-scale-in">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Custom Item Name</label>
              <Input
                required
                placeholder="e.g. Campaign Handbills"
                value={customItemType}
                onChange={(e) => setCustomItemType(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Requested Quantity</label>
            <Input
              required
              type="number"
              min="1"
              placeholder="e.g. 200"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Justification / notes</label>
            <Textarea
              required
              placeholder="Provide context on where and how these materials will be used for campaign mobilization."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-navy-deep text-white bg-gradient-to-r hover:opacity-95 transition-opacity"
            disabled={createRequestMutation.isPending}
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Submitting Request...
              </>
            ) : (
              "Submit Material Request"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
