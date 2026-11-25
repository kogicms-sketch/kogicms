"use client";
import { usePathname } from "next/navigation";
import Link from 'next/link';
import { Menu, LayoutDashboard, Users, Target, Radio, ShieldCheck, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import MobileMenu from "./MobileMenu";

export const getRoleDashboardPath = (role: string | null | undefined): string => {
  switch (role) {
    case "senatorial_leader":
      return "/senatorial/dashboard";
    case "federal_rep":
      return "/federal/dashboard";
    case "house_assembly_member":
      return "/assembly/dashboard";
    case "lga_chairman":
      return "/chairman/dashboard";
    case "councillor":
      return "/councillor/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/dashboard";
  }
};

const MobileBottomNav = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { role } = useAuth();

  const dashboardPath = getRoleDashboardPath(role);

  // 4 Core primary mobile items strictly tailored to role
  const getBottomNavItems = () => {
    switch (role) {
      case "lga_chairman":
        return [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/chairman/dashboard",
          },
          {
            label: "PU Cells",
            icon: Target,
            path: "/chairman/polling-units",
          },
          {
            label: "Voters",
            icon: ShieldCheck,
            path: "/voters",
          },
          {
            label: "Members",
            icon: Users,
            path: "/members",
          },
        ];
      case "councillor":
        return [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/councillor/dashboard",
          },
          {
            label: "PU Cells",
            icon: Target,
            path: "/polling-units",
          },
          {
            label: "Voters",
            icon: ShieldCheck,
            path: "/voters",
          },
          {
            label: "Members",
            icon: Users,
            path: "/members",
          },
        ];
      case "federal_rep":
        return [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/federal/dashboard",
          },
          {
            label: "Members",
            icon: Users,
            path: "/members",
          },
          {
            label: "PU Cells",
            icon: Target,
            path: "/polling-units",
          },
          {
            label: "Support Groups",
            icon: ShieldCheck,
            path: "/support-groups",
          },
        ];
      case "senatorial_leader":
        return [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/senatorial/dashboard",
          },
          {
            label: "Members",
            icon: Users,
            path: "/members",
          },
          {
            label: "PU Cells",
            icon: Target,
            path: "/polling-units",
          },
          {
            label: "Voters",
            icon: ShieldCheck,
            path: "/voters",
          },
        ];
      case "house_assembly_member":
        return [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/assembly/dashboard",
          },
          {
            label: "Members",
            icon: Users,
            path: "/members",
          },
          {
            label: "PU Cells",
            icon: Target,
            path: "/polling-units",
          },
          {
            label: "Voters",
            icon: ShieldCheck,
            path: "/voters",
          },
        ];
      case "polling_unit_agent":
        return [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
          },
          {
            label: "My PU Cell",
            icon: Target,
            path: "/polling-units",
          },
          {
            label: "Voters",
            icon: ShieldCheck,
            path: "/voters",
          },
          {
            label: "Members",
            icon: Users,
            path: "/members",
          },
        ];
      case "student":
        return [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/student/dashboard",
          },
          {
            label: "Members",
            icon: Users,
            path: "/members",
          },
          {
            label: "Support Groups",
            icon: ShieldCheck,
            path: "/support-groups",
          },
          {
            label: "Welfare",
            icon: Gift,
            path: "/welfare",
          },
        ];
      default:
        return [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
          },
          {
            label: "Members",
            icon: Users,
            path: "/members",
          },
          {
            label: "PU Cells",
            icon: Target,
            path: "/polling-units",
          },
          {
            label: "Voters",
            icon: ShieldCheck,
            path: "/voters",
          },
        ];
    }
  };

  const bottomNavItems = getBottomNavItems();

  // Check if current path is active
  const isActive = (path: string) => {
    if (path === pathname) return true;
    if (path === dashboardPath && (
      pathname === "/dashboard" ||
      pathname === "/senatorial/dashboard" ||
      pathname === "/federal/dashboard" ||
      pathname === "/assembly/dashboard" ||
      pathname === "/chairman/dashboard" ||
      pathname === "/councillor/dashboard" ||
      pathname === "/student/dashboard"
    )) return true;
    return pathname.startsWith(path) && path !== "/dashboard";
  };

  return (
    <nav className="fixed bottom-2 left-2 right-2 z-50 bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.18)] md:hidden mb-[env(safe-area-inset-bottom,0px)] transition-all duration-300">
      <div className="flex items-center justify-around h-15 px-1 py-1">
        {bottomNavItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 h-full py-1.5 flex flex-col items-center justify-center transition-all duration-200 ${
                active 
                  ? "text-primary scale-105" 
                  : "text-muted-foreground hover:text-foreground"
              } tap-target`}
            >
              <div className="relative flex flex-col items-center">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? "text-emerald-600 scale-110" : ""}`} />
                {active && (
                  <span className="absolute -bottom-1.5 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight transition-all duration-200 ${active ? "font-bold text-emerald-700 dark:text-emerald-400" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More menu drawer trigger */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 h-full py-1.5 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 tap-target">
              <div className="relative flex flex-col items-center">
                <Menu className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-1 font-medium tracking-tight">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[88vh] rounded-t-[2rem] p-0 border-t border-border bg-background/98 backdrop-blur-2xl shadow-2xl safe-area-bottom">
            <MobileMenu onClose={() => setIsMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
