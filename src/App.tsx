import { Toaster } from "@/components/ui/toaster";
import { ChatNotifications } from "@/components/chat/ChatNotifications";
import { ActivityNotifications } from "@/components/notifications/ActivityNotifications";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PartyProvider } from "@/contexts/PartyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SplashScreen } from "@/components/SplashScreen";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useState } from "react";
import Login from "./views/Login";
import Dashboard from "./views/Dashboard";
import Members from "./views/Members";
import Activities from "./views/Activities";
import Reports from "./views/Reports";
import MemberProfile from "./views/MemberProfile";
import Attendance from "./views/Attendance";
import Chat from "./views/Chat";
import PostGenerator from "./views/PostGenerator";
import FileManager from "./views/org-admin/FileManager";
import OrganizationAdmins from "./views/super-admin/OrganizationAdmins";
import TargetManagement from "./views/super-admin/TargetManagement";
import SupportGroups from "./views/SupportGroups";
import SupportGroupDetail from "./views/SupportGroupDetail";
import CampaignEvents from "./views/CampaignEvents";
import TalkingPoints from "./views/TalkingPoints";
import PollingUnitCells from "./views/PollingUnitCells";
import PollingUnitDetail from "./views/PollingUnitDetail";
import SituationRoom from "./views/SituationRoom";
import NotFound from "./views/NotFound";
import ChairmanDashboard from "./views/chairman/ChairmanDashboard";
import ChairmanPollingUnits from "./views/chairman/ChairmanPollingUnits";
import ManageCouncillors from "./views/chairman/ManageCouncillors";
import ChairmanSettings from "./views/chairman/ChairmanSettings";
import CouncillorDashboard from "./views/councillor/CouncillorDashboard";
import SenatorialDashboard from "./views/senatorial/SenatorialDashboard";
import FederalRepDashboard from "./views/federal/FederalRepDashboard";
import AssemblyDashboard from "./views/assembly/AssemblyDashboard";
import Settings from "./views/Settings";
import PollingUnitReports from "./views/PollingUnitReports";
import Welfare from "./views/Welfare";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return (
      <PartyProvider>
        <SplashScreen onComplete={handleSplashComplete} />
      </PartyProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PartyProvider>
          <AuthProvider>
            <ChatNotifications />
            <ActivityNotifications />
            <PWAInstallPrompt />
            <Routes>
              <Route path="/" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization-admins"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "lga_chairman"]}>
                    <OrganizationAdmins />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/target-management"
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <TargetManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/members"
                element={
                  <ProtectedRoute>
                    <Members />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/members/detail"
                element={
                  <ProtectedRoute>
                    <MemberProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activities"
                element={
                  <ProtectedRoute>
                    <Activities />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "org_admin", "lga_chairman", "councillor", "senatorial_leader", "federal_rep", "house_assembly_member"]}>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/welfare"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "lga_chairman", "councillor", "senatorial_leader", "federal_rep", "house_assembly_member"]}>
                    <Welfare />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-generator"
                element={
                  <ProtectedRoute>
                    <PostGenerator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/files"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
                    <FileManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support-groups"
                element={
                  <ProtectedRoute>
                    <SupportGroups />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support-groups/detail"
                element={
                  <ProtectedRoute>
                    <SupportGroupDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute>
                    <CampaignEvents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/talking-points"
                element={
                  <ProtectedRoute>
                    <TalkingPoints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/polling-units"
                element={
                  <ProtectedRoute>
                    <PollingUnitCells />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/polling-units/detail"
                element={
                  <ProtectedRoute>
                    <PollingUnitDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/situation-room"
                element={
                  <ProtectedRoute>
                    <SituationRoom />
                  </ProtectedRoute>
                }
              />
              {/* Chairman Routes */}
              <Route
                path="/chairman/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["lga_chairman"]}>
                    <ChairmanDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chairman/polling-units"
                element={
                  <ProtectedRoute allowedRoles={["lga_chairman"]}>
                    <ChairmanPollingUnits />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chairman/councillors"
                element={
                  <ProtectedRoute allowedRoles={["lga_chairman"]}>
                    <ManageCouncillors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chairman/settings"
                element={
                  <ProtectedRoute allowedRoles={["lga_chairman"]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              {/* Councillor Routes */}
              <Route
                path="/councillor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["councillor"]}>
                    <CouncillorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/polling-units-reports"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "lga_chairman", "councillor"]}>
                    <PollingUnitReports />
                  </ProtectedRoute>
                }
              />
              {/* Senatorial Zone Routes */}
              <Route
                path="/senatorial/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["senatorial_leader"]}>
                    <SenatorialDashboard />
                  </ProtectedRoute>
                }
              />
              {/* Federal Constituency Routes */}
              <Route
                path="/federal/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["federal_rep"]}>
                    <FederalRepDashboard />
                  </ProtectedRoute>
                }
              />
              {/* House of Assembly Routes */}
              <Route
                path="/assembly/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["house_assembly_member"]}>
                    <AssemblyDashboard />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
          </PartyProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
