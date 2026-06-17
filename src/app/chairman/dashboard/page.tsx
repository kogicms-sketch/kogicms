"use client";

import Component from "@/views/chairman/ChairmanDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["lga_chairman"]}>
      <Component />
    </ProtectedRoute>
  );
}
