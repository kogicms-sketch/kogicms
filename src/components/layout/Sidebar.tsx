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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useParty } from "@/contexts/PartyContext";
import { navItems } from "@/config/navigation";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const { party } = useParty();
  const stripeColors = [party.colors.swatches[0], party.colors.swatches[1] || "#FFFFFF", party.colors.swatches[2] || party.colors.swatches[0]];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    router.push("/");
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar z-50 transition-all duration-300 flex flex-col shadow-2xl ${collapsed ? "w-20" : "w-72"}`}
    >
      {/* Party Tricolor Stripe at top */}
      <div className="flex h-1.5 flex-shrink-0">
        <div className="flex-1" style={{ background: stripeColors[0] }} />
        <div className="flex-1" style={{ background: stripeColors[1] }} />
        <div className="flex-1" style={{ background: stripeColors[2] }} />
      </div>

      {/* Logo Section */}
      <div className="p-5 border-b border-sidebar-border">
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
              <h2 className="text-sm font-bold text-white truncate leading-tight">Kogi State {party.shortName}</h2>
              <p className="text-[10px] text-white/70 leading-tight">{party.tagline || "Nigeria First"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Profile section intentionally hidden — only LGA-scoped info shown elsewhere */}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-3">
        {navItems.map((item) => {
          // Check role-based visibility
          if (item.roles) {
            if (!role || !item.roles.includes(role)) {
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
        })}
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
