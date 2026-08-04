"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import StudentDashboard from "@/views/student/StudentDashboard";

export default function StudentDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["student", "super_admin"]}>
      <StudentDashboard />
    </ProtectedRoute>
  );
}
