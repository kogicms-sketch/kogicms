"use client";
import { useState, useEffect } from "react";
import { Search, Download, Share, Bell, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useParty } from "@/contexts/PartyContext";
import { supabase } from "@/integrations/supabase/loose-client";
import { NotificationToggle } from "@/components/notifications/NotificationToggle";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SyncIndicator } from "./SyncIndicator";
import { useQueryClient } from "@tanstack/react-query";
import { localRepository } from "@/services/LocalRepository";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header = ({ title, subtitle }: HeaderProps) => {
  const { party, partyId } = useParty();
  const { user, role } = useAuth();
  const [userLga, setUserLga] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleForceRefresh = async () => {
    try {
      await localRepository.clearAllCache();
      queryClient.invalidateQueries();
      toast.success("Cache cleared! Pulling fresh data from server...");
    } catch (err) {
      console.error("Error clearing cache:", err);
      toast.error("Failed to clear cache");
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("lga")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.lga) {
          setUserLga(data.lga);
        }
      } catch (err) {
        console.error("Error fetching profile in Header:", err);
      }
    };
    fetchProfile();
  }, [user]);

  const { canInstall, isIOS, install } = usePWAInstall();
  const isMobile = useIsMobile();

  const handleInstall = async () => {
    if (isIOS) {
      toast.info(
        "To install: tap the Share button, then 'Add to Home Screen'",
        { duration: 5000 }
      );
    } else {
      const success = await install();
      if (success) {
        toast.success("App installed successfully!");
      }
    }
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
      case "student":
        return "Student Monitor";
      case "member":
        return "Member";
      default:
        return "User";
    }
  };

  const getUserName = () => {
    const rawName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
    if (partyId === "apc") return rawName;
    return `${userLga || "Kogi State"}`;
  };

  const getInitials = () => {
    const activeName = getUserName();
    const names = activeName.split(" ");
    if (names.length > 0) {
      return names.map((n: string) => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50 safe-area-top">
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Left Section - Title */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 animate-slide-in-left">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-border/40 bg-white p-0.5 flex items-center justify-center md:hidden">
            <img
              src={party.logo}
              alt={`${party.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Force cache refresh button */}
          <button
            onClick={handleForceRefresh}
            className="p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground tap-target"
            title="Force Sync / Refresh Data (Clears local cache)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Sync status indicator */}
          <SyncIndicator />

          {/* Search - Hidden on mobile, shown on tablet+ */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="input-premium pl-10 w-48 xl:w-64 py-2"
            />
          </div>

          {/* Search button for tablet */}
          <button className="p-2 rounded-lg hover:bg-muted transition-colors hidden md:flex lg:hidden tap-target">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Install App Button - Mobile Only */}
          {canInstall && isMobile && (
            <Button
              onClick={handleInstall}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {isIOS ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Install</span>
            </Button>
          )}

          {/* Notifications Toggle */}
          <div className="hidden sm:block">
            <NotificationToggle />
          </div>

          {/* Mobile Notifications Bell */}
          <button className="p-2 rounded-lg hover:bg-muted transition-colors sm:hidden tap-target">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* User Profile - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-3 pl-3 sm:pl-4 border-l border-border">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                {getUserName()}
              </p>
              <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
            </div>
            <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-brand/40 shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={getUserName()} />
              <AvatarFallback className="bg-brand text-brand-foreground font-semibold text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
