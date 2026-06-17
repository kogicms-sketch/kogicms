"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import KPICard from "@/components/dashboard/KPICard";
import EngagementChart from "@/components/dashboard/EngagementChart";
import RegionalPerformance from "@/components/dashboard/RegionalPerformance";
import RecentActivities from "@/components/dashboard/RecentActivities";
import SupportGroupAdminDashboard from "@/components/dashboard/SupportGroupAdminDashboard";
import {
  Users,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";
import ChairmanDashboard from "./chairman/ChairmanDashboard";
import CouncillorDashboard from "./councillor/CouncillorDashboard";
import SenatorialDashboard from "./senatorial/SenatorialDashboard";
import FederalRepDashboard from "./federal/FederalRepDashboard";
import AssemblyDashboard from "./assembly/AssemblyDashboard";
import PUAgentDashboard from "@/components/dashboard/PUAgentDashboard";
import { APCBanner } from "@/components/branding/APCBanner";
import { useParty } from "@/contexts/PartyContext";

const Dashboard = () => {
  const { role, organizationId, loading: authLoading } = useAuth();
  const { party } = useParty();
  const isSuperAdmin = role === "super_admin";
  const { data: userOrg } = useUserOrganization();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(organizationId);

  // Prevent flicker by showing loader while auth or initial stats are fetching
  if (authLoading) {
    return (
      <DashboardLayout title="Loading..." subtitle="Please wait">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-deep"></div>
        </div>
      </DashboardLayout>
    );
  }

  // 1. Super Admin View
  if (isSuperAdmin) {
    return (
      <DashboardLayout
        title="Central Command"
        subtitle="Global Operations Overview"
      >
        <SuperAdminDashboard />
      </DashboardLayout>
    );
  }

  // 2. LGA Chairman View
  if (role === "lga_chairman") {
    return <ChairmanDashboard />;
  }

  // 3. Councillor View
  if (role === "councillor") {
    return <CouncillorDashboard />;
  }

  // 4. Senatorial Leader View
  if (role === "senatorial_leader") {
    return <SenatorialDashboard />;
  }

  // 5. Federal Representative View
  if (role === "federal_rep") {
    return <FederalRepDashboard />;
  }

  // 6. House of Assembly Member View
  if (role === "house_assembly_member") {
    return <AssemblyDashboard />;
  }

  // 7. Polling Unit Agent View
  if (role === "polling_unit_agent") {
    return (
      <DashboardLayout
        title="Field Operations"
        subtitle="Polling Unit Coordinator Dashboard"
      >
        <PUAgentDashboard />
      </DashboardLayout>
    );
  }

  // 8. Support Group Admin View
  if (role === "org_admin") {
    return <SupportGroupAdminDashboard />;
  }

  // 9. Organization Admin View
  return (
    <DashboardLayout
      title={userOrg?.name || "Dashboard"}
      subtitle="Organization dashboard"
    >
      {/* Party Welcome Banner */}
      <APCBanner
        title={`${party.shortName} Campaign Command`}
        subtitle={`${party.tagline} — ${party.fullName}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 stagger-children">
        <KPICard
          title="My Members"
          value={statsLoading ? "-" : stats?.members.total || 0}
          change={`${stats?.members.active || 0} active`}
          changeType="positive"
          icon={Users}
        />
        <KPICard
          title="My Activities"
          value={statsLoading ? "-" : stats?.activities.total || 0}
          change={`${stats?.activities.ongoing || 0} in progress`}
          changeType="neutral"
          icon={CalendarDays}
        />
        <KPICard
          title="Engagement Rate"
          value={statsLoading ? "-" : `${stats?.engagementRate || 0}%`}
          change={`${stats?.activities.completed || 0} completed activities`}
          changeType="positive"
          icon={TrendingUp}
          variant="danger"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <EngagementChart />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <RegionalPerformance />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <div className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <RecentActivities />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
