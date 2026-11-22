import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { WelfareManager } from "@/components/welfare/WelfareManager";
import { WelfareAuditCenter } from "@/components/welfare/WelfareAuditCenter";
import { IncomingIncentives } from "@/components/welfare/IncomingIncentives";
import { PuAttendance } from "@/components/welfare/PuAttendance";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, ShieldCheck, ArrowDownCircle, CheckSquare, QrCode } from "lucide-react";

const Welfare = () => {
  const { role } = useAuth();
  const isWardAdmin = role === "councillor";
  const isSuperAdmin = role === "super_admin";

  return (
    <DashboardLayout
      title="Welfare & Incentives"
      subtitle="Route, disburse, and verify political incentives and welfare interventions"
    >
      {isWardAdmin ? (
        <Tabs defaultValue="incoming" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-xl bg-muted">
            <TabsTrigger value="incoming" className="flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4" />
              Incoming Incentives
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              PU Attendance & Distribution
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Handover Portal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="incoming" className="space-y-6">
            <IncomingIncentives />
          </TabsContent>
          
          <TabsContent value="attendance" className="space-y-6">
            <PuAttendance />
          </TabsContent>
          
          <TabsContent value="scan" className="space-y-6">
            <WelfareManager />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="distribution" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted">
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Interventions & Routing
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Integrity & Welfare Audit Center
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="distribution" className="space-y-6">
            <WelfareManager />
          </TabsContent>
          {isSuperAdmin && (
            <TabsContent value="audit" className="space-y-6">
              <WelfareAuditCenter />
            </TabsContent>
          )}
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default Welfare;
