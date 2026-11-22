"use client";
import { useState } from "react";
import { X, Check, Loader2, Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KOGI_LGAS, getWardsForLga, getPollingUnitsForWard } from "@/lib/campaign-data";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ORGANIZATION_TYPES = [
  { value: "youth", label: "Youth Group" },
  { value: "women", label: "Women Group" },
  { value: "professionals", label: "Professionals" },
  { value: "grassroots", label: "Grassroots Mobilization" },
  { value: "community", label: "Community Leaders" },
  { value: "diaspora", label: "Diaspora" },
];

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const CreateOrganizationModal = ({ isOpen, onClose }: CreateOrganizationModalProps) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    state: "Kogi",
    lga: "",
    ward: "",
    polling_unit: "",
    leader_name: "",
    leader_phone: "",
    // Admin credentials
    admin_email: "",
    admin_password: "",
    admin_confirm_password: "",
  });

  const wards = formData.lga ? getWardsForLga(formData.lga) : [];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate admin email
    const emailResult = emailSchema.safeParse(formData.admin_email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    // Validate admin password
    const passwordResult = passwordSchema.safeParse(formData.admin_password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    // Check passwords match
    if (formData.admin_password !== formData.admin_confirm_password) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          state: formData.state,
          lga: formData.lga || null,
          ward: formData.ward || null,
          leader_name: formData.leader_name,
          leader_email: formData.admin_email,
          leader_phone: formData.leader_phone || null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      // Create Admin via RPC
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('create_support_group_admin', {
        org_id: orgData.id,
        admin_email: formData.admin_email,
        admin_password: formData.admin_password,
        admin_name: formData.leader_name,
        admin_phone: formData.leader_phone || null
      });

      if (rpcError) throw rpcError;

      if (rpcData && !(rpcData as any).success) {
        throw new Error((rpcData as any).error || "Failed to create admin account");
      }

      toast.success("Organization and admin account created successfully");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });

      onClose();
      setFormData({
        name: "",
        type: "",
        description: "",
        state: "Kogi",
        lga: "",
        ward: "",
        polling_unit: "",
        leader_name: "",
        leader_phone: "",
        admin_email: "",
        admin_password: "",
        admin_confirm_password: "",
      });
    } catch (err: any) {
      console.error("Error creating organization:", err);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Organization</h2>
            <p className="text-sm text-muted-foreground">Add a new campaign organization with admin access</p>
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization Name</label>
            <input
              required
              className="input-premium w-full"
              placeholder="e.g. Youth Coalition Network"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              required
              className="input-premium w-full"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="">Select Type</option>
              {ORGANIZATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <textarea
              className="input-premium w-full min-h-[80px]"
              placeholder="Brief description of the organization..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <input
                readOnly
                className="input-premium w-full bg-muted/50"
                value="Kogi"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">LGA</label>
              <select
                className="input-premium w-full"
                value={formData.lga}
                onChange={(e) => setFormData({ ...formData, lga: e.target.value, ward: "" })}
              >
                <option value="">Select LGA</option>
                {KOGI_LGAS.map((lga) => (
                  <option key={lga} value={lga}>{lga}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ward (Optional)</label>
            <select
              className="input-premium w-full"
              value={formData.ward}
              onChange={(e) => setFormData({ ...formData, ward: e.target.value, polling_unit: "" })}
              disabled={!formData.lga}
            >
              <option value="">Select Ward</option>
              {wards.map((ward) => (
                <option key={ward} value={ward}>{ward}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Polling Unit (Optional)</label>
            <select
              className="input-premium w-full"
              value={formData.polling_unit}
              onChange={(e) => setFormData({ ...formData, polling_unit: e.target.value })}
              disabled={!formData.ward}
            >
              <option value="">Select Polling Unit</option>
              {getPollingUnitsForWard(formData.lga, formData.ward).map((pu) => (
                <option key={pu} value={pu}>{pu}</option>
              ))}
            </select>
          </div>

          {/* Admin Credentials Section */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-navy-deep" />
              <h3 className="text-sm font-semibold text-foreground">Admin Login Credentials</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Create login credentials for the organization admin. They will use these to access the campaign system.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Full Name</label>
                <input
                  required
                  className="input-premium w-full"
                  placeholder="Full name"
                  value={formData.leader_name}
                  onChange={(e) => setFormData({ ...formData, leader_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Email</label>
                  <input
                    required
                    type="email"
                    className="input-premium w-full"
                    placeholder="admin@example.com"
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone (Optional)</label>
                  <input
                    className="input-premium w-full"
                    placeholder="+234..."
                    value={formData.leader_phone}
                    onChange={(e) => setFormData({ ...formData, leader_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className="input-premium w-full pr-10"
                    placeholder="Min 8 characters"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    className="input-premium w-full pr-10"
                    placeholder="Confirm password"
                    value={formData.admin_confirm_password}
                    onChange={(e) => setFormData({ ...formData, admin_confirm_password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="btn-command" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Create Organization
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
