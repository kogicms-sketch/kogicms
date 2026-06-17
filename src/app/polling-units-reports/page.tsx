"use client";

import dynamic from "next/dynamic";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const PollingUnitReports = dynamic(
  () => import("@/views/PollingUnitReports"),
  { ssr: false }
);

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["super_admin","lga_chairman","councillor"]}>
      <PollingUnitReports />
    </ProtectedRoute>
  );
}
