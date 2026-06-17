"use client";

import Component from "@/views/federal/FederalRepDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["federal_rep"]}>
      <Component />
    </ProtectedRoute>
  );
}
