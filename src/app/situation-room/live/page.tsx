"use client";

import Component from "@/views/LiveCommandWall";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  );
}
