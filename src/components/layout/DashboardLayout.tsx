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
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <main className="transition-all duration-300 pb-20 md:pb-0 md:ml-72">
        {title && <Header title={title} subtitle={subtitle} />}
        <div className="p-4 sm:p-6 lg:p-8 pt-safe">{children}</div>
      </main>

      {/* Mobile bottom navigation - shown only on mobile */}
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
