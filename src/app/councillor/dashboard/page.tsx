"use client";

import Component from "@/views/councillor/CouncillorDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["councillor"]}>
      <Component />
    </ProtectedRoute>
  );
}
