"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { WelfareManager } from "@/components/welfare/WelfareManager";
import { WelfareAuditCenter } from "@/components/welfare/WelfareAuditCenter";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, ShieldCheck } from "lucide-react";

const Welfare = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  return (
    <DashboardLayout
      title="Welfare & Incentives"
      subtitle="Route, disburse, and verify political incentives and welfare interventions"
    >
      {isSuperAdmin ? (
        <Tabs defaultValue="distribution" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted">
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Interventions & Routing
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Aikin Gaskiya Audit Center
            </TabsTrigger>
          </TabsList>
          <TabsContent value="distribution" className="space-y-6">
            <WelfareManager />
          </TabsContent>
          <TabsContent value="audit" className="space-y-6">
            <WelfareAuditCenter />
          </TabsContent>
        </Tabs>
      ) : (
        <WelfareManager />
      )}
    </DashboardLayout>
  );
};

export default Welfare;
