"use client";

import Component from "@/views/Chat";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["super_admin","org_admin","lga_chairman","councillor","senatorial_leader","federal_rep","house_assembly_member"]}>
      <Component />
    </ProtectedRoute>
  );
}
