"use client";

import Component from "@/views/senatorial/SenatorialDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["senatorial_leader"]}>
      <Component />
    </ProtectedRoute>
  );
}
