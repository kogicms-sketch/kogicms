"use client";

import Component from "@/views/assembly/AssemblyDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["house_assembly_member"]}>
      <Component />
    </ProtectedRoute>
  );
}
