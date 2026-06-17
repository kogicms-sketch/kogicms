"use client";
import { useState, useEffect } from "react";
import { X, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KATSINA_LGAS, getWardsForLga, getPollingUnitObjects } from "@/lib/campaign-data";
import { useUpdateMember, MemberWithOrganization } from "@/hooks/useMembers";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberWithOrganization;
}

const MEMBER_ROLES = [
  { value: "coordinator", label: "Coordinator" },
  { value: "secretary", label: "Secretary" },
  { value: "treasurer", label: "Treasurer" },
  { value: "mobilizer", label: "Mobilizer" },
  { value: "field_officer", label: "Field Officer" },
  { value: "member", label: "Member" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const EditMemberModal = ({ isOpen, onClose, member }: EditMemberModalProps) => {
  const { role } = useAuth();
  const { data: userOrg } = useUserOrganization();
  const isSuperAdmin = role === "super_admin";

  // Parse name into first and last
  const [firstName, ...lastNameParts] = member.full_name.split(" ");
  const lastName = lastNameParts.join(" ");

  const [formData, setFormData] = useState({
    firstName: firstName || "",
    lastName: lastName || "",
    email: member.email || "",
    phone: member.phone || "",
    role: member.role || "",
    organizationId: member.organization_id || "",
    lga: member.lga || "",
    ward: member.ward || "",
    gender: member.gender || "",
    dateOfBirth: member.date_of_birth || "",
    votersCardId: member.voters_card_id || "",
    pollingUnit: member.polling_unit || "",
  });

  const [votersCardFile, setVotersCardFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Sync state with member prop if it changes while open
  useEffect(() => {
    if (isOpen && member) {
      const [fName, ...lNameParts] = member.full_name.split(" ");
      setFormData({
        firstName: fName || "",
        lastName: lNameParts.join(" ") || "",
        email: member.email || "",
        phone: member.phone || "",
        role: member.role || "",
        organizationId: member.organization_id || "",
        lga: member.lga || "",
        ward: member.ward || "",
        gender: member.gender || "",
        dateOfBirth: member.date_of_birth || "",
        votersCardId: member.voters_card_id || "",
        pollingUnit: member.polling_unit || "",
      });
      setVotersCardFile(null);
    }
  }, [isOpen, member]);


  const updateMember = useUpdateMember();
  const { data: organizations = [] } = useOrganizations();
  const wards = formData.lga ? getWardsForLga(formData.lga) : [];

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setVotersCardFile(file);
    }
  };

  const uploadVotersCard = async (memberId: string): Promise<string | null> => {
    if (!votersCardFile) return null;

    const fileExt = votersCardFile.name.split(".").pop();
    const fileName = `${memberId}-${Date.now()}.${fileExt}`; // Add timestamp to avoid caching issues

    // Ensure we have a valid folder path (required by storage policy)
    const folder = formData.organizationId || 'default';
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("voter-cards")
      .upload(filePath, votersCardFile, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Failed to upload voter card image: " + uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("voter-cards")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let voters_card_image_url = member.voters_card_image_url;

      // Upload voter card if provided
      if (votersCardFile) {
        const imageUrl = await uploadVotersCard(member.id);
        if (imageUrl) {
          voters_card_image_url = imageUrl;
        }
      }

      const memberUpdates = {
        id: member.id,
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role || null,
        organization_id: formData.organizationId || null,
        lga: formData.lga || null,
        ward: formData.ward || null,
        gender: formData.gender || null,
        date_of_birth: formData.dateOfBirth || null,
        voters_card_id: formData.votersCardId || null,
        voters_card_image_url: voters_card_image_url,
        polling_unit: formData.pollingUnit || null,
      };

      await updateMember.mutateAsync(memberUpdates);

      onClose();
      // Reset is handled by useEffect on next open or can be left as is since we close
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30 sticky top-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">Edit Member Details</h2>
            <p className="text-sm text-muted-foreground">Update information for {member.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <input
                required
                className="input-premium w-full"
                placeholder="e.g. Abdullahi"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <input
                required
                className="input-premium w-full"
                placeholder="e.g. Musa"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gender</label>
              <select
                required
                className="input-premium w-full"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Birth</label>
              <input
                type="date"
                required
                className="input-premium w-full"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <input
                required
                className="input-premium w-full"
                placeholder="+234..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email (Optional)</label>
              <input
                type="email"
                className="input-premium w-full"
                placeholder="name@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Voters Card ID</label>
            <input
              className="input-premium w-full"
              placeholder="e.g. 1234567890"
              value={formData.votersCardId}
              onChange={(e) => setFormData({ ...formData, votersCardId: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Voters Card Image
              {member.voters_card_image_url && !votersCardFile && (
                <span className="ml-2 text-xs text-muted-foreground">(Current image will be kept if not changed)</span>
              )}
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {votersCardFile ? votersCardFile.name : "Click to upload new image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {votersCardFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVotersCardFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {isSuperAdmin ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <select
                required
                className="input-premium w-full"
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
              >
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <input
                className="input-premium w-full bg-muted"
                value={userOrg?.name || "Loading..."}
                disabled
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              className="input-premium w-full"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="">Select Role</option>
              {MEMBER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">LGA</label>
              <select
                required
                className="input-premium w-full"
                value={formData.lga}
                onChange={(e) => setFormData({ ...formData, lga: e.target.value, ward: "", pollingUnit: "" })}
              >
                <option value="">Select LGA</option>
                {KATSINA_LGAS.map((lga) => (
                  <option key={lga} value={lga}>{lga}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ward</label>
              <select
                disabled={!formData.lga}
                className="input-premium w-full disabled:opacity-50"
                value={formData.ward}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value, pollingUnit: "" })}
              >
                <option value="">Select Ward</option>
                {wards.map((ward) => (
                  <option key={ward} value={ward}>{ward}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Polling Unit (Optional)</label>
            <select
              disabled={!formData.ward}
              className="input-premium w-full disabled:opacity-50"
              value={formData.pollingUnit}
              onChange={(e) => setFormData({ ...formData, pollingUnit: e.target.value })}
            >
              <option value="">Select Polling Unit</option>
              {formData.ward && getPollingUnitObjects(formData.lga, formData.ward).map((pu) => (
                <option key={pu.code} value={pu.name}>
                  {pu.name} ({pu.code})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="btn-command" disabled={updateMember.isPending || uploading}>
              {(updateMember.isPending || uploading) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
