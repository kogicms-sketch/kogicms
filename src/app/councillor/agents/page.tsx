"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AgentPaymentRoster } from "@/components/councillor/AgentPaymentRoster";
import { useCouncillor } from "@/hooks/useCouncillors";

export default function CouncillorAgentsPage() {
  const { data: councillor } = useCouncillor();

  return (
    <ProtectedRoute allowedRoles={["super_admin", "lga_chairman", "councillor"]}>
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in p-4 sm:p-6 max-w-7xl mx-auto">
          <AgentPaymentRoster
            lga={councillor?.lga}
            ward={councillor?.ward}
            title="⭐ Polling Unit Agents Payment Roster"
            subtitle="View, sort, and export bank account details for all designated Polling Unit Agents in your ward"
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
