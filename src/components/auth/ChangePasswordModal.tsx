"use client";

import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Lock, Eye, EyeOff } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update in local mock_users if present
      if (typeof window !== "undefined") {
        try {
          const rawMock = localStorage.getItem("mock_users");
          const authEmail = localStorage.getItem("auth_email");
          const { data: { user } } = await supabase.auth.getUser();
          const targetEmail = (user?.email || authEmail || "").toLowerCase().trim();

          if (rawMock && targetEmail) {
            const list = JSON.parse(rawMock);
            const foundIdx = list.findIndex((u: any) => u.email?.toLowerCase().trim() === targetEmail);
            if (foundIdx !== -1) {
              list[foundIdx].password = newPassword;
              list[foundIdx].must_change_password = false;
              localStorage.setItem("mock_users", JSON.stringify(list));
            }
          }

          // Update cached profiles if present
          const senProfile = localStorage.getItem("senatorial_leader_profile");
          if (senProfile) {
            const parsed = JSON.parse(senProfile);
            parsed.must_change_password = false;
            localStorage.setItem("senatorial_leader_profile", JSON.stringify(parsed));
          }
          const fedProfile = localStorage.getItem("federal_rep_profile");
          if (fedProfile) {
            const parsed = JSON.parse(fedProfile);
            parsed.must_change_password = false;
            localStorage.setItem("federal_rep_profile", JSON.stringify(parsed));
          }
          const chairProfile = localStorage.getItem("chairman_profile");
          if (chairProfile) {
            const parsed = JSON.parse(chairProfile);
            parsed.must_change_password = false;
            localStorage.setItem("chairman_profile", JSON.stringify(parsed));
          }
          const councProfile = localStorage.getItem("councillor_profile");
          if (councProfile) {
            const parsed = JSON.parse(councProfile);
            parsed.must_change_password = false;
            localStorage.setItem("councillor_profile", JSON.stringify(parsed));
          }
        } catch (e) {}
      }

      // 2. Try Supabase Auth update if user is authenticated with Supabase
      try {
        await supabase.auth.updateUser({
          password: newPassword,
        });
      } catch (sbErr) {}

      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err: any) {
      toast.error("An error occurred while updating password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2 text-emerald-600">
            <KeyRound className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Change Password
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Enter your new password to secure your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9 pr-10 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 pr-10 text-sm"
                required
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >
              {loading ? "Updating..." : "Save Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
