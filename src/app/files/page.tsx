"use client";

import Component from "@/views/org-admin/FileManager";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["super_admin","org_admin"]}>
      <Component />
    </ProtectedRoute>
  );
}
