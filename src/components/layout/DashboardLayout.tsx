"use client";
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <main className="transition-all duration-300 pb-28 md:pb-6 md:ml-72 overflow-x-hidden">
        <Header title={title || "YMD CMS Command"} subtitle={subtitle} />
        <div className="p-3 sm:p-5 lg:p-8 pt-safe max-w-full overflow-x-hidden">{children}</div>
      </main>

      {/* Mobile bottom navigation - shown only on mobile */}
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
