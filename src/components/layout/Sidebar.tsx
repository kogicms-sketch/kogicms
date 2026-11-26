"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LayoutDashboard,
  Target,
  CreditCard,
  Users,
  ShieldCheck,
  Gift,
  CalendarDays,
  CheckCircle,
  BarChart3,
  MessageSquare,
  Sparkles,
  Bell,
  MapPin,
  Building2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useParty } from "@/contexts/PartyContext";
import { navItems } from "@/config/navigation";

// Dedicated navigation strictly for Polling Unit Field Agents
const puAgentNavItems = [
  {
    label: "PU Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: "Polling Unit Cell",
    icon: Target,
    path: "/polling-units",
  },
  {
    label: "Unit Members",
    icon: Users,
    path: "/members",
  },
  {
    label: "Welfare & Incentives",
    icon: Gift,
    path: "/welfare",
  },
  {
    label: "Notifications",
    icon: Bell,
    path: "/notifications",
  },
];

// Dedicated navigation strictly for Ward / Councillor operations
const wardNavItems = [
  {
    label: "Ward Dashboard",
    icon: LayoutDashboard,
    path: "/councillor/dashboard",
  },
  {
    label: "Ward PU Cells",
    icon: Target,
    path: "/polling-units",
  },
  {
    label: "PU Agents Payment",
    icon: CreditCard,
    path: "/councillor/agents",
  },
  {
    label: "Ward Members",
    icon: Users,
    path: "/members",
  },
  {
    label: "Ward Voter Register",
    icon: ShieldCheck,
    path: "/voters",
  },
  {
    label: "Ward Welfare",
    icon: Gift,
    path: "/welfare",
  },
  {
    label: "Ward Activities",
    icon: CalendarDays,
    path: "/activities",
  },
  {
    label: "Ward Reports",
    icon: BarChart3,
    path: "/reports",
  },
  {
    label: "Ward Chat",
    icon: MessageSquare,
    path: "/chat",
  },
  {
    label: "Notifications",
    icon: Bell,
    path: "/notifications",
  },
];

// Dedicated navigation strictly for Federal Representatives (House of Reps)
const federalRepNavItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/federal/dashboard",
  },
  {
    label: "Support Groups",
    icon: ShieldCheck,
    path: "/support-groups",
  },
  {
    label: "Polling Unit Cells",
    icon: Target,
    path: "/polling-units",
  },
  {
    label: "Members",
    icon: Users,
    path: "/members",
  },
  {
    label: "Welfare & Incentives",
    icon: Gift,
    path: "/welfare",
  },
  {
    label: "Chats",
    icon: MessageSquare,
    path: "/chat",
  },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const { party } = useParty();
  const stripeColors = [
    party.colors.swatches[0],
    party.colors.swatches[1] || "#FFFFFF",
    party.colors.swatches[2] || party.colors.swatches[0],
  ];

  // Resolve role and scope
  const cachedRole = typeof window !== "undefined" ? (localStorage.getItem("auth_role") as any) : null;
  const effectiveRole =
    role ||
    cachedRole ||
    (pathname.startsWith("/chairman")
      ? "lga_chairman"
      : pathname.startsWith("/federal")
      ? "federal_rep"
      : pathname.startsWith("/senatorial")
      ? "senatorial_leader"
      : pathname.startsWith("/councillor")
      ? "councillor"
      : "super_admin");

  const isPUAgent = effectiveRole === "polling_unit_agent" || effectiveRole === "agent" || effectiveRole === "pu_agent";
  const isCouncillor = !isPUAgent && (effectiveRole === "councillor" || pathname.startsWith("/councillor"));
  const isFederalRep = !isPUAgent && !isCouncillor && (effectiveRole === "federal_rep" || pathname.startsWith("/federal"));

  // Active ward name from localStorage cache
  const activeWard =
    typeof window !== "undefined"
      ? localStorage.getItem("councillor_ward") || "Eggan"
      : "Eggan";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    router.push("/");
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar z-50 transition-all duration-300 flex flex-col shadow-2xl ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Party Tricolor Stripe at top */}
      <div className="flex h-1.5 flex-shrink-0">
        <div className="flex-1" style={{ background: stripeColors[0] }} />
        <div className="flex-1" style={{ background: stripeColors[1] }} />
        <div className="flex-1" style={{ background: stripeColors[2] }} />
      </div>

      {/* Logo Section */}
      <div className="p-4 sm:p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 shadow-lg border-2 border-white/30 bg-white/10 flex items-center justify-center">
            <img
              src={party.logo}
              alt={`${party.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <h2 className="text-sm font-bold text-white truncate leading-tight">YMD CMS</h2>
              {isPUAgent ? (
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    PU Field Agent
                  </span>
                </div>
              ) : isCouncillor ? (
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {activeWard} Ward
                  </span>
                </div>
              ) : isFederalRep ? (
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-sky-300 bg-sky-950/90 border border-sky-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    Federal Rep Command
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-white/70 leading-tight">
                  {party.tagline || "Nigeria First"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
        {isPUAgent ? (
          // DEDICATED POLLING UNIT AGENT NAVIGATION
          puAgentNavItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={isActive ? "nav-item-active" : "nav-item"}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })
        ) : isCouncillor ? (
          // DEDICATED WARD NAVIGATION (Strictly for Ward Councillor operations)
          wardNavItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path === "/councillor/dashboard" && pathname === "/dashboard");
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={isActive ? "nav-item-active" : "nav-item"}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })
        ) : isFederalRep ? (
          // DEDICATED FEDERAL REP NAVIGATION (Cleaned up as requested)
          federalRepNavItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={isActive ? "nav-item-active" : "nav-item"}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })
        ) : (
          // Standard Navigation for other roles (Super Admin, LGA Chairman, Senatorial, etc.)
          navItems.map((item) => {
            if (item.roles) {
              if (!effectiveRole || !item.roles.includes(effectiveRole)) {
                return null;
              }
            }

            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={isActive ? "nav-item-active" : "nav-item"}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <Link href="/settings" className="nav-item">
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </Link>
        <button
          className="nav-item w-full text-left"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5 flex-shrink-0" />
          )}
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>

      {/* Party Tricolor Stripe at bottom */}
      <div className="flex h-1 flex-shrink-0">
        <div className="flex-1" style={{ background: stripeColors[0] }} />
        <div className="flex-1" style={{ background: stripeColors[1] }} />
        <div className="flex-1" style={{ background: stripeColors[2] }} />
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border-2 border-brand rounded-full 
                   flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-brand" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-brand" />
        )}
      </button>
    </aside>
  );
};

export default Sidebar;
