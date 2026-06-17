"use client";

import Component from "@/views/super-admin/TargetManagement";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["super_admin"]}>
      <Component />
    </ProtectedRoute>
  );
}
