"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Shield,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { navItems as allNavItems } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useParty } from "@/contexts/PartyContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { getRoleDashboardPath } from "./MobileBottomNav";

interface MobileMenuProps {
  onClose: () => void;
}

const MobileMenu = ({ onClose }: MobileMenuProps) => {
  const { user, role, signOut } = useAuth();
  const { party } = useParty();
  const router = useRouter();
  const navigate = (path: any, options?: any) => { if (path === -1) router.back(); else router.push(path); };
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    navigate("/");
    onClose();
  };

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      return names.map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  };

  const getRoleLabel = () => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "org_admin":
        return "Organization Admin";
      case "lga_chairman":
        return "LGA Chairman";
      case "councillor":
        return "Councillor";
      case "senatorial_leader":
        return "Senatorial Leader";
      case "federal_rep":
        return "Federal Rep";
      case "house_assembly_member":
        return "Assembly Member";
      case "polling_unit_agent":
        return "PU Field Agent";
      case "student":
        return "Student Monitor";
      case "member":
        return "Member";
      default:
        return "User";
    }
  };

  // Get menu sections dynamically
  const permittedItems = allNavItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role as any))
  );

  const dashboardPath = getRoleDashboardPath(role);

  // Dynamic exclusion of items from mobile menu
  const bottomNavPaths = [
    dashboardPath,
    "/dashboard",
    "/members",
    role === "lga_chairman" ? "/chairman/polling-units" : "/polling-units",
    role === "lga_chairman" || role === "councillor" || role === "senatorial_leader" || role === "house_assembly_member" || role === "polling_unit_agent"
      ? "/voters"
      : (role === "federal_rep" ? "/support-groups" : (role === "student" ? "/support-groups" : "/situation-room")),
    // Always hide operations not intended for mobile phone drawer
    "/situation-room",
    "/situation-room/live",
    "/election-day",
  ];

  const menuItems = permittedItems.filter(
    (item) => !bottomNavPaths.includes(item.path)
  );

  // Order groups: Main Menu, Operations, Tools
  const groupOrder = ["Main Menu", "Operations", "Tools"];
  const groups = Array.from(new Set(menuItems.map((item) => item.group)))
    .sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b));

  const menuSections = groups
    .map((groupTitle) => ({
      title: groupTitle,
      items: menuItems.filter((item) => item.group === groupTitle),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col h-full pt-2 mobile-fade-in">
      {/* Handle bar */}
      <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />

      {/* Party / APM Branding Header */}
      <div className="flex items-center gap-3 px-4 pb-4 mb-2 border-b border-border/40">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-border/50 bg-white p-1 flex items-center justify-center shadow-sm">
          <img
            src={party.logo}
            alt={`${party.name} logo`}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground truncate">Kogi State APM</h2>
          <p className="text-xs text-muted-foreground truncate">
            {party.fullName}
          </p>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="flex items-center gap-4 px-4 pb-6 border-b border-border">
        <Avatar className="w-14 h-14 border-2 border-primary">
          <AvatarFallback className="bg-navy-deep text-white text-lg font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{getUserName()}</p>
          <p className="text-sm text-muted-foreground">{getRoleLabel()}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Menu Sections */}
      <div className="flex-1 overflow-y-auto py-2 px-4 space-y-6">
        {menuSections.map((section) => (
          <div key={section.title} className="animate-fade-in">
            <p className="pl-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              {section.title}
            </p>
            <div className="bg-card/50 backdrop-blur-md border border-white/5 shadow-sm rounded-2xl overflow-hidden divide-y divide-border/50">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors tap-target"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-[15px] text-foreground">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div className="p-4 safe-area-bottom mb-4">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-destructive/10 hover:bg-destructive/20 active:scale-[0.98] transition-all tap-target border border-destructive/20 shadow-sm"
        >
          {isLoggingOut ? (
            <Loader2 className="w-5 h-5 animate-spin text-destructive" />
          ) : (
            <LogOut className="w-5 h-5 text-destructive" />
          )}
          <span className="font-semibold text-[15px] text-destructive">Sign Out</span>
        </button>
      </div>

      {/* App Info */}
      <div className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="text-xs">Kogi State APM Campaign v2.0 • Online & Offline</span>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
