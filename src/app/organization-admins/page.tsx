"use client";

import Component from "@/views/super-admin/OrganizationAdmins";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["super_admin","lga_chairman"]}>
      <Component />
    </ProtectedRoute>
  );
}
